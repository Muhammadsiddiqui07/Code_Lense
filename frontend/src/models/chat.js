import mongoose, { Schema } from "mongoose";

const chatSchema = new Schema(
  {
    repoId: { type: Schema.Types.ObjectId, ref: "Repo", required: true, index: true },
    messages: [
      {
        role: { type: String, enum: ["user", "assistant"] },
        content: String,
        sources: [{ file: String, start_line: Number }],
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Chat || mongoose.model("Chat", chatSchema);