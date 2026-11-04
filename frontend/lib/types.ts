// Types partagés entre pages client et API (sans dépendance à Mongoose).

// Les menus ne sont pas soumis à la gestion de stock
export const CATEGORIES = ["Banh Bao", "Nems", "Samoussa", "Mochis", "Desserts", "Menus"] as const;

// Images disponibles pour les produits (clé simple -> chemin)
export const IMAGES_PRODUITS: Record<string, string> = {
  "Bao au Porc": "/images/bao-porc.webp",
  "Bao au Boeuf": "/images/bao-boeuf.webp",
  "Bao au Poulet": "/images/bao-poulet.webp",
  "Nem au Poulet": "/images/nems-poulet.webp",
  "Nem au Porc": "/images/nems-porc.webp",
  "Nem aux Crevettes": "/images/nems-crevette.webp",
  Samoussa: "/images/samossa.webp",
  "Mochi Mangue": "/images/mochi-mangue.jpg",
  "Mochi Oreo": "/images/mochi-oreo.webp",
  "Mochi Kiwi": "/images/mochi-kiwi.png",
  "Mochi Framboise": "/images/mochi-framboise.webp",
  Cookie: "/images/coockies.jpg",
  Crêpe: "/images/crepes.webp",
  "Menu Mini Cookie": "/images/menu-mini-cookie.webp",
  "Menu Max Cookie": "/images/menu-max-cookie.webp",
  "Menu Mini Mochi": "/images/menu-mini-mochi.webp",
  "Menu Max Mochi": "/images/menu-max-mochi.webp",
  "Menu Asia Cookie": "/images/menu-asia-cookie.webp",
  "Menu Asia Mochi": "/images/menu-asia-mochi.webp",
  "Menu Maxi Bao": "/images/menu-maxi-bao.webp",
};

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
  variantes?: { produitId: string; qte: number }[];
};

export type CommandeClient = {
  _id: string;
  prenom: string;
  nom: string;
  batiment: string;
  jour: string;
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
