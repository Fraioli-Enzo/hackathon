import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Commande } from "@/lib/models/Commande";
import { getAdminEmail } from "@/lib/auth";

type Params = { params: { id: string } };

export async function DELETE(req: NextRequest, { params }: Params) {
  const admin = await getAdminEmail(req);
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  try {
    await connectDB();
    const commande = await Commande.findByIdAndDelete(params.id).lean();
    if (!commande) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/commandes/[id]", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
