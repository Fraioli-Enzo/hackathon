"use client";

import { useEffect, useState } from "react";
import { Icon, addIcon } from "@iconify/react";
import { phSunBold, phMoonBold } from "@/lib/icons";

// Icônes enregistrées localement : aucun appel réseau vers l'API Iconify
addIcon("ph:sun-bold", phSunBold);
addIcon("ph:moon-bold", phMoonBold);

export default function ThemeToggle() {
  const [clair, setClair] = useState(false);

  useEffect(() => {
    setClair(document.documentElement.classList.contains("light"));
  }, []);

  function basculer() {
    const actif = document.documentElement.classList.toggle("light");
    setClair(actif);
    localStorage.setItem("cafet-theme", actif ? "light" : "dark");
  }

  return (
    <button
      onClick={basculer}
      aria-label={clair ? "Passer en thème sombre" : "Passer en thème clair"}
      title={clair ? "Passer en thème sombre" : "Passer en thème clair"}
      className="text-sm border border-line px-3 py-1 rounded-lg hover:border-cesi-jaune transition-colors"
    >
      <Icon icon={clair ? "ph:moon-bold" : "ph:sun-bold"} className="w-4 h-4" />
    </button>
  );
}
