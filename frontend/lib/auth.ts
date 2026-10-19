// Sessions admin : cookie signé HMAC-SHA256 (compatible edge middleware via Web Crypto).

export const SESSION_COOKIE = "cafet_admin";
const DUREE_SESSION_MS = 7 * 24 * 3600 * 1000; // 7 jours

const encoder = new TextEncoder();

function getSecret() {
  return encoder.encode(process.env.SESSION_SECRET || "cafet-dev-secret-a-changer");
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", getSecret(), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function b64urlEncode(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  let out = s.replace(/-/g, "+").replace(/_/g, "/");
  while (out.length % 4) out += "=";
  return atob(out);
}

export async function createSessionToken(email: string): Promise<string> {
  const payload = b64urlEncode(JSON.stringify({ email, exp: Date.now() + DUREE_SESSION_MS }));
  return `${payload}.${await hmac(payload)}`;
}

export async function verifySessionToken(token?: string | null): Promise<string | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if ((await hmac(payload)) !== sig) return null;
  try {
    const data = JSON.parse(b64urlDecode(payload));
    if (typeof data.email !== "string" || typeof data.exp !== "number" || data.exp < Date.now()) {
      return null;
    }
    return data.email;
  } catch {
    return null;
  }
}

interface RequestLike {
  cookies: { get(name: string): { value: string } | undefined };
}

export async function getAdminEmail(req: RequestLike): Promise<string | null> {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
}
