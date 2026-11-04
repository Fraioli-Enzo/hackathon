"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon, addIcon } from "@iconify/react";
import { phShoppingCartBold } from "@/lib/icons";

addIcon("ph:shopping-cart-bold", phShoppingCartBold);
import AdminNav from "@/components/AdminNav";
import type { CommandeClient, ProduitClient } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import ImageProduit from "@/components/ImageProduit";
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
  const [modeDirect, setModeDirect] = useState(false);
  const [produits, setProduits] = useState<ProduitClient[]>([]);
  const [qtes, setQtes] = useState<Record<string, number>>({});
  const [formDirect, setFormDirect] = useState({ prenom: "", nom: "", batiment: "Orion", jour: "Lundi" });
  const [filtreDirect, setFiltreDirect] = useState("");
  const [rechercheDirect, setRechercheDirect] = useState("");
  const [triDirect, setTriDirect] = useState("nom-asc");
  const [choixDirect, setChoixDirect] = useState<Record<string, Record<number, string[]>>>({});

  async function ouvrirDirect() {
    setQtes({});
    setFiltreDirect("");
    setRechercheDirect("");
    setTriDirect("nom-asc");
    setFormDirect({ prenom: "", nom: "", batiment: "Orion", jour: "Lundi" });
    const res = await fetch("/api/produits");
    const data = await res.json();
    if (res.ok) {
      const ps: ProduitClient[] = data.produits || [];
      setProduits(ps);
      // pré-sélection de la première variante pour chaque menu
      const defauts: Record<string, Record<number, string[]>> = {};
      for (const menu of ps) {
        if (menu.categorie !== "Menus" || !menu.composition) continue;
        defauts[menu._id] = {};
        menu.composition.forEach((c, i) => {
          if (!c.categorie) return;
          const variante = ps.find((v) => v.categorie === c.categorie && v.actif !== false);
          if (variante) defauts[menu._id][i] = Array(c.qte).fill(variante._id);
        });
      }
      setChoixDirect(defauts);
    }
    setModeDirect(true);
  }

  const categoriesDirect = CATEGORIES.filter((c) => produits.some((p) => p.categorie === c));
  const produitsDirects = produits
    .filter((p) => (!filtreDirect || p.categorie === filtreDirect) && p.nom.toLowerCase().includes(rechercheDirect.trim().toLowerCase()))
    .sort((a, b) => {
      switch (triDirect) {
        case "nom-desc":
          return b.nom.localeCompare(a.nom);
        case "prix-asc":
          return a.prix - b.prix;
        case "prix-desc":
          return b.prix - a.prix;
        default:
          return a.nom.localeCompare(b.nom);
      }
    });
  // Stock dynamique : ce que la sélection en cours consomme (panier + choix des menus)
  const reservesDirect = useMemo(() => {
    const r = new Map<string, number>();
    for (const [id, q] of Object.entries(qtes)) {
      if (q > 0) r.set(id, (r.get(id) || 0) + q);
    }
    for (const menu of produits) {
      if (menu.categorie !== "Menus" || !menu.composition) continue;
      const qteMenu = qtes[menu._id] || 0;
      if (!qteMenu) continue;
      menu.composition.forEach((c, i) => {
        if (!c.categorie) return;
        (choixDirect[menu._id]?.[i] || []).forEach((idVariante) => {
          if (idVariante) r.set(idVariante, (r.get(idVariante) || 0) + qteMenu);
        });
      });
    }
    return r;
  }, [produits, qtes, choixDirect]);

  function stockRestantDirect(p: ProduitClient) {
    return Math.max(0, (p.stock ?? 0) - (reservesDirect.get(p._id) || 0));
  }

  function detailDirect(menu: ProduitClient): string[] {
    const compte = new Map<string, number>();
    menu.composition?.forEach((c, i) => {
      if (c.categorie) {
        (choixDirect[menu._id]?.[i] || []).forEach((id) => {
          const nom = produits.find((p) => p._id === id)?.nom;
          if (nom) compte.set(nom, (compte.get(nom) || 0) + 1);
        });
      } else if (c.nomProduit) {
        compte.set(c.nomProduit, (compte.get(c.nomProduit) || 0) + c.qte);
      }
    });
    return Array.from(compte.entries()).map(([nom, n]) => (n > 1 ? `${n} × ${nom}` : nom));
  }

  const panierDirect = produits
    .filter((p) => (qtes[p._id] || 0) > 0)
    .map((p) => ({ produit: p, qte: qtes[p._id] }));
  const totalDirect = panierDirect.reduce((somme, l) => somme + l.produit.prix * l.qte, 0);
  const nbArticlesDirect = panierDirect.reduce((somme, l) => somme + l.qte, 0);

  function majQte(id: string, delta: number) {
    setQtes((q) => {
      const produit = produits.find((p) => p._id === id);
      const max = produit?.categorie === "Menus" ? 50 : Math.min(50, produit ? stockRestantDirect(produit) : 0);
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
    for (const l of panierDirect) {
      if (l.produit.categorie !== "Menus" || !l.produit.composition) continue;
      const incomplet = l.produit.composition.some(
        (c, i) => c.categorie && (!choixDirect[l.produit._id]?.[i] || choixDirect[l.produit._id][i].length !== c.qte || choixDirect[l.produit._id][i].some((v) => !v))
      );
      if (incomplet) {
        setErreur(`Choisis le type pour chaque produit du « ${l.produit.nom} ».`);
        return;
      }
    }
    const res = await fetch("/api/commandes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formDirect,
        items: panierDirect.map((l) => {
          const item: { produitId: string; qte: number; choix?: string[][] } = { produitId: l.produit._id, qte: l.qte };
          if (l.produit.categorie === "Menus" && l.produit.composition?.some((c) => c.categorie)) {
            item.choix = l.produit.composition.map((c, i) => (c.categorie ? choixDirect[l.produit._id]?.[i] || [] : []));
          }
          return item;
        }),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErreur(data.error || "Erreur.");
      return;
    }
    setModeDirect(false);
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

  if (modeDirect) {
    return (
      <div>
        <AdminNav />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black">Commande (sur place)</h1>
          </div>
          <button
            onClick={() => setModeDirect(false)}
            className="border border-line font-bold px-4 py-2 rounded-lg hover:border-cesi-jaune transition-colors"
          >
            Retour
          </button>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <input
                value={rechercheDirect}
                onChange={(e) => setRechercheDirect(e.target.value)}
                placeholder="Rechercher un produit…"
                className="flex-1 min-w-[180px] bg-card border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
              />
              <select
                value={triDirect}
                onChange={(e) => setTriDirect(e.target.value)}
                className="bg-card border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none text-sm"
                aria-label="Trier les produits"
              >
                <option value="nom-asc">Nom (A à Z)</option>
                <option value="nom-desc">Nom (Z à A)</option>
                <option value="prix-asc">Prix croissant</option>
                <option value="prix-desc">Prix décroissant</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les produits">
              <button
                onClick={() => setFiltreDirect("")}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                  filtreDirect === "" ? "bg-cesi-jaune text-black border-cesi-jaune font-bold" : "border-line hover:border-cesi-jaune"
                }`}
              >
                Tous
              </button>
              {categoriesDirect.map((c) => (
                <button
                  key={c}
                  onClick={() => setFiltreDirect(c)}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                    filtreDirect === c ? "bg-cesi-jaune text-black border-cesi-jaune font-bold" : "border-line hover:border-cesi-jaune"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {produitsDirects.map((p) => {
                const menu = p.categorie === "Menus";
                return (
                  <div key={p._id} className="border border-line rounded-xl p-3 sm:p-4 bg-card">
                    <div className="flex gap-3">
                      <ImageProduit src={p.image} alt={p.nom} className="w-16 h-16 sm:w-20 sm:h-20 shrink-0" width={96} height={96} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold leading-tight">{p.nom}</p>
                          <p className="text-cesi-jaune font-bold shrink-0">{p.prix.toFixed(2)} €</p>
                        </div>
                        <p className="text-sm text-muted line-clamp-2 sm:line-clamp-none">{p.description || ""}</p>
                        {!menu && (
                          <p
                            className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${
                              stockRestantDirect(p) > 0 ? "bg-surface text-muted" : "bg-red-500/10 text-red-500"
                            }`}
                          >
                            {stockRestantDirect(p) > 0 ? `${stockRestantDirect(p)} en stock` : "Rupture de stock"}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      {!menu && <span className="text-xs text-muted">{p.categorie}</span>}
                      {!menu && <div className="flex-1" />}
                      <div className="flex items-center gap-3 ml-auto">
                        <button
                          onClick={() => majQte(p._id, -1)}
                          className="w-9 h-9 rounded-lg border border-line font-bold hover:border-cesi-jaune"
                          aria-label={`Retirer un ${p.nom}`}
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-bold">{qtes[p._id] || 0}</span>
                        <button
                          onClick={() => majQte(p._id, 1)}
                          className="w-9 h-9 rounded-lg bg-cesi-jaune text-black font-bold hover:bg-yellow-300 disabled:opacity-40"
                          disabled={!menu && (qtes[p._id] || 0) >= Math.min(50, stockRestantDirect(p))}
                          aria-label={`Ajouter un ${p.nom}`}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {menu && (qtes[p._id] || 0) > 0 && p.composition?.some((c) => c.categorie) && (
                      <div className="mt-3 border border-line rounded-xl p-4 bg-surface space-y-3">
                        <p className="text-sm font-bold">Composition du menu</p>
                        <div className="divide-y divide-line">
                          {(p.composition || []).map((c, i) =>
                            c.categorie ? (
                              <div key={i} className="grid grid-cols-[auto,1fr] items-center gap-x-3 py-2 first:pt-0 last:pb-0">
                                <span className="text-muted text-sm">{c.qte > 1 ? `${c.qte} × ` : ""}{c.categorie}</span>
                                <div className="flex flex-col gap-2 justify-self-stretch">
                                  {Array.from({ length: c.qte }).map((_, u) => (
                                    <select
                                      key={u}
                                      value={choixDirect[p._id]?.[i]?.[u] || ""}
                                      onChange={(e) =>
                                        setChoixDirect((ch) => {
                                          const actuel = ch[p._id]?.[i] || Array(c.qte).fill("");
                                          const copie = [...actuel];
                                          copie[u] = e.target.value;
                                          return { ...ch, [p._id]: { ...(ch[p._id] || {}), [i]: copie } };
                                        })
                                      }
                                      className="w-full bg-card border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none text-sm"
                                      aria-label={`${c.categorie} n°${u + 1}`}
                                    >
                                      {produits
                                        .filter((v) => v.categorie === c.categorie && v.actif !== false)
                                        .map((v) => {
                                          const reserveUnite = choixDirect[p._id]?.[i]?.[u] === v._id ? 1 : 0;
                                          const dispo = Math.max(0, (v.stock ?? 0) - ((reservesDirect.get(v._id) || 0) - reserveUnite));
                                          return (
                                            <option key={v._id} value={v._id}>
                                              {v.nom} ({dispo} restant)
                                            </option>
                                          );
                                        })}
                                    </select>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p key={i} className="text-sm text-muted py-2 first:pt-0 last:pb-0">
                                {c.qte > 1 ? `${c.qte} × ` : ""}{c.nomProduit}
                              </p>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <aside id="panier-direct" className="border border-line rounded-xl p-5 bg-card lg:sticky lg:top-20 space-y-4 scroll-mt-20">
            <h2 className="text-lg font-bold">Panier</h2>
            {panierDirect.length === 0 ? (
              <p className="text-muted text-sm">Aucun produit sélectionné.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {panierDirect.map((l) => {
                  const detail = l.produit.categorie === "Menus" && l.produit.composition ? detailDirect(l.produit) : [];
                  return (
                    <li key={l.produit._id} className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <p>
                          {l.qte} × {l.produit.nom}
                        </p>
                        {detail.length > 0 && (
                          <ul className="text-muted text-xs leading-snug mt-0.5 list-disc list-inside">
                            {detail.map((d, idx) => (
                              <li key={idx}>{d}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <span className="shrink-0">{(l.qte * l.produit.prix).toFixed(2)} €</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="flex justify-between font-black text-lg border-t border-line pt-3">
              <span>Total</span>
              <span className="text-cesi-jaune">{totalDirect.toFixed(2)} €</span>
            </div>

            <div className="space-y-2 border-t border-line pt-3">
              <div className="grid grid-cols-2 gap-2">
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
              </div>
              <div className="grid grid-cols-2 gap-2">
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
              </div>
            </div>

            {erreur && <p className="text-red-500 text-sm">{erreur}</p>}
            <button
              onClick={(e) => creerCommande(e as unknown as React.FormEvent)}
              className="w-full bg-cesi-jaune text-black font-bold py-3 rounded-lg hover:bg-yellow-300 transition-colors"
            >
              Enregistrer la commande
            </button>
            <p className="text-xs text-muted text-center">Paiement sur place (espèces ou carte).</p>
          </aside>
        </div>

        {nbArticlesDirect > 0 && (
          <button
            type="button"
            onClick={() => document.getElementById("panier-direct")?.scrollIntoView({ behavior: "smooth" })}
            aria-label="Aller au panier"
            className="lg:hidden fixed bottom-4 right-4 z-40 w-14 h-14 rounded-full bg-cesi-jaune text-black shadow-lg flex items-center justify-center hover:bg-yellow-300 transition-colors"
          >
            <Icon icon="ph:shopping-cart-bold" ssr className="w-7 h-7" />
            <span className="absolute -top-1 -right-1 bg-black text-cesi-jaune text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
              {nbArticlesDirect}
            </span>
          </button>
        )}

        <Banniere texte={erreur} type="erreur" />
      </div>
    );
  }

  return (
    <div>
      <AdminNav />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black">Commandes de la semaine</h1>
        <button
          onClick={ouvrirDirect}
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
