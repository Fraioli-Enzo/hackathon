"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, addIcon } from "@iconify/react";
import {
  phSquaresFourBold,
  phForkKnifeBold,
  phPackageBold,
  phReceiptBold,
  phQrCodeBold,
  phSignOutBold,
} from "@/lib/icons";

addIcon("ph:squares-four-bold", phSquaresFourBold);
addIcon("ph:fork-knife-bold", phForkKnifeBold);
addIcon("ph:package-bold", phPackageBold);
addIcon("ph:receipt-bold", phReceiptBold);
addIcon("ph:qr-code-bold", phQrCodeBold);
addIcon("ph:sign-out-bold", phSignOutBold);

const LIENS = [
  { href: "/admin", label: "Dashboard", icone: "ph:squares-four-bold" },
  { href: "/admin/produits", label: "Produits", icone: "ph:fork-knife-bold" },
  { href: "/admin/stock", label: "Stock", icone: "ph:package-bold" },
  { href: "/admin/commandes", label: "Commandes", icone: "ph:receipt-bold" },
  { href: "/admin/scan", label: "Scan QR", icone: "ph:qr-code-bold" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function deconnexion() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-8 border-b border-line pb-4">
      <nav className="flex flex-wrap gap-1.5 sm:gap-2" aria-label="Navigation admin">
        {LIENS.map((l) => {
          const actif = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={actif ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                actif
                  ? "bg-cesi-jaune text-black"
                  : "border border-line hover:border-cesi-jaune hover:text-cesi-jaune"
              }`}
              aria-label={l.label}
            >
              <Icon icon={l.icone} ssr className="w-4 h-4" />
              <span className={actif ? "" : "hidden sm:inline"}>{l.label}</span>
            </Link>
          );
        })}
      </nav>
      <button
        onClick={deconnexion}
        className="inline-flex items-center gap-1.5 text-sm border border-line px-2.5 sm:px-3 py-1.5 rounded-lg hover:border-red-500 hover:text-red-500 transition-colors"
      >
        <Icon icon="ph:sign-out-bold" ssr className="w-4 h-4" />
        <span className="hidden sm:inline">Déconnexion</span>
      </button>
    </div>
  );
}
