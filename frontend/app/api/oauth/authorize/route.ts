// GET /api/oauth/authorize : étape d'autorisation (authorization code + PKCE S256).
// Si pas de session admin, redirect vers la page de login ; sinon auto-approve et redirect
// vers redirect_uri avec ?code=...&state=... (pas d'écran de consentement, usage perso).
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { baseUrl, clientExiste, creerCode, SCOPES } from "@/lib/oauth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const p = url.searchParams;
  const responseType = p.get("response_type");
  const clientId = p.get("client_id") ?? "";
  const redirectUri = p.get("redirect_uri") ?? "";
  const state = p.get("state") ?? "";
  const codeChallenge = p.get("code_challenge") ?? "";
  const codeChallengeMethod = p.get("code_challenge_method") ?? "";
  const scope = p.get("scope") ?? SCOPES.join(" ");
  const resource = p.get("resource") ?? undefined;

  const email = await verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!email) {
    // Pas connecté : on renvoie vers le login admin, puis on revient ici.
    const retour = `${baseUrl()}/api/oauth/authorize?${p.toString()}`;
    return Response.redirect(`${baseUrl()}/admin/login?next=${encodeURIComponent(retour)}`, 302);
  }

  if (responseType !== "code" || !clientExiste(clientId) || codeChallengeMethod !== "S256" || !codeChallenge) {
    return Response.json(
      { error: "invalid_request", error_description: "response_type=code, client_id connu, PKCE S256 requis" },
      { status: 400 }
    );
  }

  const { statut, reponse } = creerCode({ client_id: clientId, redirect_uri: redirectUri, code_challenge: codeChallenge, scope, resource, email });
  if (statut !== 200) return Response.json(reponse, { status: statut });

  const redir = new URL(redirectUri);
  redir.searchParams.set("code", (reponse as { code: string }).code);
  if (state) redir.searchParams.set("state", state);
  return Response.redirect(redir.toString(), 302);
}
