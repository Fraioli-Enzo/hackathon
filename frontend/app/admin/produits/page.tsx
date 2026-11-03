"use client";

import { useCallback, useEffect, useState } from "react";
import ImageProduit from "@/components/ImageProduit";
import AdminNav from "@/components/AdminNav";
import type { ProduitClient } from "@/lib/types";

export default function AdminProduitsPage() {
  const [produits, setProduits] = useState<ProduitClient[]>([]);
  const [nouveau, setNouveau] = useState({ nom: "", prix: "", description: "", stock: "", image: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const res = await fetch("/api/produits?all=1");
    const data = await res.json();
    if (res.ok) setProduits(data.produits || []);
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  function informer(texte: string) {
    setMessage(texte);
    setErreur(null);
    setTimeout(() => setMessage(null), 3000);
  }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    const prix = parseFloat(nouveau.prix.replace(",", "."));
    if (!nouveau.nom.trim() || !Number.isFinite(prix) || prix <= 0) {
      setErreur("Nom et prix valide requis.");
      return;
    }
    const res = await fetch("/api/produits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: nouveau.nom,
        prix,
        description: nouveau.description,
        stock: nouveau.stock.trim() === "" ? 0 : parseInt(nouveau.stock, 10),
        image: nouveau.image.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErreur(data.error || "Erreur.");
      return;
    }
    setNouveau({ nom: "", prix: "", description: "", stock: "", image: "" });
    informer("Produit ajouté.");
    charger();
  }

  async function modifier(id: string, maj: Partial<ProduitClient>) {
    const res = await fetch(`/api/produits/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(maj),
    });
    if (res.ok) charger();
  }

  async function supprimer(id: string, nom: string) {
    if (!confirm(`Supprimer le produit « ${nom} » ?`)) return;
    const res = await fetch(`/api/produits/${id}`, { method: "DELETE" });
    if (res.ok) informer("Produit supprimé.");
    charger();
  }

  return (
    <div>
      <AdminNav />
      <h1 className="text-3xl font-black mb-6">Produits & prix</h1>

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
            placeholder="2.50"
          />
        </label>
        <label className="flex-[2] min-w-[200px] space-y-1">
          <span className="text-sm text-muted">Description</span>
          <input
            value={nouveau.description}
            onChange={(e) => setNouveau({ ...nouveau, description: e.target.value })}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
          />
        </label>
        <label className="w-28 space-y-1">
          <span className="text-sm text-muted">Stock</span>
          <input
            value={nouveau.stock}
            onChange={(e) => setNouveau({ ...nouveau, stock: e.target.value })}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
            placeholder="0"
            inputMode="numeric"
          />
        </label>
        <label className="w-44 space-y-1">
          <span className="text-sm text-muted">Image (chemin)</span>
          <input
            value={nouveau.image}
            onChange={(e) => setNouveau({ ...nouveau, image: e.target.value })}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
            placeholder="/images/bao.webp"
          />
        </label>
        <button type="submit" className="bg-cesi-jaune text-black font-bold px-5 py-2 rounded-lg hover:bg-yellow-300">
          Ajouter
        </button>
      </form>
      {erreur && <p className="text-red-500 mb-4">{erreur}</p>}
      {message && <p className="text-green-600 mb-4">{message}</p>}

      <div className="space-y-3">
        {produits.map((p) => (
          <LigneProduit key={p._id} produit={p} onModifier={modifier} onSupprimer={supprimer} />
        ))}
        {produits.length === 0 && <p className="text-muted">Aucun produit.</p>}
      </div>
    </div>
  );
}

function LigneProduit({
  produit,
  onModifier,
  onSupprimer,
}: {
  produit: ProduitClient;
  onModifier: (id: string, maj: Partial<ProduitClient>) => void;
  onSupprimer: (id: string, nom: string) => void;
}) {
  const [nom, setNom] = useState(produit.nom);
  const [prix, setPrix] = useState(String(produit.prix));
  const [description, setDescription] = useState(produit.description || "");
  const [stock, setStock] = useState(String(produit.stock ?? 0));
  const [image, setImage] = useState(produit.image || "");

  function sauver() {
    const prixNum = parseFloat(prix.replace(",", "."));
    const stockNum = parseInt(stock, 10);
    onModifier(produit._id, {
      nom,
      ...(Number.isFinite(prixNum) && prixNum > 0 ? { prix: prixNum } : {}),
      ...(Number.isInteger(stockNum) && stockNum >= 0 ? { stock: stockNum } : {}),
      description,
      image,
    });
  }

  return (
    <div className="border border-line rounded-xl bg-card p-4 flex flex-wrap items-center gap-3">
      <ImageProduit src={produit.image} alt={produit.nom} className="w-12 h-12 shrink-0" />
      <input
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        className="flex-1 min-w-[120px] bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
      />
      <input
        value={prix}
        onChange={(e) => setPrix(e.target.value)}
        className="w-24 bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className="flex-[2] min-w-[160px] bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
      />
      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className="w-16 bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
          inputMode="numeric"
        />
        en stock
      </label>
      <input
        value={image}
        onChange={(e) => setImage(e.target.value)}
        placeholder="Image (ex. /images/bao.webp)"
        className="w-44 bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none text-sm"
      />
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={produit.actif !== false} onChange={(e) => onModifier(produit._id, { actif: e.target.checked })} />
        Actif
      </label>
      <button onClick={sauver} className="bg-cesi-jaune text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-300">
        Enregistrer
      </button>
      <button
        onClick={() => onSupprimer(produit._id, produit.nom)}
        className="border border-line font-bold px-4 py-2 rounded-lg hover:border-red-500 hover:text-red-500"
      >
        Supprimer
      </button>
    </div>
  );
}
