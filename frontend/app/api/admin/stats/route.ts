import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/auth";
import { statsSemaine } from "@/lib/stats";

// La logique d'agrégation (CA, coût, bénéfice, ventes) vit dans lib/stats.ts,
// partagée avec le serveur MCP : une seule source de vérité.
export async function GET(req: NextRequest) {
  const admin = await getAdminEmail(req);
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  try {
    const decalage = Number(req.nextUrl.searchParams.get("semaine")) || 0;
    return NextResponse.json(await statsSemaine(decalage));
  } catch (e) {
    console.error("GET /api/admin/stats", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
