"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ImageProduit from "@/components/ImageProduit";
import { Icon, addIcon } from "@iconify/react";
import { phShoppingCartBold } from "@/lib/icons";

addIcon("ph:shopping-cart-bold", phShoppingCartBold);
import type { CompositionItem, ProduitClient } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

function lireCookie(nom: string): string | null {
  if (typeof document === "undefined") return null;
  const entree = document.cookie.split("; ").find((c) => c.startsWith(nom + "="));
  return entree ? decodeURIComponent(entree.slice(nom.length + 1)) : null;
}

export default function CommanderPage() {
  const router = useRouter();
  const [produits, setProduits] = useState<ProduitClient[]>([]);
  const [qtes, setQtes] = useState<Record<string, number>>({});
  const [form, setForm] = useState({ prenom: "", nom: "", batiment: "Orion", jour: "Lundi" });
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [filtre, setFiltre] = useState("");
  const [choix, setChoix] = useState<Record<string, string[][][]>>({}); // menu -> instance -> composant -> variantes
  const [perso, setPerso] = useState<Record<string, boolean>>({}); // true : composer chaque menu séparément

  useEffect(() => {
    fetch("/api/produits")
      .then((r) => r.json())
      .then((d) => {
        const ps = d.produits || [];
        // Tri par disponibilité au chargement uniquement (l'ordre ne bouge plus ensuite)
        const dispoAuChargement = (p: ProduitClient) =>
          p.categorie !== "Menus"
            ? (p.stock ?? 0) > 0
            : (p.composition || []).every(
                (c) =>
                  !c.categorie ||
                  ps.some((v: ProduitClient) => v.categorie === c.categorie && v.actif !== false && (v.stock ?? 0) > 0)
              );
        setProduits(
          [...ps].sort((a, b) => {
            const da = dispoAuChargement(a) ? 0 : 1;
            const db = dispoAuChargement(b) ? 0 : 1;
            return da - db;
          })
        );
        // Pré-sélection de la première variante pour chaque composant au choix des menus
        const defauts: Record<string, string[][][]> = {};
        for (const menu of ps) {
          if (menu.categorie !== "Menus" || !menu.composition) continue;
          defauts[menu._id] = [
            menu.composition.map((c: CompositionItem) => {
              if (!c.categorie) return [];
              const variante = ps.find((v: ProduitClient) => v.categorie === c.categorie && v.actif !== false);
              return Array(c.qte).fill(variante?._id || "");
            }),
          ];
        }
        setChoix((ancien) => {
          const fusion = { ...ancien };
          for (const [id, insts] of Object.entries(defauts)) if (!ancien[id]?.length) fusion[id] = insts;
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
      // en mode "même partout", l'instance 0 vaut pour toutes les quantités
      const insts = choix[menu._id] || [];
      const coef = perso[menu._id] ? 1 : qteMenu;
      for (const inst of perso[menu._id] ? insts : insts.slice(0, 1)) {
        menu.composition.forEach((c, i) => {
          if (!c.categorie) return;
          (inst?.[i] || []).forEach((idVariante) => {
            if (idVariante) r.set(idVariante, (r.get(idVariante) || 0) + coef);
          });
        });
      }
      menu.composition.forEach((c) => {
        if (c.categorie || !c.nomProduit) return;
        const idComposant = produits.find((p) => p.nom === c.nomProduit)?._id;
        if (idComposant) r.set(idComposant, (r.get(idComposant) || 0) + qteMenu * c.qte);
      });
    }
    return r;
  }, [produits, qtes, choix]);

  // Détail d'un menu pour le panier : une ligne par sous-élément, avec x si doublons
  function detailMenu(menu: ProduitClient): string[] {
    const qte = qtes[menu._id] || 0;
    const insts = choix[menu._id] || [];
    const coef = perso[menu._id] ? 1 : qte;
    const compte = new Map<string, number>();
    const sources = perso[menu._id] ? insts.slice(0, qte) : insts.slice(0, 1);
    menu.composition?.forEach((c, i) => {
      if (c.categorie) {
        sources.forEach((inst) =>
          (inst?.[i] || []).forEach((id) => {
            const nom = produits.find((p) => p._id === id)?.nom;
            if (nom) compte.set(nom, (compte.get(nom) || 0) + coef);
          })
        );
      } else if (c.nomProduit) {
        compte.set(c.nomProduit, (compte.get(c.nomProduit) || 0) + c.qte * qte);
      }
    });
    return Array.from(compte.entries()).map(([nom, n]) => (n > 1 ? `${n} × ${nom}` : nom));
  }

  function stockRestantDe(p: ProduitClient) {
    return Math.max(0, (p.stock ?? 0) - (reserves.get(p._id) || 0));
  }

  // Stock affiché pour l'unité u du composant i de l'instance k : soustrait les
  // unités de même type déjà choisies AVANT elle (ex. 2e nem : n-1)
  function restantPourUnite(menu: ProduitClient, k: number, i: number, u: number, v: ProduitClient) {
    const qteMenu = qtes[menu._id] || 0;
    const coef = perso[menu._id] ? 1 : qteMenu;
    const insts = choix[menu._id] || [];
    const sources = perso[menu._id] ? insts : insts.slice(0, 1);
    let prisMenu = 0;
    let prisAvant = 0;
    sources.forEach((inst, k2) => {
      (menu.composition || []).forEach((c2, i2) => {
        if (!c2.categorie) return;
        (inst?.[i2] || []).forEach((x, u2) => {
          if (x !== v._id) return;
          prisMenu++;
          if (k2 < k || (k2 === k && (i2 < i || (i2 === i && u2 < u)))) prisAvant++;
        });
      });
    });
    return Math.max(0, (v.stock ?? 0) - (reserves.get(v._id) || 0) + (prisMenu - prisAvant) * coef);
  }

  // Stock affiché pour un composant fixe (nomProduit) de l'instance k du menu :
  // même convention dégressive que les tags, les instances suivantes voient le reste
  function restantFixe(menu: ProduitClient, k: number, c: CompositionItem) {
    const v = parNom.get(c.nomProduit || "");
    if (!v) return 0;
    const qteMenu = qtes[menu._id] || 0;
    const prisAvant = perso[menu._id] ? c.qte * k : 0;
    return Math.max(0, (v.stock ?? 0) - (reserves.get(v._id) || 0) + qteMenu * c.qte - prisAvant);
  }

  // Quantité maximale sélectionnable pour un produit : stock total moins
  // les réservations externes (choix des menus), sans compter sa propre quantité
  function stockSelectionnable(p: ProduitClient) {
    const reserveExterne = (reserves.get(p._id) || 0) - (qtes[p._id] || 0);
    return Math.max(0, Math.min(50, (p.stock ?? 0) - reserveExterne));
  }

  // Un menu est indisponible si l'un de ses composants au choix n'a plus de variante en stock
  function menuEstDisponible(p: ProduitClient) {
    if (p.categorie !== "Menus") return true;
    return (p.composition || []).every(
      (c) => !c.categorie || produits.some((v) => v.categorie === c.categorie && v.actif !== false && stockRestantDe(v) > 0)
    );
  }
  const parNom = new Map(produits.map((p) => [p.nom, p]));
  const categories = CATEGORIES.filter((c) => produits.some((p) => p.categorie === c));
  const produitsFiltres = filtre ? produits.filter((p) => p.categorie === filtre) : produits;

  function majQte(id: string, delta: number) {
    const produit = produits.find((p) => p._id === id);
    const max = produit?.categorie === "Menus" ? 50 : produit ? stockSelectionnable(produit) : 0;
    const n = Math.max(0, Math.min(max, (qtes[id] || 0) + delta));
    setQtes((q) => ({ ...q, [id]: n }));
    // Menus à choix : une composition par instance, copiée depuis la précédente
    if (produit?.categorie === "Menus" && produit.composition?.some((c) => c.categorie)) {
      setChoix((ch) => {
        const copie = [...(ch[id] || [])];
        while (copie.length < n) {
          const modele = copie[copie.length - 1] || (ch[id] || [])[0] || [];
          copie.push(modele.map((c) => [...c]));
        }
        copie.length = n;
        return { ...ch, [id]: copie };
      });
    }
  }

  function majChoix(menuId: string, k: number, i: number, u: number, idVariante: string) {
    setChoix((ch) => {
      const insts = [...(ch[menuId] || [])];
      const inst = [...(insts[k] || [])];
      const copie = [...(inst[i] || [])];
      copie[u] = idVariante;
      inst[i] = copie;
      insts[k] = inst;
      return { ...ch, [menuId]: insts };
    });
  }

  // Éditeur de la composition d'une instance k du menu p (tags sélectionnables)
  function editeurComposition(p: ProduitClient, k: number) {
    return (
      <div className="divide-y divide-line">
        {(p.composition || []).map((c, i) => (
          <div key={i} className="py-2 first:pt-0 last:pb-0">
            {c.categorie ? (
              <div className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-2 text-sm items-start">
                <span className="text-muted pt-1">{c.qte > 1 ? `${c.qte} × ` : ""}{c.categorie}</span>
                <div className="flex flex-col gap-2">
                  {Array.from({ length: c.qte }).map((_, u) => (
                    <div key={u}>
                      {c.qte > 1 && (
                        <p className="text-xs text-muted mb-1">{c.categorie} n°{u + 1}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5" role="group" aria-label={`${c.categorie} n°${u + 1}`}>
                        {produits
                          .filter((v) => v.categorie === c.categorie && v.actif !== false)
                          .map((v) => {
                            const dispo = restantPourUnite(p, k, i, u, v);
                            const selectionne = (choix[p._id]?.[k]?.[i]?.[u] || "") === v._id;
                            return (
                              <button
                                key={v._id}
                                type="button"
                                aria-pressed={selectionne}
                                onClick={() => majChoix(p._id, k, i, u, v._id)}
                                disabled={dispo === 0 && !selectionne}
                                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                                  selectionne
                                    ? "bg-cesi-jaune text-black border-cesi-jaune font-bold"
                                    : "border-line hover:border-cesi-jaune disabled:opacity-40 disabled:hover:border-line"
                                }`}
                              >
                                {v.nom} <span className={selectionne ? "" : "text-muted"}>({dispo})</span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">
                {c.qte > 1 ? `${c.qte} × ` : ""}{c.nomProduit} ({restantFixe(p, k, c)} restant)
              </p>
            )}
          </div>
        ))}
      </div>
    );
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
      const insts = choix[l.produit._id] || [];
      for (let k = 0; k < l.qte; k++) {
        const inst = insts[k];
        const incomplet = l.produit.composition.some(
          (c, i) => c.categorie && (!inst?.[i] || inst[i].length !== c.qte || inst[i].some((v) => !v))
        );
        if (incomplet) {
          setErreur(`Choisis le type pour chaque produit du « ${l.produit.nom} ».`);
          return;
        }
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
              const insts = choix[l.produit._id] || [];
              // choix aplati : un tableau de variantes par composant, pour chaque instance du menu
              item.choix = l.produit.composition.map((c, i) => {
                if (!c.categorie) return [];
                return perso[l.produit._id]
                  ? insts.slice(0, l.qte).flatMap((inst) => inst[i] || [])
                  : Array.from({ length: l.qte }).flatMap(() => insts[0]?.[i] || []);
              });
            }
            return item;
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'enregistrement.");
      sessionStorage.setItem("cafet-commande", JSON.stringify(data.commande));
      // mémorise la commande pour l'afficher sur l'accueil (retrait en attente)
      try {
        const ids: string[] = JSON.parse(lireCookie("cafet-commandes") || "[]");
        ids.push(data.commande._id);
        document.cookie =
          "cafet-commandes=" +
          encodeURIComponent(JSON.stringify(ids.slice(-20))) +
          "; path=/; max-age=" +
          60 * 60 * 24 * 30 +
          "; samesite=lax";
      } catch {
        // cookie illisible : on continue sans
      }
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
              const menuDispo = menuEstDisponible(p);
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
                  {menu && !menuDispo && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/10 text-red-500">
                      Indisponible
                    </span>
                  )}
                  <div className="flex items-center gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => majQte(p._id, -1)}
                    disabled={!menu && (qtes[p._id] || 0) === 0}
                    className="w-9 h-9 rounded-lg border border-line font-bold hover:border-cesi-jaune disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-bold">{qtes[p._id] || 0}</span>
                  <button
                    type="button"
                    onClick={() => majQte(p._id, 1)}
                    disabled={(!menu && (qtes[p._id] || 0) >= stockSelectionnable(p)) || (menu && !menuDispo)}
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
                  {(qtes[p._id] || 0) > 1 && (
                    <div className="flex gap-2" role="group" aria-label="Mode de composition">
                      <button
                        type="button"
                        aria-pressed={!perso[p._id]}
                        onClick={() => setPerso((m) => ({ ...m, [p._id]: false }))}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          !perso[p._id]
                            ? "bg-cesi-jaune text-black border-cesi-jaune font-bold"
                            : "border-line hover:border-cesi-jaune"
                        }`}
                      >
                        Même partout
                      </button>
                      <button
                        type="button"
                        aria-pressed={!!perso[p._id]}
                        onClick={() => setPerso((m) => ({ ...m, [p._id]: true }))}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          perso[p._id]
                            ? "bg-cesi-jaune text-black border-cesi-jaune font-bold"
                            : "border-line hover:border-cesi-jaune"
                        }`}
                      >
                        Personnaliser chaque menu
                      </button>
                    </div>
                  )}
                  {!perso[p._id] && (qtes[p._id] || 0) > 1 && (
                    <p className="text-xs text-muted">Cette composition vaut pour les {qtes[p._id]} menus.</p>
                  )}
                  {!perso[p._id] ? (
                    editeurComposition(p, 0)
                  ) : (
                    Array.from({ length: qtes[p._id] || 1 }).map((_, k) => (
                      <div key={k} className="space-y-2 pt-3 border-t border-line first:pt-0 first:border-t-0">
                        <p className="text-xs font-bold text-muted">Menu n°{k + 1}</p>
                        {editeurComposition(p, k)}
                      </div>
                    ))
                  )}
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
                    ? detailMenu(l.produit)
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
                {/* <option value="Antares">Bât. Antares</option> */}
              </select>
              <select
                value={form.jour}
                onChange={(e) => setForm({ ...form, jour: e.target.value })}
                className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none text-sm"
                aria-label="Jour de retrait"
              >
                <option value="Lundi">Retrait lundi</option>
                <option value="Mardi">Retrait mardi</option>
                <option value="Mercredi">Retrait mercredi</option>
                <option value="Jeudi">Retrait jeudi</option>
                <option value="Vendredi">Retrait vendredi</option>
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
          <p className="text-xs text-muted text-center">Paiement sur place (par carte).</p>
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
