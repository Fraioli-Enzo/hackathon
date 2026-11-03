"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ImageProduit from "@/components/ImageProduit";
import type { CompositionItem, ProduitClient } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

export default function CommanderPage() {
  const router = useRouter();
  const [produits, setProduits] = useState<ProduitClient[]>([]);
  const [qtes, setQtes] = useState<Record<string, number>>({});
  const [form, setForm] = useState({ prenom: "", nom: "", email: "", batiment: "Orion" });
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

  const categories = CATEGORIES.filter((c) => produits.some((p) => p.categorie === c));
  const produitsFiltres = filtre ? produits.filter((p) => p.categorie === filtre) : produits;

  function majQte(id: string, delta: number) {
    const produit = produits.find((p) => p._id === id);
    const max = produit?.categorie === "Menus" ? 50 : Math.min(50, produit?.stock ?? 0);
    setQtes((q) => ({ ...q, [id]: Math.max(0, Math.min(max, (q[id] || 0) + delta)) }));
  }

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (panier.length === 0) {
      setErreur("Ajoute au moins un produit à ta commande.");
      return;
    }
    if (!form.prenom.trim() || !form.nom.trim() || !form.email.trim()) {
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
          email: form.email.trim(),
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
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-sm text-muted">Prénom</span>
              <input
                value={form.prenom}
                onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                className="w-full bg-card border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-muted">Nom</span>
              <input
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                className="w-full bg-card border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-muted">Adresse mail</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-card border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-muted">Bâtiment</span>
              <select
                value={form.batiment}
                onChange={(e) => setForm({ ...form, batiment: e.target.value })}
                className="w-full bg-card border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
              >
                <option value="Orion">Orion</option>
                <option value="Antares">Antares</option>
              </select>
            </label>
          </div>

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
              const stock = p.stock ?? 0;
              const avecChoix = menu && (p.composition?.some((c) => c.categorie) ?? false);
              return (
              <div key={p._id} className="space-y-2">
              <div className="flex items-center justify-between gap-4 border border-line rounded-xl p-4 bg-card">
                <ImageProduit src={p.image} alt={p.nom} className="w-16 h-16 shrink-0" width={96} height={96} />
                <div className="flex-1">
                  <p className="font-bold">{p.nom}</p>
                  <p className="text-sm text-muted">{p.description || ""}</p>
                  {!menu && (
                    <p className="text-sm">
                      {stock > 0 ? (
                        <span className="text-muted">{stock} en stock</span>
                      ) : (
                        <span className="text-red-500 font-semibold">Rupture de stock</span>
                      )}
                    </p>
                  )}
                  <p className="text-cesi-jaune font-semibold">{p.prix.toFixed(2)} €</p>
                </div>
                <div className="flex items-center gap-3">
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
              {avecChoix && (qtes[p._id] || 0) > 0 && (
                <div className="border border-line rounded-xl p-4 bg-card space-y-2">
                  <p className="text-sm font-bold">Composition de ton menu</p>
                  {(p.composition || []).map((c, i) =>
                    c.categorie ? (
                      <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted min-w-20">{c.qte > 1 ? `${c.qte} × ` : ""}{c.categorie}</span>
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
                            className="bg-card border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
                          >
                            {produits
                              .filter((v) => v.categorie === c.categorie && v.actif !== false)
                              .map((v) => (
                                <option key={v._id} value={v._id}>
                                  {v.nom}
                                </option>
                              ))}
                          </select>
                        ))}
                      </div>
                    ) : (
                      <p key={i} className="text-sm text-muted">
                        {c.qte > 1 ? `${c.qte} × ` : ""}{c.nomProduit}
                      </p>
                    )
                  )}
                </div>
              )}
              </div>
              );
            })}
          </div>
        </div>

        <aside className="border border-line rounded-xl p-5 bg-card lg:sticky lg:top-20 space-y-4">
          <h2 className="text-lg font-bold">Panier</h2>
          {panier.length === 0 ? (
            <p className="text-muted text-sm">Aucun produit sélectionné.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {panier.map((l) => (
                <li key={l.produit._id} className="flex justify-between">
                  <span>
                    {l.qte} × {l.produit.nom}
                  </span>
                  <span>{(l.qte * l.produit.prix).toFixed(2)} €</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-between font-black text-lg border-t border-line pt-3">
            <span>Total</span>
            <span className="text-cesi-jaune">{total.toFixed(2)} €</span>
          </div>
          {erreur && <p className="text-red-500 text-sm">{erreur}</p>}
          <button
            type="submit"
            disabled={envoi}
            className="w-full bg-cesi-jaune text-black font-bold py-3 rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-50"
          >
            {envoi ? "Envoi…" : "Valider la commande"}
          </button>
          <p className="text-xs text-muted text-center">Paiement sur place (espèces / Lydia).</p>
        </aside>
      </form>
    </div>
  );
}
