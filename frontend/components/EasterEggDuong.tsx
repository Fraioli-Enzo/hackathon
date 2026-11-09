"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { definirAgentSession } from "@/lib/agent-identite";

// Easter egg : une petite image discrète dans le footer. Un clic assombrit
// l'écran, un texte patiente 5 s, puis l'évolution BAO -> DUONG se joue une
// fois (style Pokémon) et reste figée sur la dernière frame. DUONG prend la
// place pour toute la session.
export default function EasterEggDuong() {
  const [phase, setPhase] = useState<"repos" | "attente" | "evolution" | "fini">("repos");
  const [lance, setLance] = useState(0);

  useEffect(() => {
    if (phase === "attente") {
      const timer = setTimeout(() => setPhase("evolution"), 5000);
      return () => clearTimeout(timer);
    }
    if (phase === "evolution") {
      // L'animation dure 1,44 s (mesuré) : à la fin on bascule sur DUONG,
      // la dernière frame reste affichée (le gif n'a pas de boucle)
      const timer = setTimeout(() => {
        definirAgentSession("duong");
        setPhase("fini");
      }, 1700);
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
        className="opacity-40 hover:opacity-100 transition-opacity"
      >
        <Image src="/images/asian.png" alt="" width={24} height={18} className="w-6 h-auto" />
      </button>

      {phase !== "repos" && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center gap-8"
          role="dialog"
          aria-label="Évolution de l'agent"
        >
          {phase === "attente" && (
            <p className="text-lg sm:text-xl font-bold text-white animate-pulse">
              Quoi ? BAO réagit à quelque chose...
            </p>
          )}
          {(phase === "evolution" || phase === "fini") && (
            <Image
              src={"/images/bao_evolve_asian.gif?v=" + lance}
              alt=""
              width={320}
              height={320}
              unoptimized
              className="w-64 h-64 sm:w-80 sm:h-80 object-contain"
            />
          )}
          {phase === "fini" && (
            <div className="flex flex-col items-center gap-5">
              <p className="text-lg sm:text-xl font-bold text-white text-center">
                Félicitations ! BAO a évolué en Agent DUONG !
              </p>
              <button
                onClick={() => setPhase("repos")}
                className="bg-cesi-jaune text-black font-bold px-6 py-2 rounded-full hover:bg-yellow-300 transition-colors"
              >
                Continuer
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
