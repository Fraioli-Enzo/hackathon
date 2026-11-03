import mongoose, { Schema } from "mongoose";

export interface ICompositionItem {
  categorie?: string; // choix parmi les produits actifs de cette catégorie
  nomProduit?: string; // produit fixe (ex. Cookie)
  qte: number;
}

export interface IProduit {
  nom: string;
  prix: number;
  description: string;
  actif: boolean;
  stock: number;
  image: string;
  categorie: string;
  composition: ICompositionItem[];
}

const CompositionSchema = new Schema<ICompositionItem>(
  {
    categorie: { type: String, trim: true },
    nomProduit: { type: String, trim: true },
    qte: { type: Number, default: 1, min: 1 },
  },
  { _id: false }
);

const ProduitSchema = new Schema<IProduit>({
  nom: { type: String, required: true, trim: true },
  prix: { type: Number, required: true, min: 0 },
  description: { type: String, default: "", trim: true },
  actif: { type: Boolean, default: true },
  stock: { type: Number, default: 0, min: 0 },
  image: { type: String, default: "", trim: true },
  categorie: { type: String, default: "", trim: true },
  composition: { type: [CompositionSchema], default: [] },
});

export const Produit =
  (mongoose.models.Produit as mongoose.Model<IProduit>) || mongoose.model<IProduit>("Produit", ProduitSchema);
