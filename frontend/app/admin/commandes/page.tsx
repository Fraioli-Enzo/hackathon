"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import type { CommandeClient } from "@/lib/types";

function commandeFiltrees(commandes: CommandeClient[], recherche: string) {
  const q = recherche.trim().toLowerCase();
  if (!q) return commandes;
  return commandes.filter((c) => `${c.prenom} ${c.nom}`.toLowerCase().includes(q));
}

export default function AdminCommandesPage() {
  const [commandes, setCommandes] = useState<CommandeClient[]>([]);
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    fetch("/api/commandes")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Erreur de chargement"))))
      .then((d) => setCommandes(d.commandes || []))
      .catch(() => setCommandes([]));
  }, []);

  const filtrees = commandeFiltrees(commandes, recherche);

  return (
    <div>
      <AdminNav />
      <h1 className="text-3xl font-black mb-6">Commandes de la semaine</h1>

      <input
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher par nom…"
        className="w-full sm:w-72 bg-card border border-line rounded-lg px-3 py-2 mb-6 focus:border-cesi-jaune focus:outline-none"
      />

      {filtrees.length === 0 ? (
        <p className="text-muted">Aucune commande trouvée.</p>
      ) : (
        <div className="border border-line rounded-xl overflow-x-auto max-sm:border-0 max-sm:rounded-none max-sm:overflow-visible">
          <table className="w-full text-left bg-card text-sm max-sm:block max-sm:bg-transparent">
            <thead className="border-b border-line text-muted max-sm:hidden">
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
              {filtrees.map((c) => (
                <tr key={c._id} className="max-sm:block max-sm:mb-3 max-sm:rounded-xl max-sm:border max-sm:border-line max-sm:bg-card max-sm:p-4 sm:border-b sm:border-line sm:last:border-0">
                  <td data-label="Date" className="px-3 py-3 whitespace-nowrap max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-3 max-sm:py-1.5 max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted">
                    {new Date(c.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td data-label="Élève" className="px-3 py-3 max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-3 max-sm:py-1.5 max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted">
                    <p className="font-semibold">
                      {c.prenom} {c.nom}
                    </p>

                  </td>
                  <td data-label="Bâtiment" className="px-3 py-3 max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-3 max-sm:py-1.5 max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted">{c.batiment}</td>
                  <td data-label="Commande" className="px-3 py-3 max-sm:flex max-sm:flex-col max-sm:items-start max-sm:gap-3 max-sm:py-1.5 max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted">
                    <ul className="space-y-1.5">
                      {c.items.map((i, idx) => {
                        const sep = i.nom.indexOf(" (");
                        const nom = sep > 0 ? i.nom.slice(0, sep) : i.nom;
                        const detail = sep > 0 ? i.nom.slice(sep + 2, -1).split(" + ").join(" · ") : null;
                        return (
                          <li key={idx}>
                            <p><span className="font-bold">{i.qte}×</span> {nom}</p>
                            {detail && <p className="text-muted text-xs">{detail}</p>}
                          </li>
                        );
                      })}
                    </ul>
                  </td>
                  <td data-label="Total" className="px-3 py-3 text-right font-semibold max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-3 max-sm:py-1.5 max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted">{c.total.toFixed(2)} €</td>
                  <td data-label="Statut" className="px-3 py-3 max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-3 max-sm:py-1.5 max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted">
                    {c.statut === "recuperee" ? (
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-600">
                        Récupérée
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-600">
                        En attente
                      </span>
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
