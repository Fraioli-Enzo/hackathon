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
  { nom: "Bao au Porc", prix: 3.0, description: "Porc, oeuf.", actif: true, stock: 50, image: "/images/bao.webp", categorie: "Banh Bao" },
  { nom: "Bao au Boeuf", prix: 3.0, description: "Champignons de Paris, oignons, fromage (emmental + mozzarella).", actif: true, stock: 50, image: "/images/bao.webp", categorie: "Banh Bao" },
  { nom: "Bao au Poulet", prix: 3.0, description: "Carottes, oignons, maïs, fromage (emmental + mozzarella).", actif: true, stock: 50, image: "/images/bao.webp", categorie: "Banh Bao" },
  // Nems
  { nom: "Nem au Poulet", prix: 1.6, description: "Taros, champignons noirs, carottes, vermicelles.", actif: true, stock: 50, image: "/images/nems.webp", categorie: "Nems" },
  { nom: "Nem au Porc", prix: 1.6, description: "Taros, oignons, vermicelles, carottes, champignons noirs.", actif: true, stock: 50, image: "/images/nems.webp", categorie: "Nems" },
  { nom: "Nem aux Crevettes", prix: 1.6, description: "Châtaignes, carottes, échalotes.", actif: true, stock: 50, image: "/images/nems.webp", categorie: "Nems" },
  // Samoussa
  { nom: "Samoussa", prix: 2.0, description: "Boeuf, petits pois, oignons, carottes.", actif: true, stock: 50, image: "/images/samossa.jpg", categorie: "Samoussa" },
  // Desserts
  { nom: "Mochi", prix: 2.5, description: "Saveurs : mangue, oreo, kiwi, framboise.", actif: true, stock: 50, image: "/images/mochi.webp", categorie: "Desserts" },
  { nom: "Crêpe", prix: 1.0, description: "Nutella, confiture ou pâte à tartiner Bueno.", actif: true, stock: 50, image: "/images/crepes.jpg", categorie: "Desserts" },
  { nom: "Cookie", prix: 1.2, description: "Cookie du Resto U.", actif: true, stock: 50, image: "/images/coockies.jpg", categorie: "Desserts" },
  // Menus
  { nom: "Menu Mini Cookie", prix: 3.3, description: "1 Bao + 1 Cookie", actif: true, stock: 0, image: "/images/coockies.jpg", categorie: "Menus",
    composition: [{ categorie: "Banh Bao", qte: 1 }, { nomProduit: "Cookie", qte: 1 }] },
  { nom: "Menu Max Cookie", prix: 5.8, description: "2 Bao + 1 Cookie", actif: true, stock: 0, image: "/images/coockies.jpg", categorie: "Menus",
    composition: [{ categorie: "Banh Bao", qte: 2 }, { nomProduit: "Cookie", qte: 1 }] },
  { nom: "Menu Mini Mochi", prix: 4.3, description: "1 Bao + 1 Mochi", actif: true, stock: 0, image: "/images/mochi.webp", categorie: "Menus",
    composition: [{ categorie: "Banh Bao", qte: 1 }, { nomProduit: "Mochi", qte: 1 }] },
  { nom: "Menu Max Mochi", prix: 6.6, description: "2 Bao + 1 Mochi", actif: true, stock: 0, image: "/images/mochi.webp", categorie: "Menus",
    composition: [{ categorie: "Banh Bao", qte: 2 }, { nomProduit: "Mochi", qte: 1 }] },
  { nom: "Menu Asia Cookie", prix: 5.8, description: "1 Bao + 2 Nems + 1 Cookie", actif: true, stock: 0, image: "/images/coockies.jpg", categorie: "Menus",
    composition: [{ categorie: "Banh Bao", qte: 1 }, { categorie: "Nems", qte: 2 }, { nomProduit: "Cookie", qte: 1 }] },
  { nom: "Menu Asia Mochi", prix: 6.4, description: "1 Bao + 2 Nems + 1 Mochi", actif: true, stock: 0, image: "/images/mochi.webp", categorie: "Menus",
    composition: [{ categorie: "Banh Bao", qte: 1 }, { categorie: "Nems", qte: 2 }, { nomProduit: "Mochi", qte: 1 }] },
  { nom: "Menu Maxi Bao", prix: 6.5, description: "3 Bao", actif: true, stock: 0, image: "/images/bao.webp", categorie: "Menus",
    composition: [{ categorie: "Banh Bao", qte: 3 }] },
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
