import mongoose from "mongoose";
import { envRequise } from "./env";

type MongooseCache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

const globalWithMongoose = global as unknown as { _mongoose?: MongooseCache };
const cached: MongooseCache = (globalWithMongoose._mongoose ??= { conn: null, promise: null });

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(envRequise("MONGODB_URI"));
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
