import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Commande } from "@/lib/models/Commande";
import { Produit } from "@/lib/models/Produit";
import { getAdminEmail } from "@/lib/auth";
import { getWeekRange } from "@/lib/week";

export async function GET(req: NextRequest) {
  const admin = await getAdminEmail(req);
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  try {
    await connectDB();
    const { start, end } = getWeekRange();
    const commandes = await Commande.find({ createdAt: { $gte: start, $lt: end } }).lean();

    let ca = 0;
    let enAttente = 0;
    let recuperees = 0;

    for (const commande of commandes) {
      ca += commande.total;
      if (commande.statut === "recuperee") recuperees++;
      else enAttente++;
    }

    // Stock suivi uniquement sur les produits de base (pas les menus)
    const stockRestant = await Produit.find({ actif: true, categorie: { $ne: "Menus" } })
      .select("nom stock image")
      .sort({ stock: 1, nom: 1 })
      .lean();

    return NextResponse.json({
      debut: start.toISOString(),
      fin: end.toISOString(),
      nbCommandes: commandes.length,
      ca: Math.round(ca * 100) / 100,
      enAttente,
      recuperees,
      stockRestant,
    });
  } catch (e) {
    console.error("GET /api/admin/recap", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
