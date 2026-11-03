"use client";

import { useEffect } from "react";
import { Icon, addIcon } from "@iconify/react";
import { phTrashBold } from "@/lib/icons";

addIcon("ph:trash-bold", phTrashBold);

export default function PopupConfirmation({
  titre,
  message,
  libelleConfirmer = "Supprimer",
  onConfirmer,
  onAnnuler,
}: {
  titre: string;
  message: string;
  libelleConfirmer?: string;
  onConfirmer: () => void;
  onAnnuler: () => void;
}) {
  useEffect(() => {
    function echapper(e: KeyboardEvent) {
      if (e.key === "Escape") onAnnuler();
    }
    window.addEventListener("keydown", echapper);
    return () => window.removeEventListener("keydown", echapper);
  }, [onAnnuler]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={titre}
      onClick={onAnnuler}
    >
      <div
        className="bg-card border border-line rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500 flex items-center justify-center shrink-0">
            <Icon icon="ph:trash-bold" ssr className="w-6 h-6 text-red-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black">{titre}</h3>
            <p className="text-muted text-sm">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onAnnuler}
            className="border border-line font-bold px-4 py-2 rounded-lg hover:border-cesi-jaune transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirmer}
            className="bg-red-500 text-white font-bold px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
          >
            {libelleConfirmer}
          </button>
        </div>
      </div>
    </div>
  );
}
