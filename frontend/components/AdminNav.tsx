"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LIENS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/produits", label: "Produits" },
  { href: "/admin/commandes", label: "Commandes" },
  { href: "/admin/scan", label: "Scan QR" },
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
    <div className="flex flex-wrap items-center justify-between gap-3 mb-8 border-b border-line pb-4">
      <nav className="flex gap-4 text-sm font-medium">
        {LIENS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={pathname === l.href ? "text-cesi-jaune font-bold" : "hover:text-cesi-jaune transition-colors"}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <button onClick={deconnexion} className="text-sm border border-line px-3 py-1 rounded-lg hover:border-red-500 hover:text-red-500 transition-colors">
        Déconnexion
      </button>
    </div>
  );
}
