import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Commande } from "@/lib/models/Commande";
import { Produit } from "@/lib/models/Produit";
import { getAdminEmail } from "@/lib/auth";
import { getWeekRange } from "@/lib/week";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prenom, nom, email, batiment, items } = body ?? {};

    if (typeof prenom !== "string" || !prenom.trim() || typeof nom !== "string" || !nom.trim()) {
      return NextResponse.json({ error: "Prénom et nom requis." }, { status: 400 });
    }
    if (typeof email !== "string" || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
    }
    if (batiment !== "Orion" && batiment !== "Antares") {
      return NextResponse.json({ error: "Bâtiment invalide (Orion ou Antares)." }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Au moins un produit est requis." }, { status: 400 });
    }
    for (const item of items) {
      if (!item?.produitId || !Number.isInteger(item.qte) || item.qte < 1 || item.qte > 50) {
        return NextResponse.json({ error: "Quantités invalides (1 à 50 par produit)." }, { status: 400 });
      }
    }

    await connectDB();
    const produits = await Produit.find({ _id: { $in: items.map((i: { produitId: string }) => i.produitId) }, actif: true }).lean();
    const parId = new Map(produits.map((p) => [String(p._id), p]));

    const lignes = [];
    for (const item of items) {
      const produit = parId.get(String(item.produitId));
      if (!produit) {
        return NextResponse.json({ error: "Un des produits commandés n'est plus disponible." }, { status: 404 });
      }
      lignes.push({ produitId: produit._id, nom: produit.nom, prix: produit.prix, qte: item.qte });
    }

    const total = Math.round(lignes.reduce((somme, l) => somme + l.prix * l.qte, 0) * 100) / 100;

    const commande = await Commande.create({
      prenom: prenom.trim(),
      nom: nom.trim(),
      email: email.trim().toLowerCase(),
      batiment,
      items: lignes,
      total,
    });

    return NextResponse.json({ commande }, { status: 201 });
  } catch (e) {
    console.error("POST /api/commandes", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const admin = await getAdminEmail(req);
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  try {
    await connectDB();
    const url = new URL(req.url);
    const { start, end } = getWeekRange();
    const filter: { createdAt: { $gte: Date; $lt: Date }; email?: string } = {
      createdAt: { $gte: start, $lt: end },
    };
    const email = url.searchParams.get("email");
    if (email) filter.email = email.trim().toLowerCase();

    const commandes = await Commande.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ commandes });
  } catch (e) {
    console.error("GET /api/commandes", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
