import mongoose, { Schema } from "mongoose";

// Photo importée par un admin : stockée en base (le conteneur de prod est recréé à
// chaque déploiement, on ne peut pas écrire dans public/).
export interface IImageUpload {
  data: Buffer;
  contentType: string;
}

const ImageUploadSchema = new Schema<IImageUpload>(
  {
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true },
  },
  { timestamps: true }
);

export const ImageUpload =
  (mongoose.models.ImageUpload as mongoose.Model<IImageUpload>) ||
  mongoose.model<IImageUpload>("ImageUpload", ImageUploadSchema);
