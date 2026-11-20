// RFC 9728 : métadonnées de la ressource protégée (le serveur MCP).
// Sert aussi via le rewrite /.well-known/oauth-protected-resource (voir next.config.mjs).
import { baseUrl, resourceMcp, SCOPES } from "@/lib/oauth";

export async function GET() {
  return Response.json({
    resource: resourceMcp(),
    authorization_servers: [baseUrl()],
    scopes_supported: [...SCOPES],
    bearer_methods_supported: ["header"],
  });
}
