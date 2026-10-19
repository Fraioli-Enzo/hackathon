"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import type { Recap } from "@/lib/types";

export default function AdminDashboard() {
  const [recap, setRecap] = useState<Recap | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/recap")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Erreur de chargement"))))
      .then(setRecap)
      .catch((e) => setErreur(e.message));
  }, []);

  if (erreur) return <p className="text-red-400">{erreur}</p>;
  if (!recap) return <p className="text-neutral-400">Chargement…</p>;

  const debut = new Date(recap.debut).toLocaleDateString("fr-FR");
  const fin = new Date(recap.fin).toLocaleDateString("fr-FR");

  return (
    <div>
      <AdminNav />
      <h1 className="text-3xl font-black mb-2">Panier de la semaine</h1>
      <p className="text-neutral-400 mb-6">
        Semaine du {debut} au {fin}
      </p>

      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <div className="border border-neutral-800 rounded-xl bg-neutral-900 p-4">
          <p className="text-sm text-neutral-400">Commandes</p>
          <p className="text-3xl font-black text-cesi-jaune">{recap.nbCommandes}</p>
        </div>
        <div className="border border-neutral-800 rounded-xl bg-neutral-900 p-4">
          <p className="text-sm text-neutral-400">CA de la semaine</p>
          <p className="text-3xl font-black">{recap.ca.toFixed(2)} €</p>
        </div>
        <div className="border border-neutral-800 rounded-xl bg-neutral-900 p-4">
          <p className="text-sm text-neutral-400">En attente</p>
          <p className="text-3xl font-black">{recap.enAttente}</p>
        </div>
        <div className="border border-neutral-800 rounded-xl bg-neutral-900 p-4">
          <p className="text-sm text-neutral-400">Récupérées</p>
          <p className="text-3xl font-black">{recap.recuperees}</p>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-3">À acheter</h2>
      {recap.produits.length === 0 ? (
        <p className="text-neutral-400">Aucune commande cette semaine.</p>
      ) : (
        <div className="border border-neutral-800 rounded-xl overflow-hidden">
          <table className="w-full text-left bg-neutral-900">
            <thead className="border-b border-neutral-800 text-neutral-400 text-sm">
              <tr>
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3 text-right">Quantité</th>
                <th className="px-4 py-3 text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              {recap.produits.map((p) => (
                <tr key={p.nom} className="border-b border-neutral-800 last:border-0">
                  <td className="px-4 py-3 font-semibold">{p.nom}</td>
                  <td className="px-4 py-3 text-right font-black text-cesi-jaune">{p.qte}</td>
                  <td className="px-4 py-3 text-right">{p.total.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
