import mongoose, { Schema } from "mongoose";

export interface IProduit {
  nom: string;
  prix: number;
  description: string;
  actif: boolean;
  stock: number;
}

const ProduitSchema = new Schema<IProduit>({
  nom: { type: String, required: true, trim: true },
  prix: { type: Number, required: true, min: 0 },
  description: { type: String, default: "", trim: true },
  actif: { type: Boolean, default: true },
  stock: { type: Number, default: 0, min: 0 },
});

export const Produit =
  (mongoose.models.Produit as mongoose.Model<IProduit>) || mongoose.model<IProduit>("Produit", ProduitSchema);
