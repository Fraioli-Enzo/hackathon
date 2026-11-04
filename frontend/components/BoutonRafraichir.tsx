"use client";

import { Icon, addIcon } from "@iconify/react";
import { phArrowClockwiseBold } from "@/lib/icons";

addIcon("ph:arrow-clockwise-bold", phArrowClockwiseBold);

export default function BoutonRafraichir({
  onClick,
  label = "Rafraîchir",
  className = "",
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 border border-line font-bold px-4 py-2 rounded-lg hover:border-cesi-jaune transition-colors ${className}`}
    >
      <Icon icon="ph:arrow-clockwise-bold" ssr aria-hidden="true" className="w-4 h-4" />
      {label}
    </button>
  );
}
