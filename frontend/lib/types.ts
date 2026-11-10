// Types partagés entre pages client et API (sans dépendance à Mongoose).

// Les menus ne sont pas soumis à la gestion de stock
export const CATEGORIES = ["Banh Bao", "Nems", "Samoussa", "Mochis", "Desserts", "Menus"] as const;

// Images disponibles pour les produits (clé simple -> chemin)
export const IMAGES_PRODUITS: Record<string, string> = {
  "Bao au Porc": "/images/produits/bao-porc.webp",
  "Bao au Boeuf": "/images/produits/bao-boeuf.webp",
  "Bao au Poulet": "/images/produits/bao-poulet.webp",
  "Nem au Poulet": "/images/produits/nems-poulet.webp",
  "Nem au Porc": "/images/produits/nems-porc.webp",
  "Nem aux Crevettes": "/images/produits/nems-crevette.webp",
  Samoussa: "/images/produits/samossa.webp",
  "Mochi Mangue": "/images/produits/mochi-mangue.jpg",
  "Mochi Oreo": "/images/produits/mochi-oreo.webp",
  "Mochi Kiwi": "/images/produits/mochi-kiwi.png",
  "Mochi Framboise": "/images/produits/mochi-framboise.webp",
  Cookie: "/images/produits/coockies.jpg",
  Crêpe: "/images/produits/crepes.webp",
  "Menu Mini Cookie": "/images/produits/menu-mini-cookie.webp",
  "Menu Max Cookie": "/images/produits/menu-max-cookie.webp",
  "Menu Mini Mochi": "/images/produits/menu-mini-mochi.webp",
  "Menu Max Mochi": "/images/produits/menu-max-mochi.webp",
  "Menu Asia Cookie": "/images/produits/menu-asia-cookie.webp",
  "Menu Asia Mochi": "/images/produits/menu-asia-mochi.webp",
  "Menu Maxi Bao": "/images/produits/menu-maxi-bao.webp",
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
  jour?: string;
  items: LigneCommande[];
  total: number;
  statut: "en_attente" | "recuperee";
  paye?: boolean;
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
