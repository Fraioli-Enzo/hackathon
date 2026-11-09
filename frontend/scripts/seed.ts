import { config } from "dotenv";
config({ path: ".env.local" });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Admin } from "../lib/models/Admin";
import { Produit } from "../lib/models/Produit";

// Catalogue du stand cafet. Les menus (categorie "Menus") ne sont pas
// soumis à la gestion de stock : le stock suit les produits de base.
const PRODUITS_INITIAUX = [
  // Banh Bao
  { nom: "Bao au Porc", prix: 3.0, description: "Porc, oeuf.", actif: true, stock: 50, image: "/images/produits/bao-porc.webp", categorie: "Banh Bao" },
  { nom: "Bao au Boeuf", prix: 3.0, description: "Champignons de Paris, oignons, fromage (emmental + mozzarella).", actif: true, stock: 50, image: "/images/produits/bao-boeuf.webp", categorie: "Banh Bao" },
  { nom: "Bao au Poulet", prix: 3.0, description: "Carottes, oignons, maïs, fromage (emmental + mozzarella).", actif: true, stock: 50, image: "/images/produits/bao-poulet.webp", categorie: "Banh Bao" },
  // Nems
  { nom: "Nem au Poulet", prix: 1.6, description: "Taros, champignons noirs, carottes, vermicelles.", actif: true, stock: 50, image: "/images/produits/nems-poulet.webp", categorie: "Nems" },
  { nom: "Nem au Porc", prix: 1.6, description: "Taros, oignons, vermicelles, carottes, champignons noirs.", actif: true, stock: 50, image: "/images/produits/nems-porc.webp", categorie: "Nems" },
  { nom: "Nem aux Crevettes", prix: 1.6, description: "Châtaignes, carottes, échalotes.", actif: true, stock: 50, image: "/images/produits/nems-crevette.webp", categorie: "Nems" },
  // Samoussa
  { nom: "Samoussa", prix: 2.0, description: "Boeuf, petits pois, oignons, carottes.", actif: true, stock: 50, image: "/images/produits/samossa.webp", categorie: "Samoussa" },
  // Mochis (une saveur par produit, comme les bao et nems)
  { nom: "Mochi Mangue", prix: 2.5, description: "Saveur mangue.", actif: true, stock: 50, image: "/images/produits/mochi-mangue.jpg", categorie: "Mochis" },
  { nom: "Mochi Oreo", prix: 2.5, description: "Saveur oreo.", actif: true, stock: 50, image: "/images/produits/mochi-oreo.webp", categorie: "Mochis" },
  { nom: "Mochi Kiwi", prix: 2.5, description: "Saveur kiwi.", actif: true, stock: 50, image: "/images/produits/mochi-kiwi.png", categorie: "Mochis" },
  { nom: "Mochi Framboise", prix: 2.5, description: "Saveur framboise.", actif: true, stock: 50, image: "/images/produits/mochi-framboise.webp", categorie: "Mochis" },
  // Desserts
  { nom: "Crêpe", prix: 1.0, description: "Nutella, confiture ou pâte à tartiner Bueno.", actif: true, stock: 50, image: "/images/produits/crepes.webp", categorie: "Desserts" },
  { nom: "Cookie", prix: 1.2, description: "Cookie du Resto U.", actif: true, stock: 50, image: "/images/produits/coockies.jpg", categorie: "Desserts" },
  // Menus
  { nom: "Menu Mini Cookie", prix: 4.0, description: "1 Bao + 1 Cookie", actif: true, stock: 0, image: "/images/produits/menu-mini-cookie.webp", categorie: "Menus",
    composition: [{ categorie: "Banh Bao", qte: 1 }, { nomProduit: "Cookie", qte: 1 }] },
  { nom: "Menu Max Cookie", prix: 6.0, description: "2 Bao + 1 Cookie", actif: true, stock: 0, image: "/images/produits/menu-max-cookie.webp", categorie: "Menus",
    composition: [{ categorie: "Banh Bao", qte: 2 }, { nomProduit: "Cookie", qte: 1 }] },
  { nom: "Menu Mini Mochi", prix: 5.0, description: "1 Bao + 1 Mochi", actif: true, stock: 0, image: "/images/produits/menu-mini-mochi.webp", categorie: "Menus",
    composition: [{ categorie: "Banh Bao", qte: 1 }, { categorie: "Mochis", qte: 1 }] },
  { nom: "Menu Max Mochi", prix: 7.0, description: "2 Bao + 1 Mochi", actif: true, stock: 0, image: "/images/produits/menu-max-mochi.webp", categorie: "Menus",
    composition: [{ categorie: "Banh Bao", qte: 2 }, { categorie: "Mochis", qte: 1 }] },
  { nom: "Menu Asia Cookie", prix: 6.0, description: "1 Bao + 2 Nems + 1 Cookie", actif: true, stock: 0, image: "/images/produits/menu-asia-cookie.webp", categorie: "Menus",
    composition: [{ categorie: "Banh Bao", qte: 1 }, { categorie: "Nems", qte: 2 }, { nomProduit: "Cookie", qte: 1 }] },
  { nom: "Menu Asia Mochi", prix: 7.0, description: "1 Bao + 2 Nems + 1 Mochi", actif: true, stock: 0, image: "/images/produits/menu-asia-mochi.webp", categorie: "Menus",
    composition: [{ categorie: "Banh Bao", qte: 1 }, { categorie: "Nems", qte: 2 }, { categorie: "Mochis", qte: 1 }] },
  { nom: "Menu Maxi Bao", prix: 7.5, description: "3 Bao", actif: true, stock: 0, image: "/images/produits/menu-maxi-bao.webp", categorie: "Menus",
    composition: [{ categorie: "Banh Bao", qte: 3 }] },
  // Pas d'image pour ces deux menus : choisir/importer une photo depuis l'admin
  { nom: "Menu Maxi Bao Cookie", prix: 8.0, description: "3 Bao + 1 Cookie", actif: true, stock: 0, image: "", categorie: "Menus",
    composition: [{ categorie: "Banh Bao", qte: 3 }, { nomProduit: "Cookie", qte: 1 }] },
  { nom: "Menu Maxi Bao Mochi", prix: 9.0, description: "3 Bao + 1 Mochi", actif: true, stock: 0, image: "", categorie: "Menus",
    composition: [{ categorie: "Banh Bao", qte: 3 }, { categorie: "Mochis", qte: 1 }] },
];

async function main() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/cafet";
  await mongoose.connect(uri);
  console.log(`Connecté à MongoDB (${uri})`);

  const email = (process.env.ADMIN_EMAIL || "admin@cesi.fr").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "cafet2026";
  const passwordHash = await bcrypt.hash(password, 10);
  await Admin.findOneAndUpdate({ email }, { email, passwordHash }, { upsert: true });
  console.log(`Admin prêt : ${email}`);

  // Le catalogue remplace intégralement l'existant (noms/variantes modifiés)
  await Produit.deleteMany({});
  await Produit.insertMany(PRODUITS_INITIAUX);
  console.log("Catalogue initialisé :", PRODUITS_INITIAUX.length, "produits");

  await mongoose.disconnect();
  console.log("Seed terminé.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
