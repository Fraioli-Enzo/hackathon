"use client";

import { useCallback, useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import { Icon, addIcon } from "@iconify/react";
import { phCaretUp, phCaretDown, phPlusBold } from "@/lib/icons";

addIcon("ph:caret-up", phCaretUp);
addIcon("ph:caret-down", phCaretDown);
addIcon("ph:plus-bold", phPlusBold);
import Banniere from "@/components/Banniere";
import Popup from "@/components/Popup";
import PopupConfirmation from "@/components/PopupConfirmation";
import ImageProduit from "@/components/ImageProduit";
import BoutonRafraichir from "@/components/BoutonRafraichir";
import type { ProduitClient } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

export default function AdminStockPage() {
  const [produits, setProduits] = useState<ProduitClient[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [nouveau, setNouveau] = useState({ nom: "", prix: "", stock: "", categorie: "" });
  const [filtre, setFiltre] = useState("");
  const [edition, setEdition] = useState<string | null>(null);
  const [aSupprimer, setASupprimer] = useState<ProduitClient | null>(null);
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [tri, setTri] = useState<{ champ: "nom" | "prix" | "stock"; sens: 1 | -1 }>({ champ: "nom", sens: 1 });

  const charger = useCallback(async () => {
    const res = await fetch("/api/produits?all=1");
    const data = await res.json();
    if (res.ok) setProduits((data.produits || []).filter((p: ProduitClient) => p.categorie !== "Menus"));
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const categories = CATEGORIES.filter((c) => produits.some((p) => p.categorie === c));
  const produitsAffiches = produits
    .filter((p) => !filtre || p.categorie === filtre)
    .sort((a, b) => {
      const va = tri.champ === "nom" ? a.nom : a[tri.champ] ?? 0;
      const vb = tri.champ === "nom" ? b.nom : b[tri.champ] ?? 0;
      return va < vb ? -tri.sens : va > vb ? tri.sens : 0;
    });

  function basculerTri(champ: "nom" | "prix" | "stock") {
    setTri((t) => (t.champ === champ ? { champ, sens: t.sens === 1 ? -1 : 1 } : { champ, sens: 1 }));
  }

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
      setEdition(null);
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
    setAjoutOuvert(false);
    informer("Produit ajouté.");
    charger();
  }

  async function confirmerSuppression() {
    if (!aSupprimer) return;
    const res = await fetch(`/api/produits/${aSupprimer._id}`, { method: "DELETE" });
    setASupprimer(null);
    if (res.ok) informer(`« ${aSupprimer.nom} » supprimé.`);
    else setErreur("Suppression impossible.");
    charger();
  }

  return (
    <div>
      <AdminNav />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black">Stock</h1>
        <div className="flex items-center gap-2">
          <BoutonRafraichir onClick={charger} />
          <button
            onClick={() => setAjoutOuvert(true)}
            className="inline-flex items-center gap-1.5 bg-cesi-jaune text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
          >
            <Icon icon="ph:plus-bold" ssr className="w-4 h-4" />
            Ajouter
          </button>
        </div>
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
            inputMode="decimal"
            placeholder="2.50"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-muted">Stock</span>
          <input
            value={nouveau.stock}
            onChange={(e) => setNouveau({ ...nouveau, stock: e.target.value })}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
            inputMode="numeric"
            placeholder="0"
          />
        </label>
        <label className="space-y-1">
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

      <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Filtrer les produits">
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

      <div className="border border-line rounded-xl overflow-hidden max-sm:border-0 max-sm:rounded-none">
        <table className="w-full text-left bg-card text-sm max-sm:block max-sm:bg-transparent">
          <thead className="border-b border-line text-muted max-sm:hidden">
            <tr>
              {([
                { libelle: "Produit", champ: "nom", classe: "px-4 py-3 text-left" },
                { libelle: "Prix", champ: "prix", classe: "px-4 py-3 text-left" },
                { libelle: "Stock", champ: "stock", classe: "px-4 py-3 text-center" },
              ] as const).map((col) => (
                <th key={col.champ} className={col.classe}>
                  <button
                    onClick={() => basculerTri(col.champ)}
                    className="inline-flex items-center gap-1 hover:text-cesi-jaune transition-colors"
                    aria-label={`Trier par ${col.libelle.toLowerCase()}`}
                  >
                    {col.libelle}
                    {tri.champ === col.champ && (
                      <Icon icon={tri.sens === 1 ? "ph:caret-up" : "ph:caret-down"} ssr className="w-3 h-3" />
                    )}
                  </button>
                </th>
              ))}
              <th className="px-4 py-3">Catégorie</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="max-sm:block">
            {produitsAffiches.map((p) => (
              <tr key={p._id} className="max-sm:grid max-sm:grid-cols-[1fr,auto] max-sm:gap-x-3 max-sm:gap-y-3 max-sm:mb-3 max-sm:rounded-xl max-sm:border max-sm:border-line max-sm:bg-card max-sm:p-4 sm:border-b sm:border-line sm:last:border-0">
                <td className="px-4 py-3 max-sm:col-start-1 max-sm:row-start-1 max-sm:py-0">
                  <div className="flex items-center gap-3">
                    <ImageProduit src={p.image} alt={p.nom} className="w-10 h-10" width={60} height={60} />
                    <div className="min-w-0">
                      <p className="font-semibold leading-tight">{p.nom}</p>
                      <p className="text-muted text-xs sm:hidden">{p.categorie} · {p.prix.toFixed(2)} €</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 max-sm:hidden">{p.prix.toFixed(2)} €</td>
                <td className="px-4 py-3 max-sm:col-start-1 max-sm:row-start-2 max-sm:py-0 max-sm:justify-self-start">
                  {edition !== p._id ? (
                    <div className="flex items-center gap-2 font-bold sm:justify-center">
                      <span>{p.stock ?? 0}</span>
                      {(p.stock ?? 0) === 0 && <span className="text-red-500 text-xs font-semibold">Rupture</span>}
                      {(p.stock ?? 0) > 0 && (p.stock ?? 0) <= 10 && <span className="text-orange-500 text-xs font-semibold">bas</span>}
                    </div>
                  ) : (
                  <div className="flex items-center gap-2 sm:justify-center">
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
                  )}
                </td>
                <td className="px-4 py-3 text-muted max-sm:hidden">{p.categorie}</td>
                <td className="px-4 py-3 text-right max-sm:col-start-2 max-sm:row-start-1 max-sm:row-span-2 max-sm:self-center max-sm:justify-self-end max-sm:py-0">
                  <div className="flex justify-end gap-2 max-sm:flex-col max-sm:items-end max-sm:gap-2">
                    {edition === p._id ? (
                      <button
                        onClick={() => setEdition(null)}
                        className="bg-cesi-jaune text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors max-sm:px-3 max-sm:py-1.5 max-sm:text-sm"
                      >
                        Terminé
                      </button>
                    ) : (
                      <button
                        onClick={() => setEdition(p._id)}
                        className="border border-line font-bold px-4 py-2 rounded-lg hover:border-cesi-jaune transition-colors max-sm:px-3 max-sm:py-1.5 max-sm:text-sm"
                      >
                        Modifier
                      </button>
                    )}
                    <button
                      onClick={() => setASupprimer(p)}
                      className="border border-red-500 text-red-500 font-bold px-4 py-2 rounded-lg hover:bg-red-500 hover:text-white focus-visible:bg-red-500 focus-visible:text-white transition-colors max-sm:px-3 max-sm:py-1.5 max-sm:text-sm"
                    >
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {produits.length === 0 && <p className="text-muted p-4">Aucun produit.</p>}
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
