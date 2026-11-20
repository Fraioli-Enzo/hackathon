// Route MCP HTTP (streamable) : expose creerServeurMcp() sur POST /api/mcp.
// Protégée par token partagé : Authorization: Bearer <MCP_API_TOKEN> (.env.local).
// Fail closed : si MCP_API_TOKEN n'est pas défini, on refuse tout (401).
import { timingSafeEqual } from "node:crypto";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { creerServeurMcp } from "@/scripts/mcp-server";

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
  // On ferme le serveur quand le flux est terminé (flush), pas avant.
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
