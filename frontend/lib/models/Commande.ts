import mongoose, { Schema } from "mongoose";

export interface IVarianteConsomee {
  produitId: mongoose.Types.ObjectId;
  qte: number;
}

export interface ILigneCommande {
  produitId: mongoose.Types.ObjectId;
  nom: string;
  prix: number;
  qte: number;
  // Variantes de base consommées par un menu (pour rendre le stock à la suppression)
  variantes?: IVarianteConsomee[];
}

export interface ICommande {
  prenom: string;
  nom: string;
  batiment: "Orion" | "Antares";
  jour: "Lundi" | "Mardi" | "Mercredi" | "Jeudi" | "Vendredi";
  items: ILigneCommande[];
  total: number;
  statut: "en_attente" | "recuperee";
  paye: boolean;
  createdAt: Date;
}

const CommandeSchema = new Schema<ICommande>({
  prenom: { type: String, required: true, trim: true },
  nom: { type: String, required: true, trim: true },
  batiment: { type: String, required: true, enum: ["Orion", "Antares"] },
  jour: { type: String, required: true, enum: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"] },
  items: [
    {
      produitId: { type: Schema.Types.ObjectId, required: true },
      nom: { type: String, required: true },
      prix: { type: Number, required: true, min: 0 },
      qte: { type: Number, required: true, min: 1 },
      variantes: [
        {
          produitId: { type: Schema.Types.ObjectId, required: true },
          qte: { type: Number, required: true, min: 1 },
        },
      ],
    },
  ],
  total: { type: Number, required: true, min: 0 },
  statut: { type: String, enum: ["en_attente", "recuperee"], default: "en_attente" },
  paye: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const Commande =
  (mongoose.models.Commande as mongoose.Model<ICommande>) ||
  mongoose.model<ICommande>("Commande", CommandeSchema);
