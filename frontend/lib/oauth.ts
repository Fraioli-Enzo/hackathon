// Provider OAuth 2.1 minimal pour le serveur MCP : authorization code + PKCE S256 + DCR.
// AS et ressource vivent dans la meme appli Next (issuer = base publique).
// ponytail: clients et codes en Map mémoire, perdus au restart -> le client re-fait le flow, aucun impact.
// ponytail: pas d'écran de consentement, /authorize auto-approuve si session admin valide (usage perso).
// ponytail: pas de refresh token, on n'annonce que authorization_code -> le client re-autorise à l'expiration.
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { envRequise } from "./env";

export const SCOPES = ["mcp:read"] as const;
export const DUREE_CODE_MS = 60_000; // un code d'autorisation vit 60 s
export const DUREE_TOKEN_MS = 3600_000; // un access token vit 1 h

type Client = { client_id: string; redirect_uris: string[] };
type Code = {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  scope: string;
  resource?: string;
  email: string;
  exp: number;
};
type TokenPayload = {
  sub: string;
  client_id: string;
  scope: string;
  resource?: string;
  exp: number;
};

// Sur globalThis : en dev, Next peut instancier ce module une fois par route,
// l'état doit être partagé entre /oauth/register, /oauth/authorize et /oauth/token.
const g = globalThis as unknown as { __oauthClients?: Map<string, Client>; __oauthCodes?: Map<string, Code> };
const clients = (g.__oauthClients ??= new Map<string, Client>());
const codes = (g.__oauthCodes ??= new Map<string, Code>());

// URL publique de l'app (https en prod, ex. via tunnel). Une seule variable pour toutes les métadonnées.
export function baseUrl(): string {
  return (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function resourceMcp(): string {
  return `${baseUrl()}/api/mcp`;
}

function getSecret() {
  return envRequise("SESSION_SECRET");
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

function hmac(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("hex");
}

function signer(payload: object): string {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${hmac(body)}`;
}

function verifier<T>(token: string): T | null {
  const [body, sig] = token.split(".");
  if (!body || !sig || !process.env.SESSION_SECRET) return null;
  const attendu = Buffer.from(hmac(body));
  const recu = Buffer.from(sig);
  if (attendu.length !== recu.length || !timingSafeEqual(attendu, recu)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function urlValide(u: string): boolean {
  try {
    return Boolean(new URL(u).protocol);
  } catch {
    return false;
  }
}

// RFC 7591 : enregistrement dynamique d'un client public (sans secret, PKCE obligatoire).
export function enregistrerClient(body: unknown): { statut: number; reponse: object } {
  const b = (body ?? {}) as Record<string, unknown>;
  const redirectUris = b.redirect_uris;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0 || !redirectUris.every((u) => typeof u === "string" && urlValide(u))) {
    return { statut: 400, reponse: { error: "invalid_client_metadata", error_description: "redirect_uris requis, tableau d'URL absolues" } };
  }
  const client: Client = { client_id: randomBytes(16).toString("hex"), redirect_uris: redirectUris as string[] };
  clients.set(client.client_id, client);
  return {
    statut: 201,
    reponse: {
      client_id: client.client_id,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: client.redirect_uris,
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: SCOPES.join(" "),
    },
  };
}

export function clientExiste(clientId: string): Client | undefined {
  return clients.get(clientId);
}

// Crée un code d'autorisation (étape /authorize, après consentement auto).
export function creerCode(params: {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  scope?: string;
  resource?: string;
  email: string;
}): { statut: number; reponse: object } {
  const client = clients.get(params.client_id);
  if (!client || !client.redirect_uris.includes(params.redirect_uri)) {
    return { statut: 400, reponse: { error: "invalid_request", error_description: "client_id ou redirect_uri inconnu" } };
  }
  const code = randomBytes(24).toString("hex");
  codes.set(code, {
    client_id: params.client_id,
    redirect_uri: params.redirect_uri,
    code_challenge: params.code_challenge,
    scope: params.scope || SCOPES.join(" "),
    resource: params.resource,
    email: params.email,
    exp: Date.now() + DUREE_CODE_MS,
  });
  return { statut: 200, reponse: { code } };
}

// Échange le code contre un access token (étape /token), avec vérification PKCE S256.
export function echangerCode(params: {
  code: string;
  client_id: string;
  redirect_uri: string;
  code_verifier: string;
}): { statut: number; reponse: object } {
  const c = codes.get(params.code);
  if (!c || c.exp < Date.now() || c.client_id !== params.client_id || c.redirect_uri !== params.redirect_uri) {
    return { statut: 400, reponse: { error: "invalid_grant" } };
  }
  // PKCE S256 : base64url(sha256(code_verifier)) doit égaler le code_challenge envoyé à /authorize.
  const sha = b64url(createHash("sha256").update(params.code_verifier).digest());
  if (sha !== c.code_challenge) {
    return { statut: 400, reponse: { error: "invalid_grant", error_description: "PKCE invalide" } };
  }
  codes.delete(params.code); // code à usage unique
  const exp = Date.now() + DUREE_TOKEN_MS;
  const payload: TokenPayload = { sub: c.email, client_id: c.client_id, scope: c.scope, resource: c.resource, exp };
  return {
    statut: 200,
    reponse: {
      access_token: signer(payload),
      token_type: "Bearer",
      expires_in: Math.floor(DUREE_TOKEN_MS / 1000),
      scope: c.scope,
    },
  };
}

export type AccessTokenValide = { sub: string; clientId: string; scopes: string[]; resource?: string };

// Vérifie un access token (signature HMAC + expiration + audience si présent).
export function verifierAccessToken(token: string): AccessTokenValide | null {
  const payload = verifier<TokenPayload>(token);
  if (!payload || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
  if (payload.resource) {
    const attendu = resourceMcp().replace(/\/+$/, "");
    const recu = payload.resource.replace(/\/+$/, "");
    if (recu !== attendu) return null;
  }
  return { sub: payload.sub, clientId: payload.client_id, scopes: payload.scope.split(" ").filter(Boolean), resource: payload.resource };
}
