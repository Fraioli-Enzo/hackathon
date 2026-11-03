"use client";

import { useEffect } from "react";

export default function Popup({
  titre,
  onFermer,
  children,
}: {
  titre: string;
  onFermer: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function echapper(e: KeyboardEvent) {
      if (e.key === "Escape") onFermer();
    }
    window.addEventListener("keydown", echapper);
    return () => window.removeEventListener("keydown", echapper);
  }, [onFermer]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={titre}
      onClick={onFermer}
    >
      <div
        className="bg-card border border-line rounded-t-2xl sm:rounded-2xl p-6 max-sm:px-4 max-sm:pb-8 max-sm:max-h-[85vh] max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-black mb-4">{titre}</h3>
        {children}
      </div>
    </div>
  );
}
