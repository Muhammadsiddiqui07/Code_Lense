import { connectDB } from "@/lib/db";
import Chat from "@/models/chat";

export async function GET(_request, { params }) {
  const { repoId } = await params;
  await connectDB();

  const chat = await Chat.findOne({ repoId }).select("messages -_id").lean();
  return Response.json(chat?.messages ?? []);
}