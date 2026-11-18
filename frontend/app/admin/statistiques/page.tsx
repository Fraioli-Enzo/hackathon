"use client";

import { useCallback, useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import BoutonRafraichir from "@/components/BoutonRafraichir";
import SelecteurSemaine from "@/components/SelecteurSemaine";
import type { Stats } from "@/lib/types";

export default function AdminStatistiques() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [semaine, setSemaine] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const r = await fetch(`/api/admin/stats?semaine=${semaine}`);
      if (!r.ok) throw new Error("Erreur de chargement");
      setStats(await r.json());
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
  if (!stats) return <p className="text-muted">Chargement…</p>;

  return (
    <div>
      <AdminNav />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h1 className="text-3xl font-black">Bénéfices de la semaine</h1>
        <BoutonRafraichir onClick={charger} />
      </div>

      <div className="mb-6">
        <SelecteurSemaine semaine={semaine} onChange={setSemaine} />
      </div>

      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <div className="border border-line rounded-xl bg-card p-4">
          <p className="text-sm text-muted">Commandes</p>
          <p className="text-3xl font-black text-cesi-jaune">{stats.nbCommandes}</p>
        </div>
        <div className="border border-line rounded-xl bg-card p-4">
          <p className="text-sm text-muted">Chiffre d&apos;affaire</p>
          <p className="text-3xl font-black">{stats.ca.toFixed(2)} €</p>
        </div>
        <div className="border border-line rounded-xl bg-card p-4">
          <p className="text-sm text-muted">Coût matière</p>
          <p className="text-3xl font-black">{stats.cout.toFixed(2)} €</p>
        </div>
        <div className="border border-line rounded-xl bg-card p-4">
          <p className="text-sm text-muted">Bénéfice</p>
          <p className={`text-3xl font-black ${stats.benefice >= 0 ? "text-green-600" : "text-red-500"}`}>
            {stats.benefice.toFixed(2)} €
          </p>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-3">Marge par produit</h2>
      {stats.produits.length ? (
        <div className="border border-line rounded-xl overflow-hidden max-sm:border-0 max-sm:rounded-none">
          <table className="w-full text-left bg-card max-sm:block max-sm:bg-transparent">
            <thead className="border-b border-line text-muted text-sm max-sm:hidden">
              <tr>
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3 text-right">Quantité</th>
                <th className="px-4 py-3 text-right">CA</th>
                <th className="px-4 py-3 text-right">Coût</th>
                <th className="px-4 py-3 text-right">Marge</th>
              </tr>
            </thead>
            <tbody className="max-sm:block">
              {stats.produits.map((p) => (
                <tr key={p.nom} className="max-sm:flex max-sm:items-center max-sm:gap-3 max-sm:mb-3 max-sm:rounded-xl max-sm:border max-sm:border-line max-sm:bg-card max-sm:p-4 sm:border-b sm:border-line sm:last:border-0">
                  <td data-label="Produit" className="px-4 py-3 font-semibold max-sm:flex-1 max-sm:py-0 max-sm:before:hidden">
                    {p.nom}
                  </td>
                  <td data-label="Quantité" className="px-4 py-3 text-right max-sm:w-16 max-sm:py-0 max-sm:text-right max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted max-sm:before:mr-2">
                    {p.qte}
                  </td>
                  <td data-label="CA" className="px-4 py-3 text-right max-sm:w-20 max-sm:py-0 max-sm:text-right max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted max-sm:before:mr-2">
                    {p.ca.toFixed(2)} €
                  </td>
                  <td data-label="Coût" className="px-4 py-3 text-right max-sm:w-20 max-sm:py-0 max-sm:text-right max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted max-sm:before:mr-2">
                    {p.cout.toFixed(2)} €
                  </td>
                  <td data-label="Marge" className={`px-4 py-3 text-right font-bold max-sm:w-20 max-sm:py-0 max-sm:text-right max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted max-sm:before:mr-2 ${p.marge >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {p.marge.toFixed(2)} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted">Aucune commande cette semaine.</p>
      )}

      <h2 className="text-xl font-bold mt-8 mb-3">Seul ou en menu</h2>
      {stats.ventes.length ? (
        <div className="border border-line rounded-xl overflow-hidden max-sm:border-0 max-sm:rounded-none">
          <table className="w-full text-left bg-card max-sm:block max-sm:bg-transparent">
            <thead className="border-b border-line text-muted text-sm max-sm:hidden">
              <tr>
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3 text-right">Seul</th>
                <th className="px-4 py-3 text-right">En menu</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="max-sm:block">
              {stats.ventes.map((v) => {
                const total = v.seul + v.enMenu;
                return (
                  <tr key={v.nom} className="max-sm:flex max-sm:items-center max-sm:gap-3 max-sm:mb-3 max-sm:rounded-xl max-sm:border max-sm:border-line max-sm:bg-card max-sm:p-4 sm:border-b sm:border-line sm:last:border-0">
                    <td data-label="Produit" className="px-4 py-3 font-semibold max-sm:flex-1 max-sm:py-0 max-sm:before:hidden">
                      {v.nom}
                    </td>
                    <td data-label="Seul" className={`px-4 py-3 text-right max-sm:w-16 max-sm:py-0 max-sm:text-right max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted max-sm:before:mr-2 ${v.seul >= v.enMenu ? "font-black" : "text-muted"}`}>
                      {v.seul}
                    </td>
                    <td data-label="En menu" className={`px-4 py-3 text-right max-sm:w-16 max-sm:py-0 max-sm:text-right max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted max-sm:before:mr-2 ${v.enMenu > v.seul ? "font-black" : "text-muted"}`}>
                      {v.enMenu}
                    </td>
                    <td data-label="Total" className="px-4 py-3 text-right font-bold max-sm:w-16 max-sm:py-0 max-sm:text-right max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted max-sm:before:mr-2">
                      {total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted">Aucune vente cette semaine.</p>
      )}
    </div>
  );
}
