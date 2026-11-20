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
import { listerProduits, detailProduit } from "../lib/agent";

export function creerServeurMcp() {
  const server = new McpServer({ name: "cafet-produits", version: "1.0.0" });
  const reponse = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

  server.tool(
    "lister_produits",
    "Liste les produits actifs de la cafet avec id, nom, prix, stock et catégorie. Un stock de 0 veut dire rupture ; les menus n'ont pas de stock.",
    { categorie: z.string().optional().describe("Filtre optionnel : Banh Bao, Nems, Samoussa, Mochis, Desserts, Menus.") },
    async ({ categorie }) => reponse(await listerProduits({ categorie }))
  );

  server.tool(
    "detail_produit",
    "Détail d'un produit par son id : prix, stock, description, composition et options disponibles si menu.",
    { produitId: z.string().describe("L'id du produit.") },
    async ({ produitId }) => reponse(await detailProduit({ produitId }))
  );

  return server;
}

// Lance le transport stdio uniquement si exécuté directement (tsx scripts/mcp-server.ts),
// pas quand Next importe ce fichier pour la route HTTP.
// Pas d'await top-level : la cible de compilation du projet est plus ancienne.
if (process.argv[1]?.endsWith("mcp-server.ts")) {
  creerServeurMcp().connect(new StdioServerTransport());
}
