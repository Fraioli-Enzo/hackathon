"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const TEXTE_INTRO = "Agent DUONG a votre service";

// Bouton flottant vers l'assistant, visible partout sauf sur la page /assistant.
// Au lancement, une bulle s'affiche au-dessus puis s'efface lettre par lettre
// après 10 secondes.
export default function BoutonAgent() {
  const chemin = usePathname();
  const [texte, setTexte] = useState(TEXTE_INTRO);

  useEffect(() => {
    if (!texte) return;
    // Texte complet : attend 10 s ; puis chaque lettre part 60 ms après la précédente
    const delai = texte.length === TEXTE_INTRO.length ? 10000 : 60;
    const timer = setTimeout(() => setTexte(texte.slice(0, -1)), delai);
    return () => clearTimeout(timer);
  }, [texte]);

  if (chemin === "/assistant") return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative">
        {texte && (
          <p className="absolute bottom-full right-0 mb-2 whitespace-nowrap bg-card border border-line rounded-xl px-3 py-2 text-sm font-bold shadow-lg">
            {texte}
          </p>
        )}
        <Link
          href="/assistant"
          aria-label="Ouvrir l'assistant IA"
          className="flex items-center justify-center w-24 h-24 rounded-full bg-cesi-jaune hover:bg-yellow-300 hover:scale-105 transition-all shadow-lg overflow-hidden"
        >
          <Image src="/images/asian.png" alt="" width={176} height={176} className="w-[88px] h-[88px] object-cover rounded-full" />
        </Link>
      </div>
    </div>
  );
}
