# Plan d'implementation : MCP HTTP avec token

> Spec de référence : [MCP.md](../MCP.md) (contient le code exact des 3 fichiers et les champs du connecteur Vibe). Ce plan ne réécrit pas le code, il ordonne les tâches et leurs vérifications.

**Goal:** exposer les outils `lister_produits` / `detail_produit` en HTTP sur `POST /api/mcp`, protégé par `Authorization: Bearer <MCP_API_TOKEN>`, pour brancher un connecteur personnalisé dans Vibe, tout en gardant le serveur stdio (`npm run mcp`) fonctionnel.

**Architecture (version ponytail, 2 fichiers au lieu de 3):** `frontend/scripts/mcp-server.ts` exporte `creerServeurMcp()` et ne lance le transport stdio que si exécuté directement (guard `process.argv[1]` d'une ligne) ; la route `app/api/mcp/route.ts` importe cette factory via `@/scripts/mcp-server` (tsconfig couvre `**/*.ts`) et la connecte à un `WebStandardStreamableHTTPServerTransport` stateless, avec un check de token en tête de route. Pas de `lib/mcp-server.ts`.

**Tech Stack:** Next.js 14.2.x (App Router), `@modelcontextprotocol/sdk` 1.32.2, zod, dotenv, tsx. Pas de nouvelle dépendance.

## Global Constraints

- Un seul serveur dev à la fois (AGENTS.md) : aucun ne tourne sur le port 3000 actuellement ; si l'utilisateur en a un, tester dessus, sinon en lancer un et le couper après.
- Jamais de `npm run build` pendant qu'un serveur dev tourne ; vérifier le typage avec `npx tsc --noEmit` depuis `frontend/`.
- Aucun tiret long (U+2014/2013/2015) dans le code, commentaires, commits, docs.
- `.env.local` est gitignoré (vérifié) : `MCP_API_TOKEN` n'est jamais commité.
- Commit avec le heredoc Mistral Vibe (voir AGENTS.md / instructions de session).

## Task List

### Task 1: Modifier `frontend/scripts/mcp-server.ts` : factory exportée + guard stdio

- Le fichier garde dotenv + les deux `server.tool(...)`, mais la création du serveur passe dans `export function creerServeurMcp()` et le lancement stdio est guardé : `if (process.argv[1]?.endsWith("mcp-server.ts")) { creerServeurMcp().connect(new StdioServerTransport()); }`. Code exact dans MCP.md section "Fichiers 1".
- **Acceptance:** `npx tsc --noEmit` passe depuis `frontend/` ; `echo '<initialize JSON-RPC>' | timeout 5 npm run mcp` répond `serverInfo.name = "cafet-produits"` (stdio toujours vivant).
- **Files:** Modify `frontend/scripts/mcp-server.ts`.

### Task 2: Créer la route HTTP `frontend/app/api/mcp/route.ts` avec auth token

- Code exact dans MCP.md section "Fichiers 2" : import `@/scripts/mcp-server`, `autorise(req)` (fail closed si `MCP_API_TOKEN` absent, `timingSafeEqual` sur les buffers) + `POST` stateless (`sessionIdGenerator: undefined`).
- **Acceptance (avec serveur dev lancé, curl) :**
  - `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/mcp` -> `401`
  - idem avec `Authorization: Bearer mauvais` -> `401`
  - idem avec le bon token et un body `initialize` -> `200`
- **Files:** Create `frontend/app/api/mcp/route.ts`.
- **Depends on:** Task 1.

### Task 3: Ajouter le token à `frontend/.env.local`

- `openssl rand -hex 32` puis `MCP_API_TOKEN=<valeur>` dans `frontend/.env.local`.
- **Acceptance:** `grep -c MCP_API_TOKEN frontend/.env.local` -> 1 ; `git status --porcelain frontend/.env.local` -> vide (ignoré).
- **Files:** Modify `frontend/.env.local` (non commité).

### Checkpoint A (après Tasks 1-3)

- `npx tsc --noEmit` passe ; les 3 réponses curl ci-dessus sont 401 / 401 / 200 ; `npm run mcp` répond toujours en stdio.

### Task 4: Test end-to-end des tools en HTTP

- Avec le bon token : `tools/list` -> contient `lister_produits` et `detail_produit` ; `tools/call lister_produits {}` -> JSON avec `produits` ; `tools/call detail_produit {"produitId":"<id seed>"}` -> détail. Utiliser `npx tsx scripts/seed.ts` si la base est vide.
- **Acceptance:** les 3 requêtes renvoient 200 et un contenu JSON cohérent avec la base.
- **Depends on:** Task 2, Task 3.

### Task 5: Brancher le connecteur dans Vibe et vérifier

- Dialog "Add custom connector" : name `cafet-produits`, Server `http://localhost:3000/api/mcp`, Authentication `Bearer token` avec `MCP_API_TOKEN`.
- **Acceptance:** les deux tools apparaissent dans Vibe et répondent à une question type "quels banh bao sont dispo ?".
- **Depends on:** Task 4.

### Task 6: Commit

- Un commit avec les 2 fichiers de code (jamais `.env.local`) :
  `git add frontend/scripts/mcp-server.ts frontend/app/api/mcp/route.ts MCP.md tasks/`
  message type `feat(mcp): exposition HTTP de /api/mcp protégée par token` + heredoc Mistral Vibe.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `.env.local` commité par accident | Fuite du token | Il est gitignoré (vérifié) ; `git status` avant chaque commit |
| Mauvais cwd pour le script stdio (dotenv relatif) | `npm run mcp` plante hors de `frontend/` | Le script est lancé via `npm run mcp` depuis `frontend/`, cwd garanti |
| Deux serveurs dev simultanés | `.next` corrompu | Un seul serveur, celui sur 3000 s'il répond, sinon le nôtre puis coupé |
| Token absent -> route ouverte par erreur | Accès libre | Fail closed : 401 si `MCP_API_TOKEN` non défini |

## Open Questions

- Aucun bloquant. Le mode stateless HTTP est retenu (pas de gestion de session) ; passer en stateful plus tard si besoin de notifications serveur.
