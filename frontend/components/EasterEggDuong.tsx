"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { definirAgentSession } from "@/lib/agent-identite";

// Texte qui s'écrit lettre par lettre, avec des segments colorés (BAO en jaune CESI).
function TexteMachine({ segments }: { segments: { texte: string; classe: string }[] }) {
  const total = segments.reduce((n, s) => n + s.texte.length, 0);
  const [visibles, setVisibles] = useState(0);

  useEffect(() => {
    if (visibles >= total) return;
    const timer = setTimeout(() => setVisibles((v) => v + 1), 45);
    return () => clearTimeout(timer);
  }, [visibles, total]);

  let restant = visibles;
  return (
    <p className="text-2xl sm:text-3xl font-black text-center max-w-xl px-4">
      {segments.map((s, i) => {
        const part = s.texte.slice(0, Math.max(0, Math.min(s.texte.length, restant)));
        restant -= s.texte.length;
        return (
          <span key={i} className={s.classe}>
            {part}
          </span>
        );
      })}
    </p>
  );
}

const BLANC = "text-white";
const JAUNE = "text-cesi-jaune";

// Easter egg : une petite image discrète dans le footer. Un clic assombrit
// l'écran, le texte s'écrit lettre par lettre pendant 5 s, puis l'évolution
// BAO -> DUONG se joue une fois (style Pokémon) et rend la main à l'image
// finale asian.png figée. DUONG prend la place pour toute la session.
export default function EasterEggDuong() {
  const [phase, setPhase] = useState<"repos" | "attente" | "evolution" | "fini">("repos");
  const [lance, setLance] = useState(0);

  useEffect(() => {
    if (phase === "attente") {
      const timer = setTimeout(() => setPhase("evolution"), 3500);
      return () => clearTimeout(timer);
    }
    if (phase === "evolution") {
      // L'animation dure 1,44 s (mesuré) et boucle en interne : on la coupe
      // à la fin pour afficher l'image finale asian.png à la place
      const timer = setTimeout(() => {
        definirAgentSession("duong");
        setPhase("fini");
      }, 1250);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  return (
    <>
      <button
        onClick={() => {
          setLance((l) => l + 1);
          setPhase("attente");
        }}
        aria-label="Agent mystère"
        title="?"
        className="absolute left-2 bottom-1 opacity-10 hover:opacity-100 transition-opacity"
      >
        <Image src="/images/agents/asian.png" alt="" width={24} height={18} className="w-6 h-auto" />
      </button>

      {phase !== "repos" && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center gap-10"
          role="dialog"
          aria-label="Évolution de l'agent"
        >
          {phase === "attente" && (
            <TexteMachine
              key={"attente-" + lance}
              segments={[
                { texte: "Quoi ? ", classe: BLANC },
                { texte: "Agent BAO", classe: JAUNE },
                { texte: " réagit à quelque chose...", classe: BLANC },
              ]}
            />
          )}

          {phase === "evolution" && (
            <Image
              src={"/images/agents/bao_evolve_asian.gif?v=" + lance}
              alt=""
              width={320}
              height={320}
              unoptimized
              className="w-64 h-64 sm:w-80 sm:h-80 object-contain"
            />
          )}

          {phase === "fini" && (
            <>
              <Image
                src="/images/agents/asian.png"
                alt=""
                width={256}
                height={192}
                className="w-52 sm:w-64 h-auto object-contain drop-shadow-lg"
              />
              <div className="flex flex-col items-center gap-6">
                <TexteMachine
                  key={"fini-" + lance}
                  segments={[
                    { texte: "Félicitations ! ", classe: BLANC },
                    { texte: "Agent BAO", classe: JAUNE },
                    { texte: " a évolué en ", classe: BLANC },
                    { texte: "Agent DUONG", classe: JAUNE },
                    { texte: " !", classe: BLANC },
                  ]}
                />
                <button
                  onClick={() => setPhase("repos")}
                  className="bg-cesi-jaune text-black font-bold px-6 py-2 rounded-full hover:bg-yellow-300 transition-colors"
                >
                  Continuer
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
