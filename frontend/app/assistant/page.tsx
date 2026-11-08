"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon, addIcon } from "@iconify/react";
import { phRobotBold, phPaperPlaneTiltBold, phChatTeardropTextBold } from "@/lib/icons";
import type { CommandeClient } from "@/lib/types";

addIcon("ph:robot-bold", phRobotBold);
addIcon("ph:paper-plane-tilt-bold", phPaperPlaneTiltBold);
addIcon("ph:chat-teardrop-text-bold", phChatTeardropTextBold);

type MessageChat = {
  role: "user" | "assistant";
  content: string;
  commande?: CommandeClient; // posée par l'agent : propose le ticket PDF
};

const MESSAGE_ACCUEIL: MessageChat = {
  role: "assistant",
  content: "Salut ! Je suis l'assistant de la Cafet CESI. Je peux te parler des produits, des prix et des stocks, ou passer ta commande directement ici. Qu'est-ce que tu veux manger cette semaine ?",
};

function lireCookie(nom: string): string | null {
  if (typeof document === "undefined") return null;
  const entree = document.cookie.split("; ").find((c) => c.startsWith(nom + "="));
  return entree ? decodeURIComponent(entree.slice(nom.length + 1)) : null;
}

export default function AssistantPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<MessageChat[]>([MESSAGE_ACCUEIL]);
  const [saisie, setSaisie] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const filRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Défile uniquement le fil de messages, jamais la page (scrollIntoView ferait
    // défiler toute la page vers le bas)
    if (filRef.current) filRef.current.scrollTop = filRef.current.scrollHeight;
  }, [messages, envoi]);

  async function envoyer(texte: string) {
    const message = texte.trim();
    if (!message || envoi) return;
    const historique = messages.map(({ role, content }) => ({ role, content }));
    const prochains = [...messages, { role: "user" as const, content: message }];
    setMessages(prochains);
    setSaisie("");
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: historique.slice(-20) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de l'assistant.");
      setMessages((msgs) => [...msgs, { role: "assistant", content: data.reply, ...(data.commande ? { commande: data.commande } : {}) }]);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setEnvoi(false);
    }
  }

  // L'agent a passé la commande : même mécanique que le formulaire (ticket PDF + rappel accueil)
  function voirTicket(commande: CommandeClient) {
    sessionStorage.setItem("cafet-commande", JSON.stringify(commande));
    try {
      const ids: string[] = JSON.parse(lireCookie("cafet-commandes") || "[]");
      ids.push(commande._id);
      document.cookie =
        "cafet-commandes=" +
        encodeURIComponent(JSON.stringify(ids.slice(-20))) +
        "; path=/; max-age=" +
        60 * 60 * 24 * 30 +
        "; samesite=lax";
    } catch {
      // cookie illisible : on continue sans
    }
    router.push("/confirmation");
  }

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-10rem)]">
      <section className="text-center space-y-2 py-4">
        <h1 className="text-3xl sm:text-4xl font-black flex items-center justify-center gap-3">
          <Icon icon="ph:robot-bold" className="w-8 h-8 text-cesi-jaune" aria-hidden />
          Assistant Cafet
        </h1>
        <p className="text-muted">
          Pose tes questions sur les produits, ou commande directement en discutant. Le paiement reste sur place.
        </p>
      </section>

      <section
        ref={filRef}
        className="flex-1 min-h-0 overflow-y-auto border border-line rounded-xl bg-card p-4 space-y-4"
        aria-label="Conversation"
      >
        {messages.map((m, i) => (
          <div key={i} className={"flex " + (m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={
                "max-w-[85%] sm:max-w-[75%] space-y-3 rounded-xl px-4 py-2.5 " +
                (m.role === "user" ? "bg-cesi-jaune text-black rounded-br-sm" : "bg-surface border border-line rounded-bl-sm")
              }
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.commande && (
                <button
                  onClick={() => voirTicket(m.commande as CommandeClient)}
                  className="block w-full bg-cesi-jaune text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
                >
                  Récupérer mon ticket (QR code)
                </button>
              )}
            </div>
          </div>
        ))}
        {envoi && (
          <div className="flex justify-start">
            <div className="bg-surface border border-line rounded-xl rounded-bl-sm px-4 py-2.5 text-muted">L'assistant réfléchit…</div>
          </div>
        )}
      </section>

      {erreur && <p className="text-red-600 text-sm">{erreur}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          envoyer(saisie);
        }}
        className="flex gap-2"
      >
        <label htmlFor="message-agent" className="sr-only">
          Ton message
        </label>
        <input
          id="message-agent"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          placeholder="Ex : il reste des mochis ? Ou : je veux 2 nems au poulet"
          disabled={envoi}
          className="flex-1 border border-line rounded-lg bg-surface px-4 py-3 text-content placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-cesi-jaune disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={envoi || !saisie.trim()}
          className="bg-cesi-jaune text-black font-bold px-4 sm:px-5 rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-40"
          aria-label="Envoyer"
        >
          <Icon icon="ph:paper-plane-tilt-bold" className="w-5 h-5" aria-hidden />
        </button>
      </form>

      <p className="text-xs text-muted text-center">
        Plutôt le formulaire classique ? <Link href="/commander" className="underline hover:text-content">C'est par ici</Link>.
      </p>
    </div>
  );
}
