"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { definirAgentSession } from "@/lib/agent-identite";

// Easter egg : une petite image discrète dans le footer. Un clic assombrit
// l'écran et joue l'évolution BAO -> DUONG (style Pokémon), puis bascule
// l'agent sur DUONG pour toute la session.
export default function EasterEggDuong() {
  const [evolution, setEvolution] = useState(false);

  useEffect(() => {
    if (!evolution) return;
    // L'animation dure 1,44 s (mesuré) : on laisse une marge puis on bascule
    const timer = setTimeout(() => {
      definirAgentSession("duong");
      setEvolution(false);
    }, 1700);
    return () => clearTimeout(timer);
  }, [evolution]);

  return (
    <>
      <button
        onClick={() => setEvolution(true)}
        aria-label="Agent mystère"
        title="?"
        className="opacity-40 hover:opacity-100 transition-opacity"
      >
        <Image src="/images/asian.png" alt="" width={24} height={18} className="w-6 h-auto" />
      </button>

      {evolution && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center"
          role="dialog"
          aria-label="Évolution de l'agent"
        >
          <Image
            src="/images/bao_evolve_asian.gif"
            alt=""
            width={320}
            height={320}
            unoptimized
            className="w-64 h-64 sm:w-80 sm:h-80 object-contain"
          />
        </div>
      )}
    </>
  );
}
