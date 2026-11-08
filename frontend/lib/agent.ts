import { connectDB } from "@/lib/db";
import { Produit } from "@/lib/models/Produit";
import type { CATEGORIES } from "@/lib/types";

// Instructions système de l'agent (modèle : Mistral Large 4).
export const AGENT_INSTRUCTIONS = `Tu es l'assistant IA de la Cafet CESI, la cafétéria de l'école. Tu réponds à des élèves (tutoiement, ton sympa et direct, réponses courtes, emojis avec parcimonie).

Règles :
- Produits, prix, stocks, compositions : utilise toujours les outils (lister_produits, detail_produit). N'invente jamais un prix, un stock ou un produit.
- Les menus ne sont pas soumis au stock ; les produits de base oui. Un stock de 0 veut dire rupture.
- Pour passer commande, il te faut : prénom, nom, bâtiment (Orion ou Antares), jour de retrait (Lundi ou Mardi) et les produits avec quantités. Demande les infos manquantes une par une, pas toutes d'un coup.
- Fais confirmer le récapitulatif complet (produits, quantités, total, nom, bâtiment, jour) par l'utilisateur AVANT d'appeler creer_commande. Jamais de commande sans confirmation explicite.
- Pour un menu avec des choix de variantes, utilise detail_produit pour voir les options et demande à l'utilisateur ce qu'il veut. Le paramètre "choix" contient, pour chaque composant du menu, la liste des ids des variantes choisies (vide si pas de choix).
- Si creer_commande renvoie une erreur, explique-la simplement à l'utilisateur (ex : stock insuffisant, choix manquant).
- Le paiement se fait sur place au moment du retrait (espèces ou carte) : jamais en ligne.
- Prix en euros, avec 2 décimales.
- Écris en texte brut, sans markdown (pas de **gras**, pas de caractères spéciaux de formatage) : l'interface affiche du texte simple.
- Si l'utilisateur demande autre chose que la cafet, ramène gentiment au sujet.`;

type ItemChoix = { categorie?: string; nomProduit?: string; qte: number };

export const AGENT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "lister_produits",
      description:
        "Liste les produits actifs de la cafet avec id, nom, prix, stock, catégorie, description et composition des menus. À appeler pour toute question sur le catalogue ou les stocks.",
      parameters: {
        type: "object",
        properties: {
          categorie: {
            type: "string",
            description: "Catégorie optionnelle pour filtrer (Banh Bao, Nems, Samoussa, Mochis, Desserts, Menus).",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "detail_produit",
      description:
        "Détail d'un produit par son id : description, stock, composition du menu et options disponibles pour chaque composant à choix (avec leur id). À appeler avant de faire choisir les variantes d'un menu.",
      parameters: {
        type: "object",
        properties: {
          produitId: { type: "string", description: "L'id du produit." },
        },
        required: ["produitId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "creer_commande",
      description:
        "Crée une commande après confirmation explicite de l'utilisateur. Renvoie la commande avec son id et le total, ou une erreur expliquable.",
      parameters: {
        type: "object",
        properties: {
          prenom: { type: "string" },
          nom: { type: "string" },
          batiment: { type: "string", description: "Orion ou Antares" },
          jour: { type: "string", description: "Jour de retrait : Lundi ou Mardi" },
          items: {
            type: "array",
            description: "Produits commandés.",
            items: {
              type: "object",
              properties: {
                produitId: { type: "string" },
                qte: { type: "number", description: "Quantité entre 1 et 50." },
                choix: {
                  type: "array",
                  description:
                    "Pour les menus uniquement : un tableau par composant du menu, contenant les ids des variantes choisies (tableau vide si pas de choix).",
                  items: { type: "array", items: { type: "string" } },
                },
              },
              required: ["produitId", "qte"],
            },
          },
        },
        required: ["prenom", "nom", "batiment", "jour", "items"],
      },
    },
  },
];

type ProduitDB = {
  _id: unknown;
  nom: string;
  prix: number;
  description?: string;
  actif?: boolean;
  stock?: number;
  categorie?: (typeof CATEGORIES)[number];
  composition?: ItemChoix[];
};

// Résumé d'un produit pour le contexte de l'agent (pas d'image ni de champs inutiles).
function decrireProduit(p: ProduitDB) {
  return {
    id: String(p._id),
    nom: p.nom,
    prix: p.prix,
    categorie: p.categorie,
    ...(p.categorie !== "Menus" ? { stock: p.stock ?? 0 } : {}),
    ...(p.description ? { description: p.description } : {}),
    ...(p.composition?.length
      ? {
          composition: p.composition.map((c) => ({
            ...(c.categorie ? { categorie: c.categorie, choixRequis: true } : {}),
            ...(c.nomProduit ? { produit: c.nomProduit } : {}),
            qte: c.qte,
          })),
        }
      : {}),
  };
}

async function listerProduits(args: { categorie?: string }) {
  await connectDB();
  const query = args.categorie ? { actif: true, categorie: args.categorie } : { actif: true };
  const produits = (await Produit.find(query).sort({ nom: 1 }).lean()) as unknown as ProduitDB[];
  return { produits: produits.map(decrireProduit) };
}

async function detailProduit(args: { produitId: string }) {
  await connectDB();
  const produit = (await Produit.findById(args.produitId).lean()) as unknown as ProduitDB | null;
  if (!produit || produit.actif === false) return { erreur: "Produit introuvable ou plus disponible." };

  const base = decrireProduit(produit);
  // Options disponibles pour chaque composant de menu à choix (ex. les types de nems)
  if (produit.composition?.length) {
    const categories = Array.from(new Set(produit.composition.map((c) => c.categorie).filter((c): c is string => Boolean(c))));
    const variantes = (await Produit.find({ actif: true, categorie: { $in: categories } })
      .sort({ nom: 1 })
      .lean()) as unknown as ProduitDB[];
    return { produit: base, options: variantes.map((v) => decrireProduit(v)) };
  }
  return { produit: base };
}

async function creerCommande(args: Record<string, unknown>, origin: string) {
  // Réutilise la route existante : toute la validation, le stock et les menus restent au même endroit.
  const res = await fetch(`${origin}/api/commandes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { erreur: (data as { error?: string }).error ?? "Impossible de créer la commande." };
  return { commande: (data as { commande: unknown }).commande, succes: true };
}

export async function executerOutil(nom: string, args: Record<string, unknown>, origin: string) {
  try {
    if (nom === "lister_produits") return await listerProduits(args as { categorie?: string });
    if (nom === "detail_produit") return await detailProduit(args as { produitId: string });
    if (nom === "creer_commande") return await creerCommande(args, origin);
    return { erreur: `Outil inconnu : ${nom}` };
  } catch (e) {
    console.error("outil agent", nom, e);
    return { erreur: "Erreur lors de l'exécution de l'outil." };
  }
}
