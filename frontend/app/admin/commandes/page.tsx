"use client";

import { useCallback, useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import type { CommandeClient, ProduitClient } from "@/lib/types";
import Popup from "@/components/Popup";
import Banniere from "@/components/Banniere";
import PopupConfirmation from "@/components/PopupConfirmation";

function commandeFiltrees(commandes: CommandeClient[], recherche: string) {
  const q = recherche.trim().toLowerCase();
  if (!q) return commandes;
  return commandes.filter((c) => `${c.prenom} ${c.nom}`.toLowerCase().includes(q));
}

export default function AdminCommandesPage() {
  const [commandes, setCommandes] = useState<CommandeClient[]>([]);
  const [recherche, setRecherche] = useState("");
  const [aSupprimer, setASupprimer] = useState<CommandeClient | null>(null);
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [produits, setProduits] = useState<ProduitClient[]>([]);
  const [qtes, setQtes] = useState<Record<string, number>>({});
  const [formDirect, setFormDirect] = useState({ prenom: "", nom: "", batiment: "Orion", jour: "Lundi" });

  async function ouvrirAjout() {
    setQtes({});
    setFormDirect({ prenom: "", nom: "", batiment: "Orion", jour: "Lundi" });
    const res = await fetch("/api/produits");
    const data = await res.json();
    if (res.ok) setProduits((data.produits || []).filter((p: ProduitClient) => p.categorie !== "Menus"));
    setAjoutOuvert(true);
  }

  const panierDirect = produits
    .filter((p) => (qtes[p._id] || 0) > 0)
    .map((p) => ({ produit: p, qte: qtes[p._id] }));
  const totalDirect = panierDirect.reduce((somme, l) => somme + l.produit.prix * l.qte, 0);

  function majQte(id: string, delta: number) {
    setQtes((q) => {
      const produit = produits.find((p) => p._id === id);
      const max = Math.min(50, produit?.stock ?? 0);
      return { ...q, [id]: Math.max(0, Math.min(max, (q[id] || 0) + delta)) };
    });
  }

  async function creerCommande(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!formDirect.prenom.trim() || !formDirect.nom.trim()) {
      setErreur("Prénom et nom requis.");
      return;
    }
    if (panierDirect.length === 0) {
      setErreur("Ajoute au moins un produit.");
      return;
    }
    const res = await fetch("/api/commandes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formDirect,
        items: panierDirect.map((l) => ({ produitId: l.produit._id, qte: l.qte })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErreur(data.error || "Erreur.");
      return;
    }
    setAjoutOuvert(false);
    setMessage(`Commande de ${formDirect.prenom} enregistrée (${totalDirect.toFixed(2)} €).`);
    setTimeout(() => setMessage(null), 3000);
    charger();
  }
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      const res = await fetch("/api/commandes");
      const data = await res.json();
      if (res.ok) setCommandes(data.commandes || []);
    } catch {
      setCommandes([]);
    }
  }, []);

  async function confirmerSuppression() {
    if (!aSupprimer) return;
    const res = await fetch(`/api/commandes/${aSupprimer._id}`, { method: "DELETE" });
    setASupprimer(null);
    if (res.ok) {
      setMessage("Commande supprimée.");
      setErreur(null);
      charger();
    } else {
      setErreur("Suppression impossible.");
    }
  }

  useEffect(() => {
    charger();
  }, [charger]);

  const filtrees = commandeFiltrees(commandes, recherche);

  return (
    <div>
      <AdminNav />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black">Commandes de la semaine</h1>
        <button
          onClick={ouvrirAjout}
          className="inline-flex items-center gap-1.5 bg-cesi-jaune text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
        >
          Ajouter
        </button>
      </div>

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
                <th className="px-3 py-3">Jour</th>
                <th className="px-3 py-3">Commande</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3">Statut</th>
                <th className="px-3 py-3 text-right">Action</th>
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
                  <td data-label="Jour" className="px-3 py-3 max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-3 max-sm:py-1.5 max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted">{c.jour}</td>
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
                  <td className="px-3 py-3 text-right max-sm:flex max-sm:justify-end max-sm:py-1.5">
                    <button
                      onClick={() => setASupprimer(c)}
                      className="border border-red-500 text-red-500 font-bold px-4 py-2 rounded-lg hover:bg-red-500 hover:text-white focus-visible:bg-red-500 focus-visible:text-white transition-colors max-sm:px-3 max-sm:py-1.5 max-sm:text-sm"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {ajoutOuvert && (
        <Popup titre="Nouvelle commande (sur place)" onFermer={() => setAjoutOuvert(false)}>
          <form onSubmit={creerCommande} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={formDirect.prenom}
              onChange={(e) => setFormDirect({ ...formDirect, prenom: e.target.value })}
              placeholder="Prénom"
              className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none text-sm"
              required
            />
            <input
              value={formDirect.nom}
              onChange={(e) => setFormDirect({ ...formDirect, nom: e.target.value })}
              placeholder="Nom"
              className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none text-sm"
              required
            />
            <select
              value={formDirect.batiment}
              onChange={(e) => setFormDirect({ ...formDirect, batiment: e.target.value })}
              className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none text-sm"
              aria-label="Bâtiment"
            >
              <option value="Orion">Bât. Orion</option>
              <option value="Antares">Bât. Antares</option>
            </select>
            <select
              value={formDirect.jour}
              onChange={(e) => setFormDirect({ ...formDirect, jour: e.target.value })}
              className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none text-sm"
              aria-label="Jour de retrait"
            >
              <option value="Lundi">Retrait lundi</option>
              <option value="Mardi">Retrait mardi</option>
            </select>

            <div className="col-span-1 sm:col-span-2 border-t border-line pt-3 space-y-2 max-h-64 overflow-y-auto">
              <p className="text-xs text-muted">Produits (les menus se composent avec les produits individuels)</p>
              {produits.map((p) => (
                <div key={p._id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight">{p.nom}</p>
                    <p className="text-muted text-xs">{p.prix.toFixed(2)} € - {p.stock ?? 0} en stock</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => majQte(p._id, -1)}
                      className="w-8 h-8 rounded-lg border border-line font-bold hover:border-cesi-jaune"
                      aria-label={`Retirer un ${p.nom}`}
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-bold">{qtes[p._id] || 0}</span>
                    <button
                      type="button"
                      onClick={() => majQte(p._id, 1)}
                      className="w-8 h-8 rounded-lg bg-cesi-jaune text-black font-bold hover:bg-yellow-300 disabled:opacity-40"
                      disabled={(qtes[p._id] || 0) >= Math.min(50, p.stock ?? 0)}
                      aria-label={`Ajouter un ${p.nom}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="col-span-1 sm:col-span-2 flex items-center justify-between border-t border-line pt-3 font-black">
              <span>Total</span>
              <span className="text-cesi-jaune">{totalDirect.toFixed(2)} €</span>
            </div>

            {erreur && (
              <p className="col-span-1 sm:col-span-2 text-red-500 border border-red-500 bg-red-500/10 rounded-lg px-4 py-2">
                {erreur}
              </p>
            )}

            <div className="col-span-1 sm:col-span-2 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAjoutOuvert(false)}
                className="border border-line font-bold px-4 py-2 rounded-lg hover:border-cesi-jaune transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="bg-cesi-jaune text-black font-bold px-5 py-2 rounded-lg hover:bg-yellow-300"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </Popup>
      )}

      {aSupprimer && (
        <PopupConfirmation
          titre="Supprimer la commande ?"
          message={`La commande de ${aSupprimer.prenom} ${aSupprimer.nom} (${aSupprimer.total.toFixed(2)} €) sera définitivement supprimée.`}
          onConfirmer={confirmerSuppression}
          onAnnuler={() => setASupprimer(null)}
        />
      )}

      <Banniere texte={message} type="succes" />
      <Banniere texte={erreur} type="erreur" />
    </div>
  );
}
