import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cafet CESI - Commandes",
  description: "Commande ta nourriture pour la cafet du CESI : banh bao, nems, mochis.",
};

const SCRIPT_THEME = `try{if(localStorage.getItem("cafet-theme")==="light")document.documentElement.classList.add("light")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Applique le thème avant le premier rendu pour éviter le flash */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_THEME }} />
      </head>
      <body className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="text-xl font-black tracking-tight">
              <span className="text-cesi-jaune">CAFET</span> CESI
            </Link>
            <nav className="flex items-center gap-5 text-sm font-medium">
              <Link href="/" className="hover:text-cesi-jaune transition-colors">Accueil</Link>
              <Link href="/commander" className="hover:text-cesi-jaune transition-colors">Commander</Link>
              <Link href="/admin" className="hover:text-cesi-jaune transition-colors">Admin</Link>
              <ThemeToggle />
            </nav>
          </div>
        </header>
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">{children}</main>
        <footer className="border-t border-line py-4 text-center text-xs text-muted">
          Hackathon CESI - paiement sur place (espèces / Lydia)
        </footer>
      </body>
    </html>
  );
}
