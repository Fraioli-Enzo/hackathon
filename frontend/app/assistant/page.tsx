"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Icon, addIcon } from "@iconify/react";
import { phPaperPlaneTiltBold } from "@/lib/icons";
import type { CommandeClient } from "@/lib/types";

addIcon("ph:paper-plane-tilt-bold", phPaperPlaneTiltBold);

type MessageChat = {
  role: "user" | "assistant";
  content: string;
  commande?: CommandeClient; // posée par l'agent : propose le ticket PDF
};

const MESSAGE_ACCUEIL: MessageChat = {
  role: "assistant",
  content: "Salut ! Je suis DUONG, l'agent de la Cafet CESI. Demande-moi les produits, les prix et les stocks, ou commande directement ici. Qu'est-ce qui te ferait plaisir cette semaine ?",
};

const SUGGESTIONS = ["Qu'est-ce qui est dispo ?", "Les menus et leurs prix", "Je veux commander"];

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
  const saisieRef = useRef<HTMLInputElement>(null);
  const [relance, setRelance] = useState(0);

  useEffect(() => {
    // Le GIF dure 1 s (4 frames) et n'a pas de boucle : tant que l'agent réfléchit,
    // on le rejoue dès la fin via ?v= (relance toutes les 1000 ms)
    if (!envoi) return;
    const timer = setInterval(() => setRelance((r) => r + 1), 1000);
    return () => clearInterval(timer);
  }, [envoi]);

  useEffect(() => {
    // Défile uniquement le fil de messages, jamais la page (scrollIntoView ferait
    // défiler toute la page vers le bas)
    if (filRef.current) filRef.current.scrollTop = filRef.current.scrollHeight;
  }, [messages, envoi]);

  useEffect(() => {
    // Focus permanent sur la saisie : écriture directe à l'arrivée et après chaque réponse
    if (!envoi) saisieRef.current?.focus();
  }, [envoi, messages.length]);

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
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="flex flex-col flex-1 min-h-0 rounded-2xl border border-line bg-card overflow-hidden shadow-sm">
        <header className="flex items-center justify-center gap-3 border-b border-line bg-surface px-4 py-3">
          <Image
            src="/images/asian.png"
            alt=""
            width={40}
            height={40}
            className="w-10 h-10 object-cover object-top rounded-full shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-lg font-black leading-tight">Agent DUONG</h1>
            <p className="text-xs text-muted leading-tight">Produits, prix, stocks et commandes de la cafet</p>
          </div>
        </header>

        <section ref={filRef} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4" aria-label="Conversation" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={"flex gap-2.5 " + (m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "assistant" && (
                <Image
                  src="/images/asian_head.png"
                  alt=""
                  width={36}
                  height={36}
                  className="w-9 h-9 object-cover object-top rounded-full shrink-0 mt-1"
                />
              )}
              <div
                className={
                  "max-w-[85%] sm:max-w-[75%] space-y-3 px-4 py-2.5 shadow-sm " +
                  (m.role === "user"
                    ? "bg-cesi-jaune text-black rounded-2xl rounded-br-sm"
                    : "bg-surface border border-line text-content rounded-2xl rounded-tl-sm")
                }
              >
                <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
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

          {messages.length === 1 && !envoi && (
            /* Aligné sur les bulles de DUONG : reprend le décalage avatar (36 px) + l'écart (10 px) */
            <div className="flex flex-wrap gap-2 pt-1 pl-[46px]">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => envoyer(s)}
                  className="text-sm border border-line bg-surface text-content rounded-full px-3 py-1.5 hover:border-cesi-jaune transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {envoi && (
            <div className="flex justify-start gap-2.5" aria-busy="true">
              {/* ?v= rejoue le GIF depuis la frame 0 (les 3 s via relance) */}
              <Image
                src={"/images/asian_gif.gif?v=" + messages.length + "-" + relance}
                alt=""
                width={36}
                height={36}
                unoptimized
                className="w-9 h-9 object-cover rounded-full shrink-0 mt-1"
              />
              <div className="bg-surface border border-line rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 shadow-sm text-muted">
                {[0, 150, 300].map((delai) => (
                  <span key={delai} className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: delai + "ms" }} />
                ))}
              </div>
            </div>
          )}
        </section>

        {erreur && (
          <p role="alert" className="border-t border-line bg-card px-4 py-2 text-sm text-red-600">
            {erreur}
          </p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            envoyer(saisie);
          }}
          className="border-t border-line bg-surface p-3 flex items-center gap-2"
        >
          <label htmlFor="message-agent" className="sr-only">
            Ton message
          </label>
          <input
            ref={saisieRef}
            id="message-agent"
            autoComplete="off"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder="Ex : il reste des mochis ? Ou : je veux 2 nems au poulet"
            disabled={envoi}
            className="flex-1 min-w-0 border border-line rounded-full bg-card px-4 py-2.5 text-content placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-cesi-jaune focus:border-transparent disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={envoi || !saisie.trim()}
            className="w-11 h-11 shrink-0 rounded-full bg-cesi-jaune text-black hover:bg-yellow-300 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100"
            aria-label="Envoyer"
          >
            <Icon icon="ph:paper-plane-tilt-bold" className="w-5 h-5 mx-auto" aria-hidden />
          </button>
        </form>
      </div>

      <p className="text-xs text-muted text-center mt-2">
        Plutôt le formulaire classique ? <Link href="/commander" className="underline hover:text-content">C'est par ici</Link>.
      </p>
    </div>
  );
}
