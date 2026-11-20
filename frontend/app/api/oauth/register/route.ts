// RFC 7591 : enregistrement dynamique d'un client OAuth (ex. ChatGPT) -> renvoie un client_id.
import { enregistrerClient } from "@/lib/oauth";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_request", error_description: "body JSON requis" }, { status: 400 });
  }
  const { statut, reponse } = enregistrerClient(body);
  return Response.json(reponse, { status: statut });
}
