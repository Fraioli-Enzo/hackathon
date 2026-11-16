"use client";

import { Icon, addIcon } from "@iconify/react";
import { phCaretLeftBold, phCaretRightBold } from "@/lib/icons";
import { getWeekRange, dernierJour } from "@/lib/week";

addIcon("ph:caret-left-bold", phCaretLeftBold);
addIcon("ph:caret-right-bold", phCaretRightBold);

export default function SelecteurSemaine({ semaine, onChange }: { semaine: number; onChange: (s: number) => void }) {
  const { start, end } = getWeekRange(new Date(), semaine);
  const debut = start.toLocaleDateString("fr-FR");
  const fin = dernierJour(end).toLocaleDateString("fr-FR");
  const relatif =
    semaine === 0 ? "Cette semaine" : semaine > 0 ? `Dans ${semaine} semaine${semaine > 1 ? "s" : ""}` : `Il y a ${-semaine} semaine${semaine < -1 ? "s" : ""}`;

  return (
    <div className="space-y-2">
      <div className="flex items-stretch gap-2 max-sm:hidden">
        <button
          onClick={() => onChange(semaine - 1)}
          aria-label="Semaine précédente"
          className="border border-line rounded-lg px-3 bg-card hover:border-cesi-jaune transition-colors"
        >
          <Icon icon="ph:caret-left-bold" ssr className="w-5 h-5" />
        </button>
        <p className="flex-1 text-center text-muted font-semibold self-center">
          {relatif} : du {debut} au {fin}
        </p>
        <button
          onClick={() => onChange(semaine + 1)}
          aria-label="Semaine suivante"
          className="border border-line rounded-lg px-3 bg-card hover:border-cesi-jaune transition-colors"
        >
          <Icon icon="ph:caret-right-bold" ssr className="w-5 h-5" />
        </button>
        {semaine !== 0 && (
          <button
            onClick={() => onChange(0)}
            className="text-sm px-3 rounded-lg border border-line bg-card hover:border-cesi-jaune transition-colors"
          >
            Aujourd&apos;hui
          </button>
        )}
      </div>

      {/* Mobile : barre tactile pleine largeur, tap targets de 44px */}
      <div className="sm:hidden grid grid-cols-[44px_1fr_44px] gap-2">
        <button
          onClick={() => onChange(semaine - 1)}
          aria-label="Semaine précédente"
          className="h-11 flex items-center justify-center border border-line rounded-lg bg-card active:bg-surface transition-colors"
        >
          <Icon icon="ph:caret-left-bold" ssr className="w-6 h-6" />
        </button>
        <div className="h-11 flex flex-col items-center justify-center min-w-0">
          <p className="font-bold text-sm leading-tight truncate">{relatif}</p>
          <p className="text-muted text-xs leading-tight truncate">du {debut} au {fin}</p>
        </div>
        <button
          onClick={() => onChange(semaine + 1)}
          aria-label="Semaine suivante"
          className="h-11 flex items-center justify-center border border-line rounded-lg bg-card active:bg-surface transition-colors"
        >
          <Icon icon="ph:caret-right-bold" ssr className="w-6 h-6" />
        </button>
      </div>
      {semaine !== 0 && (
        <button
          onClick={() => onChange(0)}
          className="sm:hidden w-full h-11 rounded-lg border border-line bg-card font-bold text-sm active:bg-surface transition-colors"
        >
          Revenir à aujourd&apos;hui
        </button>
      )}
    </div>
  );
}
