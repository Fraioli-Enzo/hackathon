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
        <BoutonRafraichir onClick={charger} className="max-sm:flex-1 max-sm:justify-center" />
      </div>

      <div className="mb-6">
        <SelecteurSemaine semaine={semaine} onChange={setSemaine} />
      </div>

      {/* Résumé : 2x2 sur mobile, bénéfice mis en avant */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <div className="border border-line rounded-xl bg-card p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted">Commandes</p>
          <p className="text-2xl sm:text-3xl font-black text-cesi-jaune">{stats.nbCommandes}</p>
        </div>
        <div className="border border-line rounded-xl bg-card p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted">Chiffre d&apos;affaire</p>
          <p className="text-2xl sm:text-3xl font-black">{stats.ca.toFixed(2)} €</p>
        </div>
        <div className="border border-line rounded-xl bg-card p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted">Coût matière</p>
          <p className="text-2xl sm:text-3xl font-black">{stats.cout.toFixed(2)} €</p>
        </div>
        <div className="border border-cesi-jaune rounded-xl bg-card p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted">Bénéfice</p>
          <p className={`text-2xl sm:text-3xl font-black ${stats.benefice >= 0 ? "text-green-600" : "text-red-500"}`}>
            {stats.benefice.toFixed(2)} €
          </p>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-3">Marge par produit</h2>
      {stats.produits.length ? (
        <>
          {/* Mobile : une carte par produit, marge en évidence */}
          <div className="sm:hidden">
            {stats.produits.map((p) => (
              <div key={p.nom} className="mb-3 rounded-xl border border-line bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold leading-snug">{p.nom}</p>
                  <p className={`shrink-0 text-lg font-black ${p.marge >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {p.marge.toFixed(2)} €
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted">
                  ×{p.qte} · CA {p.ca.toFixed(2)} € · Coût {p.cout.toFixed(2)} €
                </p>
              </div>
            ))}
          </div>

          {/* Desktop : tableau */}
          <div className="max-sm:hidden border border-line rounded-xl overflow-hidden">
            <table className="w-full text-left bg-card">
              <thead className="border-b border-line text-muted text-sm">
                <tr>
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3 text-right">Quantité</th>
                  <th className="px-4 py-3 text-right">CA</th>
                  <th className="px-4 py-3 text-right">Coût</th>
                  <th className="px-4 py-3 text-right">Marge</th>
                </tr>
              </thead>
              <tbody>
                {stats.produits.map((p) => (
                  <tr key={p.nom} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-semibold">{p.nom}</td>
                    <td className="px-4 py-3 text-right">{p.qte}</td>
                    <td className="px-4 py-3 text-right">{p.ca.toFixed(2)} €</td>
                    <td className="px-4 py-3 text-right">{p.cout.toFixed(2)} €</td>
                    <td className={`px-4 py-3 text-right font-bold ${p.marge >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {p.marge.toFixed(2)} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-muted">Aucune commande cette semaine.</p>
      )}

      <h2 className="text-xl font-bold mt-8 mb-1">Seul ou en menu</h2>
      <p className="text-xs text-muted mb-3">Part en jaune : vendus en menu</p>
      {stats.ventes.length ? (
        <>
          {/* Mobile : carte avec barre de répartition */}
          <div className="sm:hidden">
            {stats.ventes.map((v) => {
              const total = v.seul + v.enMenu;
              const partMenu = total ? (v.enMenu / total) * 100 : 0;
              return (
                <div key={v.nom} className="mb-3 rounded-xl border border-line bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{v.nom}</p>
                    <p className="shrink-0 font-bold">{total}</p>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-line overflow-hidden" aria-hidden="true">
                    <div className="h-full bg-cesi-jaune" style={{ width: `${partMenu}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-muted">
                    Seul{" "}
                    <span className={v.seul >= v.enMenu ? "font-bold text-content" : ""}>{v.seul}</span>
                    {" · "}En menu{" "}
                    <span className={v.enMenu > v.seul ? "font-bold text-content" : ""}>{v.enMenu}</span>
                  </p>
                </div>
              );
            })}
          </div>

          {/* Desktop : tableau avec barre de répartition */}
          <div className="max-sm:hidden border border-line rounded-xl overflow-hidden">
            <table className="w-full text-left bg-card">
              <thead className="border-b border-line text-muted text-sm">
                <tr>
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3 text-right">Seul</th>
                  <th className="px-4 py-3 text-right">En menu</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.ventes.map((v) => {
                  const total = v.seul + v.enMenu;
                  const partMenu = total ? (v.enMenu / total) * 100 : 0;
                  return (
                    <tr key={v.nom} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-semibold">{v.nom}</p>
                        <div className="mt-1.5 h-1.5 w-28 rounded-full bg-line overflow-hidden" aria-hidden="true">
                          <div className="h-full bg-cesi-jaune" style={{ width: `${partMenu}%` }} />
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-right ${v.seul >= v.enMenu ? "font-black" : "text-muted"}`}>
                        {v.seul}
                      </td>
                      <td className={`px-4 py-3 text-right ${v.enMenu > v.seul ? "font-black" : "text-muted"}`}>
                        {v.enMenu}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-muted">Aucune vente cette semaine.</p>
      )}
    </div>
  );
}
