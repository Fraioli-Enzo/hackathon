import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Commande } from "@/lib/models/Commande";
import { getAdminEmail } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const admin = await getAdminEmail(req);
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  try {
    const body = await req.json();
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!mongoose.Types.ObjectId.isValid(code)) {
      return NextResponse.json({ error: "QR code invalide." }, { status: 400 });
    }

    await connectDB();
    const commande = await Commande.findById(code).lean();
    if (!commande) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    if (commande.statut === "recuperee") {
      return NextResponse.json({ commande, dejaRecuperee: true });
    }

    const miseAJour = await Commande.findByIdAndUpdate(code, { statut: "recuperee", paye: true }, { new: true }).lean();
    return NextResponse.json({ commande: miseAJour, dejaRecuperee: false });
  } catch (e) {
    console.error("POST /api/admin/scan", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
