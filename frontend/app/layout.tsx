import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";
import BoutonAgent from "@/components/BoutonAgent";
import EasterEggDuong from "@/components/EasterEggDuong";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cafet CESI - Commandes",
  description: "Commande ta nourriture pour la cafet du CESI : banh bao, nems, mochis.",
};

const SCRIPT_THEME = `try{if(localStorage.getItem("cafet-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

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
            <Link href="/" className="flex items-center gap-2 text-xl font-black tracking-tight">
              <Image src="/images/logo-cesi-jaune.png" alt="" width={32} height={32} className="logo-sombre w-8 h-8" />
              <Image src="/images/logo-cesi-noir.png" alt="" width={32} height={32} className="logo-clair w-8 h-8" />
              <span className="hidden sm:inline">
                <span className="text-cesi-jaune">CAFET</span> CESI
              </span>
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
        <footer className="border-t border-line py-4">
          <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col items-center gap-2">
            <p className="text-xs text-muted">Hackathon CESI - paiement sur place (espèces ou carte)</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-sm text-muted">
                Suivre la traiteuse sur Facebook :{" "}
                <a
                  href="https://www.facebook.com/share/1C9eBVTcJK/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-cesi-jaune hover:underline"
                >
                  Cuisine Vietnamienne Chez Kim
                </a>
              </p>
              <EasterEggDuong />
            </div>
            <Link href="/">
              <Image src="/images/logo-cesi-jaune.png" alt="CESI" width={200} height={200} className="logo-sombre w-48 h-48" />
              <Image src="/images/logo-cesi-noir.png" alt="CESI" width={200} height={200} className="logo-clair w-48 h-48" />
            </Link>
          </div>
        </footer>
        <BoutonAgent />
      </body>
    </html>
  );
}
