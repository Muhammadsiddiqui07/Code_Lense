import os, shutil, stat, tempfile, hashlib
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import chromadb
from git import Repo
from groq import Groq

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
RETRIEVAL_TOP_K = max(1, int(os.getenv("RETRIEVAL_TOP_K", "10")))
MAX_CONTEXT_CHARS = max(1, int(os.getenv("MAX_CONTEXT_CHARS", "24000")))
MAX_TREE_PATHS = 400
MAX_TREE_FILE_BYTES = 1_000_000

SYSTEM_PROMPT = (
    "You are CodeLens, an assistant that answers questions about a GitHub repository. "
    "Use only the provided repository file tree and code chunks. If the answer is not "
    "present, say exactly: 'Not found in the retrieved files.' Do not guess. If you must "
    "infer something from the context, label it 'Inference:' on its own line. "
    "Be concise by default: give a short summary first, then necessary details. Always "
    "name the files you relied on. For tech-stack questions, rely on package.json, "
    "requirements.txt, and imports; cover frontend and backend separately when present. "
    "Use plain Markdown only; never output HTML tags. Keep table cells short and use "
    "bullet lists outside tables for multi-line details."
)

chroma = chromadb.PersistentClient(path="./chroma_db")  # default embeddings: all-MiniLM-L6-v2
app = FastAPI(title="CodeLens Python Service")

ALLOWED_EXT = {".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".cs", ".go",
               ".md", ".json", ".html", ".css", ".yml", ".yaml", ".txt"}
SKIP_FILES = {"package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock"}
# Dependencies and generated caches add noise without helping repository questions.
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv"}
MANIFESTS = ["package.json", "requirements.txt", "pyproject.toml", "pom.xml",
             "Dockerfile", "docker-compose.yml", "README.md"]
CHUNK_LINES, OVERLAP = 60, 10


class IngestReq(BaseModel):
    repo_url: str

class QueryReq(BaseModel):
    repo_url: str
    question: str
    top_k: int = RETRIEVAL_TOP_K


def collection_name(repo_url: str) -> str:
    return "repo_" + hashlib.md5(repo_url.encode()).hexdigest()[:12]


def _force_remove(func, path, _):
    os.chmod(path, stat.S_IWRITE)  # Windows: .git files read-only hoti hain
    func(path)


def chunk_file(path: Path, root: Path):
    try:
        lines = path.read_text(encoding="utf-8", errors="ignore").splitlines()
    except Exception:
        return
    step = CHUNK_LINES - OVERLAP
    for start in range(0, max(len(lines), 1), step):
        text = "\n".join(lines[start:start + CHUNK_LINES]).strip()
        if text:
           yield text, {"type": "code",
             "file": str(path.relative_to(root)).replace("\\", "/"),
             "filename": path.name,
             "start_line": start + 1}


def _is_text_file(path: Path) -> bool:
    try:
        if path.stat().st_size > MAX_TREE_FILE_BYTES:
            return False
        # A small sample catches binary assets without reading the whole file.
        with path.open("rb") as file:
            return b"\0" not in file.read(8192)
    except OSError:
        return False


def format_file_tree(paths: list[str], total_files: int) -> str:
    tree = {}
    for path in paths:
        node = tree
        parts = path.split("/")
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = None

    lines = ["."]

    def append_entries(entries, depth: int) -> None:
        for name in sorted(entries):
            child = entries[name]
            if child is None:
                lines.append(f"{'  ' * depth}{name}")
            else:
                lines.append(f"{'  ' * depth}{name}/")
                append_entries(child, depth + 1)

    append_entries(tree, 1)
    if total_files > len(paths):
        lines.append(f"... {total_files - len(paths)} more files")
    return "\n".join(lines)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ingest")
def ingest(req: IngestReq):
    tmp = tempfile.mkdtemp()
    try:
        Repo.clone_from(req.repo_url, tmp, depth=1)
        root = Path(tmp)

        name = collection_name(req.repo_url)
        try:
            chroma.delete_collection(name)  # re-ingest par purana data hata do
        except Exception:
            pass
        col = chroma.create_collection(name)

        docs, metas = [], []
        tree_paths, tree_file_count = [], 0
        for current, dirs, files in os.walk(root):
            dirs[:] = sorted(directory for directory in dirs if directory not in SKIP_DIRS)
            for filename in sorted(files):
                p = Path(current) / filename
                skipped_file = bool(set(p.relative_to(root).parts) & SKIP_FILES)
                if not skipped_file and _is_text_file(p):
                    tree_file_count += 1
                    if len(tree_paths) < MAX_TREE_PATHS:
                        tree_paths.append(p.relative_to(root).as_posix())
                if p.suffix in ALLOWED_EXT and not skipped_file:
                    for text, meta in chunk_file(p, root):
                        docs.append(text); metas.append(meta)

        if not docs:
            raise HTTPException(400, "Koi readable file nahi mili")

        file_tree = format_file_tree(tree_paths, tree_file_count)
        batch_size = chroma.get_max_batch_size()
        for i in range(0, len(docs), batch_size):
            end = min(i + batch_size, len(docs))
            col.add(documents=docs[i:end],
                    metadatas=metas[i:end],
                    ids=[f"c{j}" for j in range(i, end)])

        # Keep the tree independently fetchable so similarity ranking cannot hide it.
        col.add(
            documents=[file_tree],
            metadatas=[{
                "type": "tree",
                "file": "__file_tree__",
                "filename": "__file_tree__",
                "start_line": 0,
            }],
            ids=["tree"],
        )

        return {"collection": name, "chunks": len(docs)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Ingest failed: {e}")
    finally:
        shutil.rmtree(tmp, onerror=_force_remove)


@app.post("/query")
def query(req: QueryReq):
    try:
        col = chroma.get_collection(collection_name(req.repo_url))
    except Exception:
        raise HTTPException(404, "Pehle /ingest chalao is repo ke liye")

    top_k = max(req.top_k, 1)
    # One extra result prevents the tree from reducing the requested code-chunk count.
    res = col.query(query_texts=[req.question], n_results=top_k + 1)
    retrieved_docs, retrieved_metas = res["documents"][0], res["metadatas"][0]

    tree_result = col.get(where={"type": "tree"})
    tree_docs = tree_result.get("documents") or []
    tree_doc = tree_docs[0] if tree_docs else None

    # Manifests stay first because stack and dependency questions depend on them.
    manifest_result = col.get(where={"filename": {"$in": MANIFESTS}}, limit=8)
    seen = set()
    manifest_chunks = []
    for doc, meta in zip(manifest_result["documents"], manifest_result["metadatas"]):
        if meta.get("type") == "tree" or meta.get("file") == "__file_tree__":
            continue
        key = (meta["file"], meta["start_line"])
        if key not in seen:
            seen.add(key)
            manifest_chunks.append((doc, meta))

    retrieved_chunks = []
    for doc, meta in zip(retrieved_docs, retrieved_metas):
        if meta.get("type") == "tree" or meta.get("file") == "__file_tree__":
            continue
        key = (meta["file"], meta["start_line"])
        if key not in seen:
            seen.add(key)
            retrieved_chunks.append((doc, meta))

    context_parts, sources = [], []
    context_chars = 0
    if tree_doc is not None:
        tree_section = f"REPOSITORY FILE TREE\n{tree_doc}"
        tree_section = tree_section[:MAX_CONTEXT_CHARS]
        context_parts.append(tree_section)
        context_chars = len(tree_section)

    for doc, meta in manifest_chunks + retrieved_chunks:
        chunk = f"[{meta['file']}:{meta['start_line']}]\n{doc}"
        separator = "\n\n" if context_parts else ""
        if context_chars + len(separator) + len(chunk) > MAX_CONTEXT_CHARS:
            break
        context_parts.append(chunk)
        context_chars += len(separator) + len(chunk)
        sources.append({"file": meta["file"], "start_line": meta["start_line"]})

    context = "\n\n".join(context_parts)

    completion = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"CONTEXT:\n{context}\n\nQUESTION: {req.question}"},
        ],
        temperature=0.2,
    )

    answer = completion.choices[0].message.content
    return {"answer": answer, "sources": sources}