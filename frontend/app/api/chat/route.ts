import { NextRequest, NextResponse } from "next/server";
import { Mistral } from "@mistralai/mistralai";
import type { ChatCompletionRequest } from "@mistralai/mistralai/models/components";
import { AGENT_INSTRUCTIONS, AGENT_TOOLS, executerOutil } from "@/lib/agent";

export const maxDuration = 60;

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY ?? "" });
const MODELE = process.env.MISTRAL_MODELE ?? "mistral-large-4";

// Historique envoyé par le client : [{role: "user"|"assistant", content}]
type MessageHistorique = { role: "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  if (!process.env.MISTRAL_API_KEY) {
    return NextResponse.json({ error: "Assistant non configuré (MISTRAL_API_KEY manquante)." }, { status: 503 });
  }
  const { message, history } = (await req.json()) as { message?: string; history?: MessageHistorique[] };
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Message manquant." }, { status: 400 });
  }

  const messages: ChatCompletionRequest["messages"] = [
    { role: "system", content: AGENT_INSTRUCTIONS },
    ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  try {
    // Boucle de function calling : le modèle demande un outil, on l'exécute et on repart
    // jusqu'à la réponse finale (6 tours max pour éviter une boucle infinie).
    for (let tour = 0; tour < 6; tour++) {
      const res = await mistral.chat.complete({ model: MODELE, messages, tools: AGENT_TOOLS });
      const msg = res.choices?.[0]?.message;
      if (!msg) break;

      if (msg.toolCalls?.length) {
        messages.push({
          role: "assistant",
          content: msg.content ?? null,
          toolCalls: msg.toolCalls,
        } as ChatCompletionRequest["messages"][number]);
        for (const appel of msg.toolCalls) {
          let args: Record<string, unknown> = {};
          try {
            // arguments : en pratique une string JSON, mais le type autorise aussi un objet
            const brut = appel.function.arguments;
            if (typeof brut === "string") args = JSON.parse(brut || "{}");
            else if (brut && typeof brut === "object") args = brut;
          } catch {
            // arguments illisibles : on exécute avec un objet vide
          }
          const resultat = await executerOutil(appel.function.name, args, req.nextUrl.origin);
          messages.push({
            role: "tool",
            toolCallId: appel.id ?? null,
            name: appel.function.name,
            content: JSON.stringify(resultat),
          });
        }
        continue;
      }

      // La commande créée par un outil remonte à l'UI pour proposer le ticket PDF
      const derniereCommande = trouverCommande(messages);
      return NextResponse.json({ reply: msg.content, ...(derniereCommande ? { commande: derniereCommande } : {}) });
    }
    return NextResponse.json({ error: "L'assistant n'a pas abouti, réessaie." }, { status: 502 });
  } catch (e) {
    console.error("POST /api/chat", e);
    return NextResponse.json({ error: "Erreur de l'assistant." }, { status: 500 });
  }
}

// Dernière commande créée pendant la boucle d'outils, pour que l'UI propose le ticket.
function trouverCommande(messages: ChatCompletionRequest["messages"]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "tool" || m.name !== "creer_commande" || typeof m.content !== "string") continue;
    try {
      const r = JSON.parse(m.content) as { commande?: unknown; succes?: boolean };
      if (r.succes && r.commande) return r.commande;
    } catch {
      // contenu illisible : on ignore
    }
  }
  return null;
}
