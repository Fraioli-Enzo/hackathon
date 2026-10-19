import { config } from "dotenv";
config({ path: ".env.local" });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Admin } from "../lib/models/Admin";
import { Produit } from "../lib/models/Produit";

const PRODUITS_INITIAUX = [
  { nom: "Banh bao", prix: 2.5, description: "Brioche vapeur garnie de porc et oeuf.", actif: true },
  { nom: "Nems", prix: 1.5, description: "Rouleaux de printemps frits au poulet.", actif: true },
  { nom: "Mochis", prix: 2.0, description: "Bouchées de riz gluant fourrées.", actif: true },
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

  for (const p of PRODUITS_INITIAUX) {
    await Produit.findOneAndUpdate({ nom: p.nom }, p, { upsert: true });
  }
  console.log("Produits initialisés :", PRODUITS_INITIAUX.map((p) => p.nom).join(", "));

  await mongoose.disconnect();
  console.log("Seed terminé.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
