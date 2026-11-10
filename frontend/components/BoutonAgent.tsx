"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { APPARENCES, EVT_CHANGEMENT_AGENT, lireAgentSession, type IdentiteAgent } from "@/lib/agent-identite";

// Bouton flottant vers l'assistant (BAO par défaut, DUONG si easter egg débloqué).
// Visible partout sauf sur la page /assistant. Au chargement, une bulle s'affiche
// au-dessus puis s'efface lettre par lettre après 10 secondes.
export default function BoutonAgent() {
  const chemin = usePathname();
  const [agent, setAgent] = useState<IdentiteAgent>("bao");
  const [texte, setTexte] = useState(APPARENCES.bao.intro);
  const apparence = APPARENCES[agent];
  const intro = apparence.intro;

  useEffect(() => {
    // Identité de la session + bascule en direct quand l'easter egg est débloqué
    const maj = () => {
      setAgent(lireAgentSession());
      setTexte(APPARENCES[lireAgentSession()].intro);
    };
    maj();
    window.addEventListener(EVT_CHANGEMENT_AGENT, maj);
    return () => window.removeEventListener(EVT_CHANGEMENT_AGENT, maj);
  }, []);

  useEffect(() => {
    if (!texte) return;
    // Texte complet : attend 10 s ; puis chaque lettre part 60 ms après la précédente
    const delai = texte.length === intro.length ? 10000 : 60;
    const timer = setTimeout(() => setTexte(texte.slice(0, -1)), delai);
    return () => clearTimeout(timer);
  }, [texte, intro]);

  // Pas de bouton agent dans l'espace admin ni sur la page du chat
  if (chemin === "/assistant" || chemin.startsWith("/admin")) return null;

  // Sur /commander, l'agent est en bas à gauche (le bouton panier mobile est en bas à droite)
  const aGauche = chemin === "/commander";
  const positionX = aGauche ? "left-4 lg:left-6" : "right-4 lg:right-6";

  return (
    <div className={"fixed z-50 bottom-6 " + positionX}>
      <div className="relative">
        {texte && (
          <p className={"absolute bottom-full mb-3 whitespace-nowrap bg-card border border-line rounded-xl px-3 py-2 text-sm font-bold shadow-lg " + (aGauche ? "-left-2 lg:left-0" : "-right-2 lg:right-0")}>
            {texte}
            {/* Queue de la bulle pointant vers le visage du personnage */}
            <span
              aria-hidden
              className={"absolute -bottom-[7px] w-3 h-3 bg-card border-b border-r border-line rotate-45 " + (aGauche ? "left-10" : "right-10")}
            />
          </p>
        )}
        <Link
          href="/assistant"
          aria-label={"Ouvrir l'" + apparence.nom}
          className="block w-16 h-16 lg:w-24 lg:h-24 hover:scale-105 transition-all"
        >
          <Image
            src={apparence.imageFlottante}
            alt=""
            width={192}
            height={144}
            className="w-full h-auto object-contain drop-shadow-lg"
          />
        </Link>
      </div>
    </div>
  );
}
