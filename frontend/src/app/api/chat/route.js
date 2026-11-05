import { connectDB } from "@/lib/db";
import { python } from "@/lib/python";
import Repo from "@/models/repo";
import Chat from "@/models/chat";

export async function POST(req) {
  const { repoId, question } = await req.json();
  if (!repoId || !question?.trim()) {
    return Response.json({ error: "repoId and question are required" }, { status: 400 });
  }

  await connectDB();
  let repo;
  try {
    repo = await Repo.findById(repoId);
  } catch {}
  if (!repo) return Response.json({ error: "Repo not found" }, { status: 404 });
  if (repo.status !== "ready") {
    return Response.json({ error: `Repo is currently ${repo.status}` }, { status: 409 });
  }

  try {
    const { data } = await python.post("/query", { repo_url: repo.url, question });

    await Chat.findOneAndUpdate(
      { repoId },
      {
        $push: {
          messages: {
            $each: [
              { role: "user", content: question },
              { role: "assistant", content: data.answer, sources: data.sources },
            ],
          },
        },
      },
      { upsert: true }
    );

    return Response.json(data);
  } catch (err) {
    return Response.json(
      { error: err.response?.data?.detail || "Python service error" },
      { status: 502 }
    );
  }
}