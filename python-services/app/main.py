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

chroma = chromadb.PersistentClient(path="./chroma_db")  # default embeddings: all-MiniLM-L6-v2
app = FastAPI(title="CodeLens Python Service")

ALLOWED_EXT = {".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".cs", ".go",
               ".md", ".json", ".html", ".css", ".yml", ".yaml", ".txt"}
SKIP_FILES = {"package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock"}
MANIFESTS = ["package.json", "requirements.txt", "pyproject.toml", "pom.xml",
             "Dockerfile", "docker-compose.yml", "README.md"]
CHUNK_LINES, OVERLAP = 60, 10


class IngestReq(BaseModel):
    repo_url: str

class QueryReq(BaseModel):
    repo_url: str
    question: str
    top_k: int = 5


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
           yield text, {"file": str(path.relative_to(root)).replace("\\", "/"),
             "filename": path.name,
             "start_line": start + 1}


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
        for p in root.rglob("*"):
            if p.is_file() and p.suffix in ALLOWED_EXT \
               and not (set(p.relative_to(root).parts) & SKIP_FILES):
                for text, meta in chunk_file(p, root):
                    docs.append(text); metas.append(meta)

        if not docs:
            raise HTTPException(400, "Koi readable file nahi mili")

        for i in range(0, len(docs), 100):  # batches mein add
            col.add(documents=docs[i:i+100],
                    metadatas=metas[i:i+100],
                    ids=[f"c{j}" for j in range(i, min(i+100, len(docs)))])

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

    res = col.query(query_texts=[req.question], n_results=max(req.top_k, 8))
    docs, metas = res["documents"][0], res["metadatas"][0]

   # manifest files ke chunks bhi hamesha context mein (tech stack, dependencies wale sawalon ke liye)
    extra = col.get(where={"filename": {"$in": MANIFESTS}}, limit=8)
    seen = {(m["file"], m["start_line"]) for m in metas}
    for d, m in zip(extra["documents"], extra["metadatas"]):
        if (m["file"], m["start_line"]) not in seen:
            docs.append(d); metas.append(m)

    context = "\n\n".join(
        f"[{m['file']}:{m['start_line']}]\n{d}" for d, m in zip(docs, metas)
    )

    system_prompt = (
        "You are CodeLens, an assistant that answers questions about a GitHub repository. "
        "Use ONLY the provided code context. Mention file names. "
        "For tech stack questions, rely on package.json / requirements.txt and imports, "
        "and cover both frontend and backend if present. "
        "If something is not in the context, say so."
    )

    completion = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"CONTEXT:\n{context}\n\nQUESTION: {req.question}"},
        ],
        temperature=0.2,
    )

    answer = completion.choices[0].message.content
    return {"answer": answer,
            "sources": [{"file": m["file"], "start_line": m["start_line"]} for m in metas]}