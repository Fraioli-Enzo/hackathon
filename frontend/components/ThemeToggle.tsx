"use client";

import { useEffect, useState } from "react";
import { Icon, addIcon } from "@iconify/react";
import { phSunBold, phMoonBold } from "@/lib/icons";

// Icônes enregistrées localement : aucun appel réseau vers l'API Iconify
addIcon("ph:sun-bold", phSunBold);
addIcon("ph:moon-bold", phMoonBold);

export default function ThemeToggle() {
  const [sombre, setSombre] = useState(false);

  useEffect(() => {
    setSombre(document.documentElement.classList.contains("dark"));
  }, []);

  function basculer() {
    const actif = document.documentElement.classList.toggle("dark");
    setSombre(actif);
    localStorage.setItem("cafet-theme", actif ? "dark" : "light");
  }

  return (
    <button
      onClick={basculer}
      aria-label={sombre ? "Passer en thème clair" : "Passer en thème sombre"}
      title={sombre ? "Passer en thème clair" : "Passer en thème sombre"}
      className="text-sm border border-line px-3 py-1 rounded-lg hover:border-cesi-jaune transition-colors"
    >
      <Icon icon={sombre ? "ph:sun-bold" : "ph:moon-bold"} ssr className="w-4 h-4" />
    </button>
  );
}
