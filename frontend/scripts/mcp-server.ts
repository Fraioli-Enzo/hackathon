// Serveur MCP : expose les produits de la cafet à un client MCP.
// Il réutilise les mêmes requêtes que l'agent du chat (listerProduits, detailProduit)
// pour que stocks et disponibilités soient toujours cohérents entre les deux.
// - lancé tel quel (npm run mcp) : transport stdio (ex. Claude Desktop, Cursor, Vibe via config.toml)
// - importé par app/api/mcp/route.ts : transport HTTP (le lancement stdio ne tourne pas)
import { config } from "dotenv";
config({ path: ".env.local" }); // inoffensif côté Next (ne remplace pas les vars existantes)

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { listerProduits, detailProduit, detailProduits } from "../lib/agent";
import { statsSemaine, statsSemaines, commandesSemaine, stocksRestants, topClients } from "../lib/stats";

// Tous les tools sont en lecture seule (readOnlyHint) : aucun ne modifie la base.
const LECTURE = { readOnlyHint: true } as const;

export function creerServeurMcp() {
  const server = new McpServer({ name: "cafet-produits", version: "1.1.0" });
  const reponse = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

  server.tool(
    "lister_produits",
    "Liste les produits actifs de la cafet avec id, nom, prix, stock et catégorie. Un stock de 0 veut dire rupture ; les menus n'ont pas de stock.",
    { categorie: z.string().optional().describe("Filtre optionnel : Banh Bao, Nems, Samoussa, Mochis, Desserts, Menus.") },
    LECTURE,
    async ({ categorie }) => reponse(await listerProduits({ categorie }))
  );

  server.tool(
    "detail_produit",
    "Détail d'un produit par son id : prix, stock, description, composition et options disponibles si menu.",
    { produitId: z.string().describe("L'id du produit.") },
    LECTURE,
    async ({ produitId }) => reponse(await detailProduit({ produitId }))
  );

  server.tool(
    "detail_produits",
    "Détail de plusieurs produits en UN seul appel (jusqu'à 20 ids) : prix, stock, description, composition et options de menu. Toujours préférer cet outil à detail_produit quand il faut plusieurs produits.",
    { produitIds: z.array(z.string().describe("Id du produit (ObjectId 24 caractères hex).")).max(20).describe("Les ids des produits, max 20.") },
    LECTURE,
    async ({ produitIds }) => reponse(await detailProduits({ produitIds }))
  );

  server.tool(
    "commandes_semaine",
    "Liste les commandes d'une semaine cafet (lundi-dimanche) avec client, jour de retrait, statut, paiement, total et lignes. Filtres optionnels statut/jour, pagination via limite + hasMore.",
    {
      semaine: z.number().int().min(-52).max(4).optional().describe("Décalage en semaines : 0 = en cours (défaut), -1 = précédente, 1 = suivante."),
      statut: z.enum(["en_attente", "recuperee"]).optional().describe("Filtre sur le statut."),
      jour: z.enum(["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]).optional().describe("Filtre sur le jour de retrait."),
      limite: z.number().int().min(1).max(500).optional().describe("Nombre max de commandes renvoyées (défaut 100). hasMore indique s'il en reste."),
    },
    LECTURE,
    async (args) => reponse(await commandesSemaine(args))
  );

  server.tool(
    "stats_semaine",
    "Stats d'une semaine cafet pour les admins : CA, coût d'achat, bénéfice, nb commandes (en attente / récupérées), répartition par jour de retrait, marge par produit et ventes seul vs en menu.",
    {
      semaine: z.number().int().min(-52).max(4).optional().describe("Décalage en semaines : 0 = en cours (défaut), -1 = précédente."),
    },
    LECTURE,
    async ({ semaine }) => reponse(await statsSemaine(semaine ?? 0))
  );

  server.tool(
    "stats_semaines",
    "Évolution semaine par semaine (CA, coût, bénéfice, nb commandes + évolution en % vs la semaine précédente dans 'vsPrecedente') sur les N dernières semaines, prête pour un graphique 'ventes par semaine'. Semaines du plus ancien au plus récent.",
    {
      nbSemaines: z.number().int().min(1).max(26).optional().describe("Nombre de semaines à renvoyer, défaut 8, max 26."),
    },
    LECTURE,
    async ({ nbSemaines }) => reponse(await statsSemaines(nbSemaines ?? 8))
  );

  server.tool(
    "top_clients",
    "Top clients par total dépensé (nb commandes, total, date de dernière commande), trié du plus gros au plus petit. Sans 'semaine' : depuis toujours ; avec 'semaine' : une seule semaine cafet.",
    {
      semaine: z.number().int().min(-52).max(4).optional().describe("Décalage en semaines : 0 = en cours, -1 = précédente. Absent = toutes les commandes."),
      limite: z.number().int().min(1).max(100).optional().describe("Nombre de clients renvoyés (défaut 10, max 100)."),
    },
    LECTURE,
    async (args) => reponse(await topClients({ decalage: args.semaine, limite: args.limite }))
  );

  server.tool(
    "stocks",
    "Stocks restants des produits de base (hors menus), triés du plus faible au plus haut. Passer 'seuil' pour ne voir que les produits en dessous (ex. seuil 5 = alertes rupture proches).",
    {
      seuil: z.number().int().min(0).optional().describe("Ne renvoyer que les produits avec un stock inférieur ou égal à ce seuil."),
    },
    LECTURE,
    async ({ seuil }) => reponse(await stocksRestants({ seuil }))
  );

  return server;
}

// Lance le transport stdio uniquement si exécuté directement (tsx scripts/mcp-server.ts),
// pas quand Next importe ce fichier pour la route HTTP.
// Pas d'await top-level : la cible de compilation du projet est plus ancienne.
if (process.argv[1]?.endsWith("mcp-server.ts")) {
  creerServeurMcp().connect(new StdioServerTransport());
}
