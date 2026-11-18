"use client";

import { useEffect, useState } from "react";
import { Icon, addIcon } from "@iconify/react";
import { phArrowClockwiseBold } from "@/lib/icons";

addIcon("ph:arrow-clockwise-bold", phArrowClockwiseBold);

// Enregistre le service worker (production uniquement) et affiche un bouton
// "Mettre a jour" quand un nouveau deploiement est detecte.
export default function MiseAJour() {
  const [swEnAttente, setSwEnAttente] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let reg: ServiceWorkerRegistration;
    navigator.serviceWorker.register("/sw.js").then((r) => {
      reg = r;
      if (r.waiting) setSwEnAttente(r.waiting);
      r.addEventListener("updatefound", () => {
        const sw = r.installing;
        sw?.addEventListener("statechange", () => {
          // "installed" + un SW actif = nouvelle version prete, en attente du feu vert
          if (sw.state === "installed" && navigator.serviceWorker.controller) setSwEnAttente(sw);
        });
      });
      const verifier = () => r.update();
      const timer = setInterval(verifier, 60 * 60 * 1000); // toutes les heures
      window.addEventListener("focus", verifier);
      return () => {
        clearInterval(timer);
        window.removeEventListener("focus", verifier);
      };
    });

    // quand le nouveau SW prend le controle apres SKIP_WAITING, on recharge
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload());
  }, []);

  if (!swEnAttente) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card border border-line rounded-xl px-4 py-3 shadow-lg">
      <span className="text-sm text-content">Nouvelle version disponible</span>
      <button
        type="button"
        onClick={() => swEnAttente.postMessage("SKIP_WAITING")}
        className="inline-flex items-center gap-1.5 border border-cesi-jaune text-sm font-bold px-3 py-1.5 rounded-lg hover:bg-cesi-jaune hover:text-black transition-colors"
      >
        <Icon icon="ph:arrow-clockwise-bold" ssr aria-hidden="true" className="w-4 h-4" />
        Mettre à jour
      </button>
    </div>
  );
}
