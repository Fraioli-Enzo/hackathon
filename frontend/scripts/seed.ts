import { config } from "dotenv";
config({ path: ".env.local" });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Admin } from "../lib/models/Admin";
import { Produit } from "../lib/models/Produit";

// Produits issus de la feuille « Prix » de Trésorerie - Hackathon.xlsx
// Images : fichiers présents dans frontend/public/images/
const PRODUITS_INITIAUX = [
  { nom: "Banh Bao", prix: 3.0, description: "Brioche vapeur garnie de porc et oeuf.", actif: true, stock: 50, image: "/images/bao.webp" },
  { nom: "Cookie", prix: 1.2, description: "Cookie maison au chocolat.", actif: true, stock: 50, image: "/images/coockies.jpg" },
  { nom: "Crêpe", prix: 1.0, description: "Crêpe faite maison.", actif: true, stock: 50, image: "/images/crepes.jpg" },
  { nom: "Mochi", prix: 2.5, description: "Bouchée de riz gluant fourrée.", actif: true, stock: 50, image: "/images/mochi.webp" },
  { nom: "Nem", prix: 1.6, description: "Rouleau de printemps frit au poulet.", actif: true, stock: 50, image: "/images/nems.webp" },
  { nom: "Samoussa", prix: 2.0, description: "Triangle croustillant farci à la viande épicée.", actif: true, stock: 50, image: "/images/samossa.jpg" },
  { nom: "3 crêpes", prix: 2.0, description: "3 crêpes.", actif: true, stock: 50, image: "/images/crepes.jpg" },
  { nom: "Menu Asia Cookie", prix: 5.8, description: "1 Bao + 2 Nem + 1 Cookie", actif: true, stock: 50, image: "/images/coockies.jpg" },
  { nom: "Menu Asia Mochi", prix: 6.4, description: "1 Bao + 2 Nem + 1 Mochi", actif: true, stock: 50, image: "/images/mochi.webp" },
  { nom: "Menu Maxi Bao", prix: 6.5, description: "3 Bao", actif: true, stock: 50, image: "/images/bao.webp" },
  { nom: "Menu Maxi Cookie", prix: 5.8, description: "2 Bao + 1 Cookie", actif: true, stock: 50, image: "/images/bao.webp" },
  { nom: "Menu Maxi Mochi", prix: 6.6, description: "2 Bao + 1 Mochi", actif: true, stock: 50, image: "/images/bao.webp" },
  { nom: "Menu Mini Cookie", prix: 3.3, description: "1 Bao + 1 Cookie", actif: true, stock: 50, image: "/images/coockies.jpg" },
  { nom: "Menu Mini Mochi", prix: 4.3, description: "1 Bao + 1 Mochi", actif: true, stock: 50, image: "/images/mochi.webp" },
];

// Anciens noms du seed initial à renommer en place (les commandes gardent
// leur snapshot mais leur produitId reste valide)
const RENOMMAGES: Array<[ancien: string, nouveau: string]> = [
  ["Banh bao", "Banh Bao"],
  ["Nems", "Nem"],
  ["Mochis", "Mochi"],
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

  for (const [ancien, nouveau] of RENOMMAGES) {
    if (!(await Produit.exists({ nom: ancien }))) continue;
    if (await Produit.exists({ nom: nouveau })) {
      await Produit.deleteOne({ nom: ancien });
    } else {
      await Produit.updateOne({ nom: ancien }, { nom: nouveau });
    }
    console.log(`Renommé « ${ancien} » en « ${nouveau} »`);
  }

  for (const p of PRODUITS_INITIAUX) {
    await Produit.findOneAndUpdate({ nom: p.nom }, p, { upsert: true });
  }
  console.log("Produits initialisés :", PRODUITS_INITIAUX.length, "produits");

  await mongoose.disconnect();
  console.log("Seed terminé.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
