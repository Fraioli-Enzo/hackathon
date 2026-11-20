// POST /api/oauth/token : échange code + code_verifier (PKCE) contre un access token.
// Body en application/x-www-form-urlencoded, client public (pas de secret, auth "none").
import { echangerCode } from "@/lib/oauth";

export async function POST(req: Request) {
  const form = new URLSearchParams(await req.text());
  if (form.get("grant_type") !== "authorization_code") {
    return Response.json({ error: "unsupported_grant_type" }, { status: 400 });
  }
  const { statut, reponse } = echangerCode({
    code: form.get("code") ?? "",
    client_id: form.get("client_id") ?? "",
    redirect_uri: form.get("redirect_uri") ?? "",
    code_verifier: form.get("code_verifier") ?? "",
  });
  return Response.json(reponse, { status: statut });
}
