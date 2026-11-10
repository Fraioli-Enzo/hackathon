import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Commande } from "@/lib/models/Commande";
import { Produit } from "@/lib/models/Produit";
import { getAdminEmail } from "@/lib/auth";

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  const admin = await getAdminEmail(req);
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  try {
    const { statut, paye } = await req.json();
    const maj: { statut?: string; paye?: boolean } = {};
    if (statut === "en_attente" || statut === "recuperee") {
      maj.statut = statut;
      // Marquer récupérée = commande payée et retirée sur place
      if (statut === "recuperee") maj.paye = true;
    }
    if (typeof paye === "boolean") maj.paye = paye;
    if (Object.keys(maj).length === 0) {
      return NextResponse.json({ error: "Rien à mettre à jour." }, { status: 400 });
    }
    await connectDB();
    const commande = await Commande.findByIdAndUpdate(params.id, maj, { new: true }).lean();
    if (!commande) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }
    return NextResponse.json({ commande });
  } catch (e) {
    console.error("PATCH /api/commandes/[id]", e);
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
    const commande = await Commande.findById(params.id).lean();
    if (!commande) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }
    // Une commande en attente libère son stock ; une commande déjà récupérée
    // a été physiquement consommée, on ne rend pas le stock
    if (commande.statut !== "recuperee") {
      for (const item of commande.items) {
        if (item.variantes?.length) {
          for (const v of item.variantes) {
            await Produit.updateOne({ _id: v.produitId }, { $inc: { stock: v.qte } });
          }
        } else {
          // produits simples ; les anciennes lignes de menu sans variantes ne
          // portent pas assez d'information pour rendre les bons produits
          await Produit.updateOne({ _id: item.produitId, categorie: { $ne: "Menus" } }, { $inc: { stock: item.qte } });
        }
      }
    }
    await Commande.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/commandes/[id]", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
