import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Produit } from "@/lib/models/Produit";
import { getAdminEmail } from "@/lib/auth";

type Params = { params: { id: string } };

export async function PUT(req: NextRequest, { params }: Params) {
  const admin = await getAdminEmail(req);
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { nom, prix, description, actif, stock, image } = body ?? {};

    const maj: Record<string, unknown> = {};
    if (nom !== undefined) {
      if (typeof nom !== "string" || !nom.trim()) {
        return NextResponse.json({ error: "Nom du produit requis." }, { status: 400 });
      }
      maj.nom = nom.trim();
    }
    if (prix !== undefined) {
      if (typeof prix !== "number" || !Number.isFinite(prix) || prix <= 0) {
        return NextResponse.json({ error: "Prix invalide." }, { status: 400 });
      }
      maj.prix = Math.round(prix * 100) / 100;
    }
    if (description !== undefined) {
      if (typeof description !== "string") {
        return NextResponse.json({ error: "Description invalide." }, { status: 400 });
      }
      maj.description = description.trim();
    }
    if (actif !== undefined) {
      if (typeof actif !== "boolean") {
        return NextResponse.json({ error: "Statut actif invalide." }, { status: 400 });
      }
      maj.actif = actif;
    }
    if (stock !== undefined) {
      if (!Number.isInteger(stock) || stock < 0) {
        return NextResponse.json({ error: "Stock invalide (entier positif)." }, { status: 400 });
      }
      maj.stock = stock;
    }
    if (image !== undefined) {
      if (typeof image !== "string") {
        return NextResponse.json({ error: "Image invalide." }, { status: 400 });
      }
      maj.image = image.trim();
    }

    await connectDB();
    const produit = await Produit.findByIdAndUpdate(params.id, maj, { new: true }).lean();
    if (!produit) {
      return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    }
    return NextResponse.json({ produit });
  } catch (e) {
    console.error("PUT /api/produits/[id]", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const admin = await getAdminEmail(req);
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  try {
    await connectDB();
    const produit = await Produit.findByIdAndDelete(params.id).lean();
    if (!produit) {
      return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/produits/[id]", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
