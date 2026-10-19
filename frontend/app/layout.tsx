import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cafet CESI — Commandes",
  description: "Commande ta nourriture pour la cafet du CESI : banh bao, nems, mochis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="text-xl font-black tracking-tight">
              <span className="text-cesi-jaune">CAFET</span> CESI
            </Link>
            <nav className="flex gap-5 text-sm font-medium">
              <Link href="/" className="hover:text-cesi-jaune transition-colors">Accueil</Link>
              <Link href="/commander" className="hover:text-cesi-jaune transition-colors">Commander</Link>
              <Link href="/admin" className="hover:text-cesi-jaune transition-colors">Admin</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">{children}</main>
        <footer className="border-t border-neutral-800 py-4 text-center text-xs text-neutral-500">
          Hackathon CESI — paiement sur place (espèces / Lydia)
        </footer>
      </body>
    </html>
  );
}
