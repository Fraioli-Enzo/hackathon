"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, addIcon } from "@iconify/react";
import {
  phSquaresFourBold,
  phForkKnifeBold,
  phPackageBold,
  phReceiptBold,
  phSignOutBold,
  phUsersBold,
  phListBold,
  phXBold,
} from "@/lib/icons";

addIcon("ph:squares-four-bold", phSquaresFourBold);
addIcon("ph:fork-knife-bold", phForkKnifeBold);
addIcon("ph:package-bold", phPackageBold);
addIcon("ph:receipt-bold", phReceiptBold);
addIcon("ph:sign-out-bold", phSignOutBold);
addIcon("ph:users-bold", phUsersBold);
addIcon("ph:list-bold", phListBold);
addIcon("ph:x-bold", phXBold);

const LIENS = [
  { href: "/admin", label: "Dashboard", icone: "ph:squares-four-bold" },
  { href: "/admin/produits", label: "Produits", icone: "ph:fork-knife-bold" },
  { href: "/admin/stock", label: "Stock", icone: "ph:package-bold" },
  { href: "/admin/commandes", label: "Commandes", icone: "ph:receipt-bold" },
  { href: "/admin/comptes", label: "Comptes", icone: "ph:users-bold" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);

  // ferme le menu burger au changement de page
  useEffect(() => {
    setOuvert(false);
  }, [pathname]);

  const lienActif = LIENS.find((l) => l.href === pathname);

  async function deconnexion() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="relative mb-8 border-b border-line pb-4">
      {/* Barre mobile : burger + page active + déconnexion */}
      <div className="flex items-center justify-between gap-2 lg:hidden">
        <button
          onClick={() => setOuvert((o) => !o)}
          className="inline-flex items-center gap-2 border border-line px-3 py-1.5 rounded-lg font-bold text-sm transition-colors hover:border-cesi-jaune"
          aria-expanded={ouvert}
          aria-label="Menu de navigation"
        >
          <Icon icon={ouvert ? "ph:x-bold" : "ph:list-bold"} ssr className="w-5 h-5" />
          {lienActif && <span>{lienActif.label}</span>}
        </button>
        <button
          onClick={deconnexion}
          className="inline-flex items-center gap-1.5 text-sm border border-line px-3 py-1.5 rounded-lg hover:border-red-500 hover:text-red-500 transition-colors"
        >
          <Icon icon="ph:sign-out-bold" ssr className="w-4 h-4" />
          <span>Déconnexion</span>
        </button>
      </div>

      {/* Panneau burger mobile */}
      {ouvert && (
        <nav className="lg:hidden absolute top-full left-0 right-0 z-40 mt-2 flex flex-col gap-2 bg-surface border border-line rounded-xl p-3 shadow-xl" aria-label="Navigation admin">
          {LIENS.map((l) => {
            const actif = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={actif ? "page" : undefined}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                  actif
                    ? "bg-cesi-jaune text-black"
                    : "border border-line hover:border-cesi-jaune hover:text-cesi-jaune"
                }`}
              >
                <Icon icon={l.icone} ssr className="w-4 h-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
      )}

      {/* Barre desktop */}
      <div className="hidden lg:flex items-center justify-between gap-2">
        <nav className="flex flex-wrap gap-1.5" aria-label="Navigation admin">
          {LIENS.map((l) => {
            const actif = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={actif ? "page" : undefined}
                aria-label={l.label}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                  actif
                    ? "bg-cesi-jaune text-black"
                    : "border border-line hover:border-cesi-jaune hover:text-cesi-jaune"
                }`}
              >
                <Icon icon={l.icone} ssr className="w-4 h-4" />
                <span>{l.label}</span>
              </Link>
            );
          })}
        </nav>
        <button
          onClick={deconnexion}
          className="inline-flex items-center gap-1.5 text-sm border border-line px-3 py-1.5 rounded-lg hover:border-red-500 hover:text-red-500 transition-colors"
        >
          <Icon icon="ph:sign-out-bold" ssr className="w-4 h-4" />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );
}
