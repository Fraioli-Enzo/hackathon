"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ImageProduit from "@/components/ImageProduit";
import { Icon, addIcon } from "@iconify/react";
import { phShoppingCartBold } from "@/lib/icons";

addIcon("ph:shopping-cart-bold", phShoppingCartBold);
import type { CompositionItem, ProduitClient } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

export default function CommanderPage() {
  const router = useRouter();
  const [produits, setProduits] = useState<ProduitClient[]>([]);
  const [qtes, setQtes] = useState<Record<string, number>>({});
  const [form, setForm] = useState({ prenom: "", nom: "", batiment: "Orion", jour: "Lundi" });
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [filtre, setFiltre] = useState("");
  const [choix, setChoix] = useState<Record<string, Record<number, string[]>>>({});

  useEffect(() => {
    fetch("/api/produits")
      .then((r) => r.json())
      .then((d) => {
        const ps = d.produits || [];
        setProduits(ps);
        // Pré-sélection de la première variante pour chaque composant au choix des menus
        const defauts: Record<string, Record<number, string[]>> = {};
        for (const menu of ps) {
          if (menu.categorie !== "Menus" || !menu.composition) continue;
          defauts[menu._id] = {};
          menu.composition.forEach((c: CompositionItem, i: number) => {
            if (!c.categorie) return;
            const variante = ps.find((v: ProduitClient) => v.categorie === c.categorie && v.actif !== false);
            if (variante) defauts[menu._id][i] = Array(c.qte).fill(variante._id);
          });
        }
        setChoix((ancien) => {
          const fusion = { ...ancien };
          for (const [id, c] of Object.entries(defauts)) fusion[id] = { ...c, ...(ancien[id] || {}) };
          return fusion;
        });
      })
      .catch(() => setErreur("Impossible de charger les produits."));
  }, []);

  const panier = useMemo(
    () =>
      produits
        .filter((p) => (qtes[p._id] || 0) > 0)
        .map((p) => ({ produit: p, qte: qtes[p._id] })),
    [produits, qtes]
  );
  const total = panier.reduce((somme, l) => somme + l.produit.prix * l.qte, 0);

  const nbArticles = panier.reduce((somme, l) => somme + l.qte, 0);

  // Stock dynamique : ce que la sélection en cours consomme (panier + choix des menus)
  const reserves = useMemo(() => {
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
        (choix[menu._id]?.[i] || []).forEach((idVariante) => {
          if (idVariante) r.set(idVariante, (r.get(idVariante) || 0) + qteMenu);
        });
      });
    }
    return r;
  }, [produits, qtes, choix]);

  // Détail d'un menu pour le panier : une ligne par sous-élément
  function detailMenu(menu: ProduitClient, choixMenu?: Record<number, string[]>): string[] {
    const lignes: string[] = [];
    menu.composition?.forEach((c, i) => {
      if (c.categorie) {
        (choixMenu?.[i] || []).forEach((id) => {
          const nom = produits.find((p) => p._id === id)?.nom;
          if (nom) lignes.push(nom);
        });
      } else if (c.nomProduit) {
        lignes.push(c.qte > 1 ? `${c.qte} × ${c.nomProduit}` : c.nomProduit);
      }
    });
    return lignes;
  }

  function stockRestantDe(p: ProduitClient) {
    return Math.max(0, (p.stock ?? 0) - (reserves.get(p._id) || 0));
  }
  const categories = CATEGORIES.filter((c) => produits.some((p) => p.categorie === c));
  const produitsFiltres = filtre ? produits.filter((p) => p.categorie === filtre) : produits;

  function majQte(id: string, delta: number) {
    const produit = produits.find((p) => p._id === id);
    const max = produit?.categorie === "Menus" ? 50 : Math.min(50, produit ? stockRestantDe(produit) : 0);
    setQtes((q) => ({ ...q, [id]: Math.max(0, Math.min(max, (q[id] || 0) + delta)) }));
  }

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (panier.length === 0) {
      setErreur("Ajoute au moins un produit à ta commande.");
      return;
    }
    if (!form.prenom.trim() || !form.nom.trim()) {
      setErreur("Remplis tous les champs du formulaire.");
      return;
    }
    for (const l of panier) {
      if (l.produit.categorie !== "Menus" || !l.produit.composition) continue;
      const incomplet = l.produit.composition.some(
        (c, i) => c.categorie && (!choix[l.produit._id]?.[i] || choix[l.produit._id][i].length !== c.qte || choix[l.produit._id][i].some((v) => !v))
      );
      if (incomplet) {
        setErreur(`Choisis le type pour chaque produit du « ${l.produit.nom} ».`);
        return;
      }
    }
    setEnvoi(true);
    try {
      const res = await fetch("/api/commandes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: panier.map((l) => {
            const item: { produitId: string; qte: number; choix?: string[][] } = { produitId: l.produit._id, qte: l.qte };
            if (l.produit.categorie === "Menus" && l.produit.composition?.some((c) => c.categorie)) {
              item.choix = l.produit.composition.map((c, i) => (c.categorie ? choix[l.produit._id]?.[i] || [] : []));
            }
            return item;
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'enregistrement.");
      sessionStorage.setItem("cafet-commande", JSON.stringify(data.commande));
      router.push("/confirmation");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inconnue.");
      setEnvoi(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black">Passer commande</h1>

      <form onSubmit={valider} className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-4">
          <h2 className="text-xl font-bold pt-2">Produits</h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les produits">
            <button
              type="button"
              onClick={() => setFiltre("")}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                filtre === "" ? "bg-cesi-jaune text-black border-cesi-jaune font-bold" : "border-line hover:border-cesi-jaune"
              }`}
            >
              Tous
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFiltre(c)}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                  filtre === c ? "bg-cesi-jaune text-black border-cesi-jaune font-bold" : "border-line hover:border-cesi-jaune"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {produits.length === 0 && <p className="text-muted">Chargement…</p>}
            {produitsFiltres.map((p) => {
              const menu = p.categorie === "Menus";
              const stock = menu ? 0 : stockRestantDe(p);
              const avecChoix = menu && (p.composition?.some((c) => c.categorie) ?? false);
              return (
              <div key={p._id} className="space-y-2">
              <div className="border border-line rounded-xl p-3 sm:p-4 bg-card">
                <div className="flex gap-3">
                  <ImageProduit src={p.image} alt={p.nom} className="w-16 h-16 sm:w-20 sm:h-20 shrink-0" width={96} height={96} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold leading-tight">{p.nom}</p>
                      <div className="text-right shrink-0">
                        <p className="text-cesi-jaune font-bold">{p.prix.toFixed(2)} €</p>
                        {!menu && (
                          <span className="inline-block mt-1 text-xs font-semibold text-muted bg-surface px-2 py-0.5 rounded-full whitespace-nowrap">
                            Quantité : 1
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted line-clamp-2 sm:line-clamp-none">{p.description || ""}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  {!menu && (
                    <p
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        stock > 0 ? "bg-surface text-muted" : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {stock > 0 ? `${stock} en stock` : "Rupture de stock"}
                    </p>
                  )}
                  <div className="flex items-center gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => majQte(p._id, -1)}
                    disabled={!menu && stock === 0}
                    className="w-9 h-9 rounded-lg border border-line font-bold hover:border-cesi-jaune disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-bold">{qtes[p._id] || 0}</span>
                  <button
                    type="button"
                    onClick={() => majQte(p._id, 1)}
                    disabled={!menu && (stock === 0 || (qtes[p._id] || 0) >= stock)}
                    className="w-9 h-9 rounded-lg bg-cesi-jaune text-black font-bold hover:bg-yellow-300 disabled:opacity-40"
                  >
                    +
                  </button>
                  </div>
                </div>
              </div>
              {avecChoix && (qtes[p._id] || 0) > 0 && (
                <div className="border border-line rounded-xl p-4 bg-card space-y-3">
                  <p className="text-sm font-bold">Composition de ton menu</p>
                  <div className="divide-y divide-line">
                  {(p.composition || []).map((c, i) => (
                    <div key={i} className="py-2 first:pt-0 last:pb-0">
                    {c.categorie ? (
                      <div className="grid grid-cols-[auto,1fr] items-center gap-x-3 text-sm">
                        <span className="text-muted">{c.qte > 1 ? `${c.qte} × ` : ""}{c.categorie}</span>
                        <div className="flex flex-col gap-2">
                          {Array.from({ length: c.qte }).map((_, u) => (
                            <select
                              key={u}
                              aria-label={`${c.categorie} n°${u + 1}`}
                              value={choix[p._id]?.[i]?.[u] || ""}
                              onChange={(e) =>
                                setChoix((ch) => {
                                  const actuel = ch[p._id]?.[i] || Array(c.qte).fill("");
                                  const copie = [...actuel];
                                  copie[u] = e.target.value;
                                  return { ...ch, [p._id]: { ...(ch[p._id] || {}), [i]: copie } };
                                })
                              }
                              className="w-full bg-card border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
                            >
                            {produits
                              .filter((v) => v.categorie === c.categorie && v.actif !== false)
                              .map((v) => {
                                const reserveUnite = choix[p._id]?.[i]?.[u] === v._id ? 1 : 0;
                                const dispo = Math.max(0, (v.stock ?? 0) - ((reserves.get(v._id) || 0) - reserveUnite));
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
                      <p className="text-sm text-muted">
                        {c.qte > 1 ? `${c.qte} × ` : ""}{c.nomProduit}
                      </p>
                    )}
                    </div>
                  ))}
                  </div>
                </div>
              )}
              </div>
              );
            })}
          </div>
        </div>

        <aside id="panier" className="border border-line rounded-xl p-5 bg-card lg:sticky lg:top-20 space-y-4 scroll-mt-20">
          <h2 className="text-lg font-bold">Panier</h2>
          {panier.length === 0 ? (
            <p className="text-muted text-sm">Aucun produit sélectionné.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {panier.map((l) => {
                const detail =
                  l.produit.categorie === "Menus" && l.produit.composition
                    ? detailMenu(l.produit, choix[l.produit._id])
                    : [];
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
            <span className="text-cesi-jaune">{total.toFixed(2)} €</span>
          </div>
          <div className="space-y-2 border-t border-line pt-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                value={form.prenom}
                onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                placeholder="Prénom"
                className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none text-sm"
                required
              />
              <input
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                placeholder="Nom"
                className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={form.batiment}
                onChange={(e) => setForm({ ...form, batiment: e.target.value })}
                className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none text-sm"
                aria-label="Bâtiment"
              >
                <option value="Orion">Bât. Orion</option>
                <option value="Antares">Bât. Antares</option>
              </select>
              <select
                value={form.jour}
                onChange={(e) => setForm({ ...form, jour: e.target.value })}
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
            type="submit"
            disabled={envoi}
            className="w-full bg-cesi-jaune text-black font-bold py-3 rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-50"
          >
            {envoi ? "Envoi…" : "Valider la commande"}
          </button>
          <p className="text-xs text-muted text-center">Paiement sur place (espèces ou carte).</p>
        </aside>
      </form>
      <button
        type="button"
        onClick={() => document.getElementById("panier")?.scrollIntoView({ behavior: "smooth" })}
        aria-label="Aller au panier"
        className="lg:hidden fixed bottom-4 right-4 z-40 w-14 h-14 rounded-full bg-cesi-jaune text-black shadow-lg flex items-center justify-center hover:bg-yellow-300 transition-colors"
      >
        <Icon icon="ph:shopping-cart-bold" ssr className="w-7 h-7" />
        {nbArticles > 0 && (
          <span className="absolute -top-1 -right-1 bg-black text-cesi-jaune text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
            {nbArticles}
          </span>
        )}
      </button>
    </div>
  );
}
