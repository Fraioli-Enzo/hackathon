"use client";

import { useCallback, useEffect, useState } from "react";
import ImageProduit from "@/components/ImageProduit";
import AdminNav from "@/components/AdminNav";
import Banniere from "@/components/Banniere";
import Popup from "@/components/Popup";
import { Icon, addIcon } from "@iconify/react";
import { phPlusBold } from "@/lib/icons";

addIcon("ph:plus-bold", phPlusBold);
import PopupConfirmation from "@/components/PopupConfirmation";
import type { ProduitClient } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

export default function AdminProduitsPage() {
  const [produits, setProduits] = useState<ProduitClient[]>([]);
  const [nouveau, setNouveau] = useState({ nom: "", prix: "", description: "", stock: "", image: "", categorie: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState("");
  const [aSupprimer, setASupprimer] = useState<{ id: string; nom: string } | null>(null);
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [tri, setTri] = useState("nom-asc");

  const charger = useCallback(async () => {
    const res = await fetch("/api/produits?all=1");
    const data = await res.json();
    if (res.ok) setProduits(data.produits || []);
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const categories = CATEGORIES.filter((c) => produits.some((p) => p.categorie === c));
  const produitsAffiches = produits
    .filter((p) => !filtre || p.categorie === filtre)
    .sort((a, b) => {
      switch (tri) {
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
        categorie: nouveau.categorie,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErreur(data.error || "Erreur.");
      return;
    }
    setNouveau({ nom: "", prix: "", description: "", stock: "", image: "", categorie: "" });
    setAjoutOuvert(false);
    informer("Produit ajouté.");
    charger();
  }

  async function modifier(id: string, maj: Partial<ProduitClient>) {
    const res = await fetch(`/api/produits/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(maj),
    });
    if (res.ok) {
      const nom = typeof maj.nom === "string" ? maj.nom : undefined;
      informer(nom ? `« ${nom} » mis à jour.` : "Modification enregistrée.");
      charger();
    } else {
      setErreur("Modification impossible.");
    }
  }

  async function confirmerSuppression() {
    if (!aSupprimer) return;
    const res = await fetch(`/api/produits/${aSupprimer.id}`, { method: "DELETE" });
    setASupprimer(null);
    if (res.ok) informer(`« ${aSupprimer.nom} » supprimé.`);
    else setErreur("Suppression impossible.");
    charger();
  }

  return (
    <div>
      <AdminNav />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black">Produits & prix</h1>
        <button
          onClick={() => setAjoutOuvert(true)}
          className="inline-flex items-center gap-1.5 bg-cesi-jaune text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
        >
          <Icon icon="ph:plus-bold" ssr className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      

      {ajoutOuvert && (
        <Popup titre="Ajouter un produit" onFermer={() => setAjoutOuvert(false)}>
      <form onSubmit={ajouter} className="grid grid-cols-1 sm:grid-cols-2 gap-3 ">
        <label className="space-y-1">
          <span className="text-sm text-muted">Nom</span>
          <input
            value={nouveau.nom}
            onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-muted">Prix (€)</span>
          <input
            value={nouveau.prix}
            onChange={(e) => setNouveau({ ...nouveau, prix: e.target.value })}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
            placeholder="2.50"
          />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm text-muted">Description</span>
          <input
            value={nouveau.description}
            onChange={(e) => setNouveau({ ...nouveau, description: e.target.value })}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-muted">Stock</span>
          <input
            value={nouveau.stock}
            onChange={(e) => setNouveau({ ...nouveau, stock: e.target.value })}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
            placeholder="0"
            inputMode="numeric"
          />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm text-muted">Image (chemin)</span>
          <input
            value={nouveau.image}
            onChange={(e) => setNouveau({ ...nouveau, image: e.target.value })}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
            placeholder="/images/bao.webp"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-muted">Catégorie</span>
          <select
            value={nouveau.categorie}
            onChange={(e) => setNouveau({ ...nouveau, categorie: e.target.value })}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <div className="col-span-1 sm:col-span-2 flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => setAjoutOuvert(false)}
            className="border border-line font-bold px-4 py-2 rounded-lg hover:border-cesi-jaune transition-colors max-sm:flex-1 max-sm:py-3"
          >
            Annuler
          </button>
          <button type="submit" className="bg-cesi-jaune text-black font-bold px-5 py-2 rounded-lg hover:bg-yellow-300 max-sm:flex-1 max-sm:py-3">
            Ajouter
          </button>
        </div>
      </form>
        </Popup>
      )}
      <Banniere texte={erreur} type="erreur" />
      <Banniere texte={message} type="succes" />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les produits">
          <button
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
              onClick={() => setFiltre(c)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                filtre === c ? "bg-cesi-jaune text-black border-cesi-jaune font-bold" : "border-line hover:border-cesi-jaune"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <select
          value={tri}
          onChange={(e) => setTri(e.target.value)}
          className="text-sm bg-card border border-line rounded-lg px-3 py-1.5 focus:border-cesi-jaune focus:outline-none"
          aria-label="Trier les produits"
        >
          <option value="nom-asc">Nom (A à Z)</option>
          <option value="nom-desc">Nom (Z à A)</option>
          <option value="prix-asc">Prix croissant</option>
          <option value="prix-desc">Prix décroissant</option>
        </select>
      </div>

      <div className="space-y-3">
        {produitsAffiches.map((p) => (
          <LigneProduit key={p._id} produit={p} onModifier={modifier} onSupprimer={(id, nom) => setASupprimer({ id, nom })} />
        ))}
        {produits.length === 0 && <p className="text-muted">Aucun produit.</p>}
      </div>

      {aSupprimer && (
        <PopupConfirmation
          titre="Supprimer le produit ?"
          message={`« ${aSupprimer.nom} » sera définitivement supprimé du catalogue.`}
          onConfirmer={confirmerSuppression}
          onAnnuler={() => setASupprimer(null)}
        />
      )}
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
  const [categorie, setCategorie] = useState(produit.categorie || "");

  function sauver() {
    const prixNum = parseFloat(prix.replace(",", "."));
    const stockNum = parseInt(stock, 10);
    onModifier(produit._id, {
      nom,
      ...(Number.isFinite(prixNum) && prixNum > 0 ? { prix: prixNum } : {}),
      ...(Number.isInteger(stockNum) && stockNum >= 0 ? { stock: stockNum } : {}),
      description,
      image,
      categorie,
    });
  }

  return (
    <div className="border border-line rounded-xl bg-card p-4 flex flex-wrap items-center gap-3">
      <ImageProduit src={produit.image} alt={produit.nom} className="w-12 h-12 shrink-0" width={72} height={72} />
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
      {categorie !== "Menus" && (
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="w-16 bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
            inputMode="numeric"
          />
          en stock
        </label>
      )}
      <select
        value={categorie}
        onChange={(e) => setCategorie(e.target.value)}
        className="w-32 bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none text-sm"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
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
        className="border border-red-500 text-red-500 font-bold px-4 py-2 rounded-lg hover:bg-red-500 hover:text-white focus-visible:bg-red-500 focus-visible:text-white transition-colors"
      >
        Supprimer
      </button>
    </div>
  );
}
