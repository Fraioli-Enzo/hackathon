// Route MCP HTTP (streamable) : expose creerServeurMcp() sur POST /api/mcp.
// Deux auth acceptées : token partagé statique (Bearer <MCP_API_TOKEN>, clients locaux)
// OU access token OAuth émis par /api/oauth/token (connecteurs type ChatGPT).
// Fail closed : sans aucun bearer valide, on refuse tout (401 + WWW-Authenticate RFC 9728).
import { timingSafeEqual } from "node:crypto";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { creerServeurMcp } from "@/scripts/mcp-server";
import { baseUrl, verifierAccessToken } from "@/lib/oauth";

function tokenStatiqueValide(recu: string): boolean {
  const attendu = process.env.MCP_API_TOKEN;
  if (!attendu || !recu) return false;
  const a = Buffer.from(recu);
  const b = Buffer.from(attendu);
  return a.length === b.length && timingSafeEqual(a, b);
}

function autorise(req: Request): boolean {
  const recu = req.headers.get("authorization")?.replace(/^Bearer /i, "") ?? "";
  return tokenStatiqueValide(recu) || verifierAccessToken(recu) !== null;
}

// Mode stateless : chaque requête HTTP est indépendante, pas de session à gérer.
export async function POST(req: Request) {
  if (!autorise(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        // RFC 9728 : le client découvre ainsi les métadonnées OAuth de la ressource.
        "WWW-Authenticate": `Bearer resource_metadata="${baseUrl()}/.well-known/oauth-protected-resource"`,
      },
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
