# TODO : MCP HTTP avec token (voir tasks/plan.md, spec dans MCP.md) - version ponytail : 2 fichiers

- [ ] Task 1: modifier `frontend/scripts/mcp-server.ts` (factory exportée + guard stdio d'une ligne)
- [ ] Task 2: créer `frontend/app/api/mcp/route.ts` (POST + auth token, fail closed, import @/scripts/mcp-server)
- [ ] Task 3: ajouter `MCP_API_TOKEN` à `frontend/.env.local` (non commité)
- [ ] Checkpoint A: tsc --noEmit OK, curl 401/401/200, stdio répond
- [ ] Task 4: test end-to-end HTTP tools/list + tools/call
- [ ] Task 5: brancher le connecteur Vibe et vérifier les tools
- [ ] Task 6: commit (code + MCP.md + tasks/, jamais .env.local)
