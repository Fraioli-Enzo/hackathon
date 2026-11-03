"use client";

import { useCallback, useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import ImageProduit from "@/components/ImageProduit";
import type { ProduitClient } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

export default function AdminStockPage() {
  const [produits, setProduits] = useState<ProduitClient[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [nouveau, setNouveau] = useState({ nom: "", prix: "", stock: "", categorie: "" });

  const charger = useCallback(async () => {
    const res = await fetch("/api/produits?all=1");
    const data = await res.json();
    if (res.ok) setProduits((data.produits || []).filter((p: ProduitClient) => p.categorie !== "Menus"));
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  function informer(texte: string) {
    setMessage(texte);
    setErreur(null);
    setTimeout(() => setMessage(null), 3000);
  }

  async function majStock(produit: ProduitClient, stock: number) {
    const valeur = Math.max(0, stock);
    setProduits((ps) => ps.map((p) => (p._id === produit._id ? { ...p, stock: valeur } : p)));
    const res = await fetch(`/api/produits/${produit._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: valeur }),
    });
    if (res.ok) {
      informer(`Stock de « ${produit.nom} » : ${valeur}.`);
    } else {
      setErreur("Impossible de modifier le stock.");
      charger();
    }
  }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    const prix = parseFloat(nouveau.prix.replace(",", "."));
    const stock = nouveau.stock.trim() === "" ? 0 : parseInt(nouveau.stock, 10);
    if (!nouveau.nom.trim() || !Number.isFinite(prix) || prix <= 0 || !Number.isInteger(stock) || stock < 0) {
      setErreur("Nom, prix valide et stock valide (entier) requis.");
      return;
    }
    const res = await fetch("/api/produits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: nouveau.nom, prix, stock, categorie: nouveau.categorie }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErreur(data.error || "Erreur.");
      return;
    }
    setNouveau({ nom: "", prix: "", stock: "", categorie: "" });
    informer("Produit ajouté.");
    charger();
  }

  async function supprimer(id: string, nom: string) {
    if (!confirm(`Supprimer « ${nom} » ?`)) return;
    const res = await fetch(`/api/produits/${id}`, { method: "DELETE" });
    if (res.ok) informer("Produit supprimé.");
    else setErreur("Suppression impossible.");
    charger();
  }

  return (
    <div>
      <AdminNav />
      <h1 className="text-3xl font-black mb-6">Stock</h1>

      <form onSubmit={ajouter} className="flex flex-wrap gap-3 items-end mb-8 border border-line rounded-xl bg-card p-4">
        <label className="flex-1 min-w-[160px] space-y-1">
          <span className="text-sm text-muted">Nom</span>
          <input
            value={nouveau.nom}
            onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
          />
        </label>
        <label className="w-28 space-y-1">
          <span className="text-sm text-muted">Prix (€)</span>
          <input
            value={nouveau.prix}
            onChange={(e) => setNouveau({ ...nouveau, prix: e.target.value })}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
            inputMode="decimal"
            placeholder="2.50"
          />
        </label>
        <label className="w-28 space-y-1">
          <span className="text-sm text-muted">Stock</span>
          <input
            value={nouveau.stock}
            onChange={(e) => setNouveau({ ...nouveau, stock: e.target.value })}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
            inputMode="numeric"
            placeholder="0"
          />
        </label>
        <label className="w-40 space-y-1">
          <span className="text-sm text-muted">Catégorie</span>
          <select
            value={nouveau.categorie}
            onChange={(e) => setNouveau({ ...nouveau, categorie: e.target.value })}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
          >
            {CATEGORIES.filter((c) => c !== "Menus").map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="bg-cesi-jaune text-black font-bold px-5 py-2 rounded-lg hover:bg-yellow-300">
          Ajouter
        </button>
      </form>

      {erreur && <p className="text-red-500 border border-red-500 bg-red-500/10 rounded-lg px-4 py-2 mb-4">{erreur}</p>}
      {message && <p className="text-green-600 border border-green-500 bg-green-500/10 rounded-lg px-4 py-2 mb-4">{message}</p>}

      <div className="border border-line rounded-xl overflow-hidden">
        <table className="w-full text-left bg-card text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              <th className="px-4 py-3">Produit</th>
              <th className="px-4 py-3">Catégorie</th>
              <th className="px-4 py-3">Prix</th>
              <th className="px-4 py-3 text-center">Stock</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {produits.map((p) => (
              <tr key={p._id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ImageProduit src={p.image} alt={p.nom} className="w-9 h-9" width={54} height={54} />
                    <span className="font-semibold">{p.nom}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted">{p.categorie}</td>
                <td className="px-4 py-3">{p.prix.toFixed(2)} €</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => majStock(p, (p.stock ?? 0) - 1)}
                      className="w-8 h-8 rounded-lg border border-line font-bold hover:border-cesi-jaune"
                      aria-label={`Retirer une unité de stock de ${p.nom}`}
                    >
                      −
                    </button>
                    <input
                      value={String(p.stock ?? 0)}
                      onChange={(e) => setProduits((ps) => ps.map((x) => (x._id === p._id ? { ...x, stock: parseInt(e.target.value, 10) || 0 } : x)))}
                      onBlur={(e) => majStock(p, parseInt(e.target.value, 10) || 0)}
                      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                      className="w-16 text-center bg-surface border border-line rounded-lg px-2 py-1 focus:border-cesi-jaune focus:outline-none"
                      inputMode="numeric"
                    />
                    <button
                      onClick={() => majStock(p, (p.stock ?? 0) + 1)}
                      className="w-8 h-8 rounded-lg bg-cesi-jaune text-black font-bold hover:bg-yellow-300"
                      aria-label={`Ajouter une unité de stock de ${p.nom}`}
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => supprimer(p._id, p.nom)}
                    className="border border-line font-bold px-4 py-2 rounded-lg hover:border-red-500 hover:text-red-500 transition-colors"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {produits.length === 0 && <p className="text-muted p-4">Aucun produit de base.</p>}
      </div>
    </div>
  );
}
