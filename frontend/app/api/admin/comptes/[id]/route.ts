import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Admin } from "@/lib/models/Admin";
import { getAdminEmail } from "@/lib/auth";

type Params = { params: { id: string } };

export async function DELETE(req: NextRequest, { params }: Params) {
  const admin = await getAdminEmail(req);
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  try {
    await connectDB();
    const cible = await Admin.findById(params.id).lean();
    if (!cible) {
      return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
    }
    const principal = (process.env.ADMIN_EMAIL || "admin@cesi.fr").toLowerCase();
    if (cible.email === principal) {
      return NextResponse.json({ error: "Le compte admin principal ne peut pas être supprimé." }, { status: 403 });
    }
    if (cible.email === admin) {
      return NextResponse.json({ error: "Tu ne peux pas supprimer ton propre compte." }, { status: 403 });
    }
    await Admin.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/comptes/[id]", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
