# Serveur MCP de la cafet, exposé en HTTP (mémo)

Objectif : exposer les outils du catalogue (`lister_produits`, `detail_produit(s)`) et les outils admin (`commandes_semaine`, `stats_semaine`, `stats_semaines`, `stocks`) en HTTP pour pouvoir brancher un connecteur personnalisé dans Vibe ("Add custom connector" demande une URL). Le serveur stdio existant (`npm run mcp`) reste dispo pour les clients locaux. Tous les tools sont en lecture seule ; l'accès HTTP reste protégé par `MCP_API_TOKEN`.

## Architecture

```mermaid
flowchart LR
  vibe["Vibe (connecteur custom, URL HTTP)"] -->|"POST /api/mcp"| route["app/api/mcp/route.ts"]
  route --> factory["scripts/mcp-server.ts : creerServeurMcp()"]
  factory --> agent["lib/agent.ts : listerProduits / detailProduit(s)"]
  factory --> stats["lib/stats.ts : statsSemaine / statsSemaines / commandesSemaine / stocksRestants"]
  agent --> mongo[("MongoDB")]
  stats --> mongo
  stdio["Client MCP local (stdio)"] -->|"npm run mcp"| script["scripts/mcp-server.ts (main guardé)"]
  script --> factory
```

Un seul fichier serveur : `creerServeurMcp()` est exportée et le lancement stdio est guardé (ne tourne que si le fichier est exécuté directement, pas importé par Next). Chaque transport ne fait que connecter la factory. Ne jamais appeler `connect()` au niveau module hors du guard.

## Fichiers

### 1. `frontend/scripts/mcp-server.ts` (factory exportée + lanceur stdio)

`creerServeurMcp()` enregistre tous les tools (tous en lecture seule, `readOnlyHint: true`) et retourne le serveur ; le lancement stdio est guardé (ne tourne que si le fichier est exécuté directement, pas importé par Next).

Tools exposés (v1.1.0) :

| Tool | Params | Rôle |
|---|---|---|
| `lister_produits` | `categorie?` | Catalogue actif (id, nom, prix, stock, catégorie) |
| `detail_produit` | `produitId` | Détail d'un produit (composition, options de menu) |
| `detail_produits` | `produitIds[]` (max 20) | **Batch** : détail de plusieurs produits en un seul appel ; une seule requête pour toutes les variantes de menu |
| `commandes_semaine` | `semaine?`, `statut?`, `jour?`, `limite?` | Commandes d'une semaine cafet, filtres + pagination (`hasMore`) |
| `stats_semaine` | `semaine?` | CA, coût, **bénéfice**, nb commandes, par jour de retrait, marge par produit, ventes seul vs menu |
| `stats_semaines` | `nbSemaines?` (défaut 8, max 26) | Évolution CA/coût/bénéfice **semaine par semaine** + `vsPrecedente` (évolution en % vs semaine précédente), prête pour un graphique |
| `top_clients` | `semaine?`, `limite?` | Top clients par total dépensé (regroupement insensible à la casse) ; sans `semaine` = depuis toujours |
| `stocks` | `seuil?` | Stocks restants hors menus, triés croissant ; `seuil` = alerte rupture |

Les requêtes admin (stats, commandes, stocks) vivent dans `frontend/lib/stats.ts`, **partagé avec la route `/api/admin/stats`** (qui n'est plus qu'un wrapper auth) : une seule source de vérité pour le calcul du bénéfice (`lib/couts.ts`). `detailProduits` est dans `lib/agent.ts` à côté de `detailProduit`.

### 2. `frontend/app/api/mcp/route.ts` (nouveau : exposition HTTP pour Vibe, protégée par token)

```ts
import { timingSafeEqual } from "node:crypto";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { creerServeurMcp } from "@/scripts/mcp-server";

// Auth par token partagé (MCP_API_TOKEN dans .env.local, connu de toi seul).
// Fail closed : si la variable n'est pas définie, on refuse tout.
function autorise(req: Request): boolean {
  const attendu = process.env.MCP_API_TOKEN;
  if (!attendu) return false;
  const recu = req.headers.get("authorization")?.replace(/^Bearer /i, "") ?? "";
  const a = Buffer.from(recu);
  const b = Buffer.from(attendu);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Mode stateless : chaque requête HTTP est indépendante, pas de session à gérer.
export async function POST(req: Request) {
  if (!autorise(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const server = creerServeurMcp();
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  const res = await transport.handleRequest(req);
  // Ne pas fermer tout de suite : la réponse est un flux SSE encore en cours d'écriture.
  // Le serveur est fermé quand le flux est terminé (flush), sinon le client reçoit un body vide.
  const body = res.body;
  if (!body) {
    await server.close();
    return res;
  }
  const stream = body.pipeThrough(
    new TransformStream({ flush: async () => { await server.close(); } })
  );
  return new Response(stream, res);
}
```

Générer le token et le mettre dans `frontend/.env.local` (jamais dans le code) :

```bash
openssl rand -hex 32 >> frontend/.env.local   # sous la forme MCP_API_TOKEN=...
```

SDK requis : `@modelcontextprotocol/sdk` >= 1.18 (installe : 1.32.2, OK). Le transport web standard (`webStandardStreamableHttp.js`) prend un `Request`/`Response` standard, donc compatible route Next.js App Router sans adapteur.

## Brancher Vibe (dialog "Add custom connector")

| Champ | Valeur |
|---|---|
| Connector name | `cafet-produits` |
| Server | `http://localhost:3000/api/mcp` (dev server actif via `./start.sh`) |
| Description | optionnel, ex. "Catalogue, stocks et commandes de la cafet CESI" |
| Authentication | `Bearer token`, puis colle la valeur de `MCP_API_TOKEN` (ou référence la var d'env si le dialog le propose). Ne laisse pas `Auto-detect` : sans auth, n'importe qui peut appeler l'endpoint |

Le dialog ne accepte que des URL HTTP(S) : pour un serveur local en stdio, utiliser à la place `~/.vibe/config.toml` (ou `.vibe/config.toml` au niveau projet) :

```toml
[[mcp_servers]]
name = "cafet-produits"
transport = "stdio"
command = "npm"
args = ["--prefix", "/Users/enzofraioli/Documents/Perso/Projets Perso/Programmation/hackathon/frontend", "run", "mcp"]

# Variante HTTP avec token (pour un client qui ne gere que les URL) :
[[mcp_servers]]
name = "cafet-produits-http"
transport = "streamable-http"
url = "http://localhost:3000/api/mcp"
[mcp_servers.auth]
type = "static"
api_key_env = "MCP_API_TOKEN"
api_key_header = "Authorization"
api_key_format = "Bearer {token}"
```

Le `--prefix .../frontend` force le cwd = frontend, indispensable car le script stdio charge `.env.local` (MONGODB_URI) en chemin relatif.

## Pièges et règles

- **stdout = canal du protocole en stdio** : jamais de `console.log` sur stdout côté serveur, logs sur stderr uniquement.
- **Connexion longue durée côté client** : un seul `Client` réutilisé (singleton), `client.close()` à l'arrêt, reconnect si `onclose` (crash du process). Ne pas spawn un process par requête.
- **Jamais de secret dans le code** : `.env.local` (MONGODB_URI, MISTRAL_API_KEY, MCP_API_TOKEN), chargé par Next automatiquement pour la route HTTP, par dotenv pour le script stdio. Si le token fuite (repo public, capture d'écran), le révoquer = changer la valeur dans `.env.local` et redémarrer.
- **Token obligatoire sur `/api/mcp`** : la route renvoie 401 sans `Authorization: Bearer <MCP_API_TOKEN>`, et aussi si la variable n'est pas définie (fail closed). Le token ne sort jamais du `.env.local` et du client Vibe.
- Un seul serveur dev à la fois (règle AGENTS.md) : la route `/api/mcp` vit dans le même `next dev` que l'app, pas de deuxième serveur.
- En HTTP stateless, seul `POST` est utile ; pas besoin de GET/SSE.

## Bonnes pratiques MCP (résumé, sources Anthropic + spec MCP)

- Tools = contrat avec un agent non déterministe : peu d'outils, chacun un but clair, descriptions comme pour un nouveau (contexte implicite rendu explicite), noms de params sans ambiguïté.
- Namespacing par préfixe service (`cafet_lister_produits`) si plusieurs serveurs chez le même client.
- Annotations sur chaque tool : `readOnlyHint: true` pour les deux tools lecture actuels.
- Erreurs dans le result (`isError: true`) avec message actionnable, jamais de stack trace ; validation stricte des entrées (zod).
- Efficacité token : `limit` + pagination (`has_more`, `next_offset`) sur les listes, troncature ~25 000 caractères avec message qui guide le filtre.
- Évaluer avant d'ajouter des outils : tâches réalistes, boucle agent, mesurer accuracy + nb d'appels + erreurs.

Sources : anthropic.com/research/writing-tools-for-agents, anthropic.com/research/code-execution-with-mcp, modelcontextprotocol.io/specification (server/tools), modelcontextprotocol.io/docs/develop/build-server.
