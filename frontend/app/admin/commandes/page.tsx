"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import type { CommandeClient } from "@/lib/types";

export default function AdminCommandesPage() {
  const [commandes, setCommandes] = useState<CommandeClient[]>([]);
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    const url = recherche ? `/api/commandes?email=${encodeURIComponent(recherche)}` : "/api/commandes";
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Erreur de chargement"))))
      .then((d) => setCommandes(d.commandes || []))
      .catch(() => setCommandes([]));
  }, [recherche]);

  return (
    <div>
      <AdminNav />
      <h1 className="text-3xl font-black mb-6">Commandes de la semaine</h1>

      <input
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher par email…"
        className="w-full sm:w-72 bg-card border border-line rounded-lg px-3 py-2 mb-6 focus:border-cesi-jaune focus:outline-none"
      />

      {commandes.length === 0 ? (
        <p className="text-muted">Aucune commande trouvée.</p>
      ) : (
        <div className="border border-line rounded-xl overflow-x-auto">
          <table className="w-full text-left bg-card text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Élève</th>
                <th className="px-3 py-3">Bât.</th>
                <th className="px-3 py-3">Commande</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {commandes.map((c) => (
                <tr key={c._id} className="border-b border-line last:border-0">
                  <td className="px-3 py-3 whitespace-nowrap">
                    {new Date(c.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold">
                      {c.prenom} {c.nom}
                    </p>
                    <p className="text-muted">{c.email}</p>
                  </td>
                  <td className="px-3 py-3">{c.batiment}</td>
                  <td className="px-3 py-3">{c.items.map((i) => `${i.qte}×${i.nom}`).join(", ")}</td>
                  <td className="px-3 py-3 text-right font-semibold">{c.total.toFixed(2)} €</td>
                  <td className="px-3 py-3">
                    {c.statut === "recuperee" ? (
                      <span className="text-green-600 font-semibold">Récupérée</span>
                    ) : (
                      <span className="text-cesi-jaune font-semibold">En attente</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
