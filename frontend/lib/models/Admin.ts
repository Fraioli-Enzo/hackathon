import mongoose, { Schema } from "mongoose";

export interface IAdmin {
  email: string;
  passwordHash: string;
}

const AdminSchema = new Schema<IAdmin>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
});

export const Admin =
  (mongoose.models.Admin as mongoose.Model<IAdmin>) || mongoose.model<IAdmin>("Admin", AdminSchema);
