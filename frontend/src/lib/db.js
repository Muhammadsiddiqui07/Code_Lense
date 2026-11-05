import mongoose from "mongoose";

const cached = global._mongoose || (global._mongoose = { conn: null, promise: null });

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing in .env.local");
  cached.promise ||= mongoose.connect(process.env.MONGO_URI);
  cached.conn = await cached.promise;
  return cached.conn;
}