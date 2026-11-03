import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Produit } from "@/lib/models/Produit";
import { getAdminEmail } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const admin = await getAdminEmail(req);
    const tous = admin && new URL(req.url).searchParams.get("all") === "1";
    const produits = await Produit.find(tous ? {} : { actif: true }).sort({ nom: 1 }).lean();
    return NextResponse.json({ produits });
  } catch (e) {
    console.error("GET /api/produits", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await getAdminEmail(req);
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { nom, prix, description, actif, stock } = body ?? {};
    if (typeof nom !== "string" || !nom.trim()) {
      return NextResponse.json({ error: "Nom du produit requis." }, { status: 400 });
    }
    if (typeof prix !== "number" || !Number.isFinite(prix) || prix <= 0) {
      return NextResponse.json({ error: "Prix invalide." }, { status: 400 });
    }
    if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) {
      return NextResponse.json({ error: "Stock invalide (entier positif)." }, { status: 400 });
    }
    await connectDB();
    const produit = await Produit.create({
      nom: nom.trim(),
      prix: Math.round(prix * 100) / 100,
      description: typeof description === "string" ? description.trim() : "",
      actif: actif !== false,
      stock: typeof stock === "number" ? stock : 0,
    });
    return NextResponse.json({ produit }, { status: 201 });
  } catch (e) {
    console.error("POST /api/produits", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
