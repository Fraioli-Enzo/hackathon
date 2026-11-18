import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Commande } from "@/lib/models/Commande";
import { Produit } from "@/lib/models/Produit";
import { getAdminEmail } from "@/lib/auth";
import { getWeekRange } from "@/lib/week";
import { coutAchat, coutComposition, elementsComposition } from "@/lib/couts";

export async function GET(req: NextRequest) {
  const admin = await getAdminEmail(req);
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  try {
    await connectDB();
    const decalage = Number(req.nextUrl.searchParams.get("semaine")) || 0;
    const { start, end } = getWeekRange(new Date(), decalage);
    const commandes = await Commande.find({ createdAt: { $gte: start, $lt: end } }).lean();

    // produitId -> nom, pour coûter les variantes choisies dans les menus
    const produits = await Produit.find({}).select("nom").lean();
    const noms = new Map(produits.map((p) => [String(p._id), p.nom]));

    let ca = 0;
    let cout = 0;
    const parProduit = new Map<string, { nom: string; qte: number; ca: number; cout: number }>();
    const ventes = new Map<string, { nom: string; seul: number; enMenu: number }>();
    const compterVente = (nom: string, qte: number, enMenu: boolean) => {
      const v = ventes.get(nom) ?? { nom, seul: 0, enMenu: 0 };
      if (enMenu) v.enMenu += qte;
      else v.seul += qte;
      ventes.set(nom, v);
    };

    for (const commande of commandes) {
      ca += commande.total;
      for (const item of commande.items) {
        // Les variantes stockent déjà le total consommé pour la ligne (qte menus incluse)
        const resolvables = Boolean(item.variantes?.length) && item.variantes!.every((v) => noms.has(String(v.produitId)));
        const elements = elementsComposition(item.nom);
        const estMenu = Boolean(item.variantes?.length) || elements.length > 0;

        // Composition du nom : par menu (ancien format) ou totale (un choix par instance).
        // Les quantités des variantes servent à distinguer les deux.
        const nomSum = elements.reduce((s, e) => s + e.qte, 0);
        const varSum = item.variantes?.reduce((s, v) => s + v.qte, 0) ?? 0;
        const facteurNom = item.variantes?.length ? (varSum === nomSum ? 1 : item.qte) : item.qte;

        const coutLigne = resolvables
          ? item.variantes!.reduce((s, v) => s + coutAchat(noms.get(String(v.produitId))!) * v.qte, 0)
          : coutComposition(item.nom) * facteurNom;
        cout += coutLigne;

        const ligne = parProduit.get(item.nom) ?? { nom: item.nom, qte: 0, ca: 0, cout: 0 };
        ligne.qte += item.qte;
        ligne.ca += item.prix * item.qte;
        ligne.cout += coutLigne;
        parProduit.set(item.nom, ligne);

        // Ventes en menu ou seul, pour les produits de base
        if (!estMenu) {
          compterVente(item.nom, item.qte, false);
        } else if (resolvables) {
          for (const v of item.variantes!) compterVente(noms.get(String(v.produitId))!, v.qte, true);
        } else {
          for (const el of elements) compterVente(el.nom, el.qte * facteurNom, true);
        }
      }
    }

    const arrondi = (n: number) => Math.round(n * 100) / 100;
    const produitsTries = Array.from(parProduit.values())
      .map((p) => ({ ...p, ca: arrondi(p.ca), cout: arrondi(p.cout), marge: arrondi(p.ca - p.cout) }))
      .sort((a, b) => b.marge - a.marge);

    const ventesTriees = Array.from(ventes.values())
      .sort((a, b) => b.seul + b.enMenu - (a.seul + a.enMenu));

    return NextResponse.json({
      debut: start.toISOString(),
      fin: end.toISOString(),
      nbCommandes: commandes.length,
      ca: arrondi(ca),
      cout: arrondi(cout),
      benefice: arrondi(ca - cout),
      produits: produitsTries,
      ventes: ventesTriees,
    });
  } catch (e) {
    console.error("GET /api/admin/stats", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
