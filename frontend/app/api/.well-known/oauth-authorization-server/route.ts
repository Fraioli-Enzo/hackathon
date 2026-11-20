// RFC 8414 : métadonnées du serveur d'autorisation (même appli Next, issuer = base publique).
import { baseUrl, SCOPES } from "@/lib/oauth";

export async function GET() {
  const base = baseUrl();
  return Response.json({
    issuer: base,
    authorization_endpoint: `${base}/api/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    registration_endpoint: `${base}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [...SCOPES],
  });
}
