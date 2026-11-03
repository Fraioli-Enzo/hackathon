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
    // Produits commandés + variantes choisies dans les menus
    const idsItems = items.flatMap((i: { produitId: string; choix?: string[][] }) => [
      i.produitId,
      ...(Array.isArray(i.choix) ? (i.choix as unknown[]).flat().filter((c) => typeof c === "string" && c) : []),
    ]);
    const produits = await Produit.find({ _id: { $in: idsItems }, actif: true }).lean();
    const parId = new Map(produits.map((p) => [String(p._id), p]));

    // Fusion des quantités par produit (au cas où un produit apparait plusieurs fois)
    const qtes = new Map<string, number>();
    const lignes = [];
    for (const item of items) {
      const produit = parId.get(String(item.produitId));
      if (!produit) {
        return NextResponse.json({ error: "Un des produits commandés n'est plus disponible." }, { status: 404 });
      }

      let nom = produit.nom;

      // Menu : résolution des choix de variantes + impact stock des produits de base
      if (produit.categorie === "Menus" && produit.composition?.length) {
        const detail: string[] = [];
        for (let i = 0; i < produit.composition.length; i++) {
          const c = produit.composition[i];
          if (c.categorie) {
            // Un choix par unité du composant (ex. 2 nems = 2 types possibles)
            const ids = Array.isArray(item.choix?.[i]) ? item.choix[i] : [];
            if (ids.length !== c.qte) {
              return NextResponse.json(
                { error: `Choisis le type de chaque ${c.categorie.toLowerCase()} pour « ${produit.nom} ».` },
                { status: 400 }
              );
            }
            const noms = new Map<string, number>();
            for (const id of ids) {
              const variante = parId.get(String(id));
              if (!variante || variante.categorie !== c.categorie || variante.actif === false) {
                return NextResponse.json(
                  { error: `Choix invalide pour « ${produit.nom} » (type de ${c.categorie.toLowerCase()}).` },
                  { status: 400 }
                );
              }
              qtes.set(String(variante._id), (qtes.get(String(variante._id)) || 0) + item.qte);
              noms.set(variante.nom, (noms.get(variante.nom) || 0) + 1);
            }
            for (const [nom, q] of Array.from(noms.entries())) {
              detail.push(`${nom}${q > 1 ? ` ×${q}` : ""}`);
            }
          } else if (c.nomProduit) {
            detail.push(`${c.nomProduit}${c.qte > 1 ? ` ×${c.qte}` : ""}`);
          }
        }
        if (detail.length) nom = `${produit.nom} (${detail.join(" + ")})`;
      } else if (produit.categorie !== "Menus") {
        // Stock géré uniquement sur les produits de base
        qtes.set(String(produit._id), (qtes.get(String(produit._id)) || 0) + item.qte);
      }

      lignes.push({ produitId: produit._id, nom, prix: produit.prix, qte: item.qte });
    }

    // Décrément du stock, avec remise en état si un produit manque
    const decrements = new Map<string, number>();
    for (const [id, qte] of Array.from(qtes.entries())) {
      const res = await Produit.updateOne({ _id: id, stock: { $gte: qte } }, { $inc: { stock: -qte } });
      if (res.matchedCount === 0) {
        for (const [idR, qteR] of Array.from(decrements.entries())) {
          await Produit.updateOne({ _id: idR }, { $inc: { stock: qteR } });
        }
        const produit = parId.get(id);
        return NextResponse.json(
          { error: `Stock insuffisant pour « ${produit?.nom} » (${produit?.stock} restant).` },
          { status: 409 }
        );
      }
      decrements.set(id, qte);
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
