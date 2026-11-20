// Données admin de la cafet (commandes, CA, coût, bénéfice, stocks),
// partagées entre les routes /api/admin/* et le serveur MCP.
// Le calcul du coût d'achat réutilise lib/couts.ts : une seule source de vérité.
import { connectDB } from "@/lib/db";
import { Commande } from "@/lib/models/Commande";
import { Produit } from "@/lib/models/Produit";
import { getWeekRange } from "@/lib/week";
import { coutAchat, coutComposition, elementsComposition } from "@/lib/couts";

type LigneDB = {
  nom: string;
  prix: number;
  qte: number;
  variantes?: { produitId: unknown; qte: number }[];
};

type CommandeDB = {
  total: number;
  statut: string;
  jour: string;
  createdAt: Date | string;
  items: LigneDB[];
};

const arrondi = (n: number) => Math.round(n * 100) / 100;
const SEMAINE_MS = 7 * 24 * 60 * 60 * 1000;

// produitId -> nom, pour coûter les variantes choisies dans les menus
async function nomsProduits(): Promise<Map<string, string>> {
  const produits = await Produit.find({}).select("nom").lean();
  return new Map(produits.map((p) => [String(p._id), p.nom]));
}

function agregerCommandes(commandes: CommandeDB[], noms: Map<string, string>) {
  let ca = 0;
  let cout = 0;
  let enAttente = 0;
  let recuperees = 0;
  const parJour = new Map<string, { jour: string; nbCommandes: number; ca: number }>();
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
    if (commande.statut === "recuperee") recuperees++;
    else enAttente++;
    const j = parJour.get(commande.jour) ?? { jour: commande.jour, nbCommandes: 0, ca: 0 };
    j.nbCommandes += 1;
    j.ca += commande.total;
    parJour.set(commande.jour, j);

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
  return { ca, cout, enAttente, recuperees, parJour, parProduit, ventes };
}

// Stats d'une semaine cafet (décalage 0 = en cours, -1 = précédente, etc.)
export async function statsSemaine(decalage = 0) {
  await connectDB();
  const { start, end } = getWeekRange(new Date(), decalage);
  const commandes = (await Commande.find({ createdAt: { $gte: start, $lt: end } }).lean()) as unknown as CommandeDB[];
  const agg = agregerCommandes(commandes, await nomsProduits());

  const produits = Array.from(agg.parProduit.values())
    .map((p) => ({ ...p, ca: arrondi(p.ca), cout: arrondi(p.cout), marge: arrondi(p.ca - p.cout) }))
    .sort((a, b) => b.marge - a.marge);
  const ventes = Array.from(agg.ventes.values()).sort((a, b) => b.seul + b.enMenu - (a.seul + a.enMenu));

  return {
    debut: start.toISOString(),
    fin: end.toISOString(),
    nbCommandes: commandes.length,
    ca: arrondi(agg.ca),
    cout: arrondi(agg.cout),
    benefice: arrondi(agg.ca - agg.cout),
    enAttente: agg.enAttente,
    recuperees: agg.recuperees,
    parJour: Array.from(agg.parJour.values()).map((j) => ({ ...j, ca: arrondi(j.ca) })),
    produits,
    ventes,
  };
}

// Évolution semaine par semaine (pour graphiques "ventes par semaine").
// ponytail: une seule requête sur toute la période, regroupement en JS par semaine (start est un lundi 00h00).
export async function statsSemaines(nbSemaines = 8) {
  await connectDB();
  const nb = Math.min(Math.max(Math.trunc(nbSemaines) || 8, 1), 26);
  const { start } = getWeekRange(new Date(), -(nb - 1));
  const commandes = (await Commande.find({ createdAt: { $gte: start } }).lean()) as unknown as CommandeDB[];
  const noms = await nomsProduits();

  const parSemaine = new Map<number, CommandeDB[]>();
  for (const c of commandes) {
    const idx = Math.floor((new Date(c.createdAt).getTime() - start.getTime()) / SEMAINE_MS);
    const arr = parSemaine.get(idx) ?? [];
    arr.push(c);
    parSemaine.set(idx, arr);
  }

  const semaines = Array.from({ length: nb }, (_, i) => {
    const agg = agregerCommandes(parSemaine.get(i) ?? [], noms);
    return {
      debut: new Date(start.getTime() + i * SEMAINE_MS).toISOString(),
      nbCommandes: (parSemaine.get(i) ?? []).length,
      ca: arrondi(agg.ca),
      cout: arrondi(agg.cout),
      benefice: arrondi(agg.ca - agg.cout),
    };
  });

  // Évolution en % vs la semaine précédente (null pour la première, ou si la semaine d'avant est à 0)
  const pct = (cur: number, prev?: number) => (prev && prev > 0 ? arrondi(((cur - prev) / prev) * 100) : null);
  return {
    semaines: semaines.map((s, i) => {
      const p = i > 0 ? semaines[i - 1] : undefined;
      return {
        ...s,
        vsPrecedente: p
          ? { caPct: pct(s.ca, p.ca), beneficePct: pct(s.benefice, p.benefice), nbCommandesPct: pct(s.nbCommandes, p.nbCommandes) }
          : null,
      };
    }),
  };
}

// Top clients par dépenses. Sans 'decalage' : depuis toujours ; avec : une seule semaine cafet.
export async function topClients(args: { decalage?: number; limite?: number }) {
  await connectDB();
  const query: Record<string, unknown> = {};
  let periode: { debut: string; fin: string } | null = null;
  if (typeof args.decalage === "number") {
    const { start, end } = getWeekRange(new Date(), args.decalage);
    query.createdAt = { $gte: start, $lt: end };
    periode = { debut: start.toISOString(), fin: end.toISOString() };
  }
  const limite = Math.min(Math.max(Math.trunc(args.limite ?? 10), 1), 100);
  const commandes = (await Commande.find(query)
    .select("prenom nom total createdAt")
    .lean()) as unknown as { prenom: string; nom: string; total: number; createdAt: Date | string }[];

  const clients = new Map<string, { client: string; nbCommandes: number; total: number; derniereCommande: string }>();
  for (const c of commandes) {
    const affiché = `${c.prenom} ${c.nom}`.trim().replace(/\s+/g, " ");
    // ponytail: regroupement insensible à la casse (clé en minuscules), affichage tel quel
    const key = affiché.toLowerCase();
    const e = clients.get(key) ?? { client: affiché, nbCommandes: 0, total: 0, derniereCommande: "" };
    e.nbCommandes += 1;
    e.total += c.total;
    const d = new Date(c.createdAt).toISOString();
    if (d > e.derniereCommande) e.derniereCommande = d;
    clients.set(key, e);
  }

  return {
    ...(periode ?? {}),
    nbClients: clients.size,
    top: Array.from(clients.values())
      .map((c) => ({ ...c, total: arrondi(c.total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limite),
  };
}

// Commandes d'une semaine, pour que l'admin voie ce qu'il reste à préparer/valider.
export async function commandesSemaine(args: { decalage?: number; statut?: string; jour?: string; limite?: number }) {
  await connectDB();
  const { start, end } = getWeekRange(new Date(), args.decalage ?? 0);
  const query: Record<string, unknown> = { createdAt: { $gte: start, $lt: end } };
  if (args.statut === "en_attente" || args.statut === "recuperee") query.statut = args.statut;
  if (args.jour) query.jour = args.jour;
  const limite = Math.min(Math.max(Math.trunc(args.limite ?? 100), 1), 500);

  const trouvees = (await Commande.find(query)
    .sort({ statut: 1, createdAt: -1 })
    .limit(limite + 1)
    .lean()) as unknown as (CommandeDB & { _id: unknown; prenom: string; nom: string; batiment: string; paye: boolean })[];

  return {
    debut: start.toISOString(),
    fin: end.toISOString(),
    hasMore: trouvees.length > limite,
    commandes: trouvees.slice(0, limite).map((c) => ({
      id: String(c._id),
      prenom: c.prenom,
      nom: c.nom,
      batiment: c.batiment,
      jour: c.jour,
      statut: c.statut,
      paye: c.paye,
      total: c.total,
      createdAt: new Date(c.createdAt).toISOString(),
      items: c.items.map((i) => ({ nom: i.nom, qte: i.qte, prix: i.prix })),
    })),
  };
}

// Stocks restants des produits de base (les menus n'ont pas de stock), triés du plus faible au plus haut.
export async function stocksRestants(args: { seuil?: number } = {}) {
  await connectDB();
  const query: Record<string, unknown> = { actif: true, categorie: { $ne: "Menus" } };
  if (typeof args.seuil === "number") query.stock = { $lte: args.seuil };
  const produits = (await Produit.find(query)
    .select("nom stock prix categorie")
    .sort({ stock: 1, nom: 1 })
    .lean()) as unknown as { _id: unknown; nom: string; stock: number; prix: number; categorie: string }[];
  return {
    produits: produits.map((p) => ({ id: String(p._id), nom: p.nom, categorie: p.categorie, prix: p.prix, stock: p.stock })),
  };
}
