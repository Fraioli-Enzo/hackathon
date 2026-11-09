"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon, addIcon } from "@iconify/react";
import { phCaretLeftBold, phCaretRightBold } from "@/lib/icons";
import ImageProduit from "@/components/ImageProduit";
import AdminNav from "@/components/AdminNav";
import BoutonRafraichir from "@/components/BoutonRafraichir";
import { dernierJour } from "@/lib/week";
import type { Recap } from "@/lib/types";

addIcon("ph:caret-left-bold", phCaretLeftBold);
addIcon("ph:caret-right-bold", phCaretRightBold);

export default function AdminDashboard() {
  const [recap, setRecap] = useState<Recap | null>(null);
  const [semaine, setSemaine] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const r = await fetch(`/api/admin/recap?semaine=${semaine}`);
      if (!r.ok) throw new Error("Erreur de chargement");
      setRecap(await r.json());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur de chargement");
    }
  }, [semaine]);

  useEffect(() => {
    charger();
  }, [charger]);

  if (erreur) {
    return (
      <div className="space-y-4">
        <p className="text-red-500">{erreur}</p>
        <BoutonRafraichir onClick={charger} label="Réessayer" />
      </div>
    );
  }
  if (!recap) return <p className="text-muted">Chargement…</p>;

  const debut = new Date(recap.debut).toLocaleDateString("fr-FR");
  const fin = dernierJour(recap.fin).toLocaleDateString("fr-FR");
  const relatif =
    semaine === 0 ? "Cette semaine" : semaine > 0 ? `Dans ${semaine} semaine${semaine > 1 ? "s" : ""}` : `Il y a ${-semaine} semaine${semaine < -1 ? "s" : ""}`;

  return (
    <div>
      <AdminNav />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h1 className="text-3xl font-black">Panier de la semaine</h1>
        <BoutonRafraichir onClick={charger} />
      </div>

      <div className="mb-6 space-y-2">
        <div className="flex items-stretch gap-2 max-sm:hidden">
          <button
            onClick={() => setSemaine((s) => s - 1)}
            aria-label="Semaine précédente"
            className="border border-line rounded-lg px-3 bg-card hover:border-cesi-jaune transition-colors"
          >
            <Icon icon="ph:caret-left-bold" ssr className="w-5 h-5" />
          </button>
          <p className="flex-1 text-center text-muted font-semibold self-center">
            {relatif} : du {debut} au {fin}
          </p>
          <button
            onClick={() => setSemaine((s) => s + 1)}
            aria-label="Semaine suivante"
            className="border border-line rounded-lg px-3 bg-card hover:border-cesi-jaune transition-colors"
          >
            <Icon icon="ph:caret-right-bold" ssr className="w-5 h-5" />
          </button>
          {semaine !== 0 && (
            <button
              onClick={() => setSemaine(0)}
              className="text-sm px-3 rounded-lg border border-line bg-card hover:border-cesi-jaune transition-colors"
            >
              Aujourd&apos;hui
            </button>
          )}
        </div>

        {/* Mobile : barre tactile pleine largeur, tap targets de 44px */}
        <div className="sm:hidden grid grid-cols-[44px_1fr_44px] gap-2">
          <button
            onClick={() => setSemaine((s) => s - 1)}
            aria-label="Semaine précédente"
            className="h-11 flex items-center justify-center border border-line rounded-lg bg-card active:bg-surface transition-colors"
          >
            <Icon icon="ph:caret-left-bold" ssr className="w-6 h-6" />
          </button>
          <div className="h-11 flex flex-col items-center justify-center min-w-0">
            <p className="font-bold text-sm leading-tight truncate">{relatif}</p>
            <p className="text-muted text-xs leading-tight truncate">du {debut} au {fin}</p>
          </div>
          <button
            onClick={() => setSemaine((s) => s + 1)}
            aria-label="Semaine suivante"
            className="h-11 flex items-center justify-center border border-line rounded-lg bg-card active:bg-surface transition-colors"
          >
            <Icon icon="ph:caret-right-bold" ssr className="w-6 h-6" />
          </button>
        </div>
        {semaine !== 0 && (
          <button
            onClick={() => setSemaine(0)}
            className="sm:hidden w-full h-11 rounded-lg border border-line bg-card font-bold text-sm active:bg-surface transition-colors"
          >
            Revenir à aujourd&apos;hui
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <div className="border border-line rounded-xl bg-card p-4">
          <p className="text-sm text-muted">Commandes</p>
          <p className="text-3xl font-black text-cesi-jaune">{recap.nbCommandes}</p>
        </div>
        <div className="border border-line rounded-xl bg-card p-4">
          <p className="text-sm text-muted">CA de la semaine</p>
          <p className="text-3xl font-black">{recap.ca.toFixed(2)} €</p>
        </div>
        <div className="border border-line rounded-xl bg-card p-4">
          <p className="text-sm text-muted">En attente</p>
          <p className="text-3xl font-black">{recap.enAttente}</p>
        </div>
        <div className="border border-line rounded-xl bg-card p-4">
          <p className="text-sm text-muted">Récupérées</p>
          <p className="text-3xl font-black">{recap.recuperees}</p>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-3">Stock restant</h2>
      {recap.stockRestant?.length ? (
        <div className="border border-line rounded-xl overflow-hidden max-sm:border-0 max-sm:rounded-none">
          <table className="w-full text-left bg-card max-sm:block max-sm:bg-transparent">
            <thead className="border-b border-line text-muted text-sm max-sm:hidden">
              <tr>
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3 text-right">Stock</th>
              </tr>
            </thead>
            <tbody className="max-sm:block">
              {recap.stockRestant.map((p) => (
                <tr key={p.nom} className="max-sm:flex max-sm:items-center max-sm:gap-3 max-sm:mb-3 max-sm:rounded-xl max-sm:border max-sm:border-line max-sm:bg-card max-sm:p-4 sm:border-b sm:border-line sm:last:border-0">
                  <td data-label="Produit" className="px-4 py-3 font-semibold max-sm:flex-1 max-sm:flex max-sm:items-center max-sm:gap-3 max-sm:py-0 max-sm:before:hidden">
                    <div className="flex items-center gap-3">
                      <ImageProduit src={p.image} alt={p.nom} className="w-10 h-10" width={60} height={60} />
                      {p.nom}
                    </div>
                  </td>
                  <td data-label="Stock" className="px-4 py-3 text-right font-bold max-sm:py-0 max-sm:text-right max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted max-sm:before:mr-2">
                    {p.stock === 0 ? (
                      <span className="text-red-500">Rupture</span>
                    ) : p.stock <= 10 ? (
                      <span className="text-orange-500">{p.stock}</span>
                    ) : (
                      p.stock
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted">Aucun produit actif.</p>
      )}
    </div>
  );
}
