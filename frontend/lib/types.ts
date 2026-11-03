// Types partagés entre pages client et API (sans dépendance à Mongoose).

export type ProduitClient = {
  _id: string;
  nom: string;
  prix: number;
  description?: string;
  actif?: boolean;
  stock?: number;
  image?: string;
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
  email: string;
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
  produits: { nom: string; qte: number; total: number }[];
  stockRestant: { nom: string; stock: number; image?: string }[];
};
