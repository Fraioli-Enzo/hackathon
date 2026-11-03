// Types partagés entre pages client et API (sans dépendance à Mongoose).

// Les menus ne sont pas soumis à la gestion de stock
export const CATEGORIES = ["Banh Bao", "Nems", "Samoussa", "Mochis", "Desserts", "Menus"] as const;

export type CompositionItem = {
  categorie?: string;
  nomProduit?: string;
  qte: number;
};

export type ProduitClient = {
  _id: string;
  nom: string;
  prix: number;
  description?: string;
  actif?: boolean;
  stock?: number;
  image?: string;
  categorie?: string;
  composition?: CompositionItem[];
};

export type LigneCommande = {
  nom: string;
  prix: number;
  qte: number;
};

export type CommandeClient = {
  _id: string;
  prenom: string;
  nom: string;
  batiment: string;
  items: LigneCommande[];
  total: number;
  statut: "en_attente" | "recuperee";
  createdAt: string;
};

export type Recap = {
  debut: string;
  fin: string;
  nbCommandes: number;
  ca: number;
  enAttente: number;
  recuperees: number;
  stockRestant: { nom: string; stock: number; image?: string }[];
};
