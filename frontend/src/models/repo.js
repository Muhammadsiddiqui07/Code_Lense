import mongoose, { Schema } from "mongoose";

const repoSchema = new Schema(
  {
    url: { type: String, required: true, unique: true },
    name: String,
    status: { type: String, enum: ["ingesting", "ready", "failed"], default: "ingesting" },
    chunks: Number,
    error: String,
  },
  { timestamps: true }
);

export default mongoose.models.Repo || mongoose.model("Repo", repoSchema);