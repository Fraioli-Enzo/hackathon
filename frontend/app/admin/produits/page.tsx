"use client";

import { useCallback, useEffect, useState } from "react";
import ImageProduit from "@/components/ImageProduit";
import AdminNav from "@/components/AdminNav";
import Banniere from "@/components/Banniere";
import Popup from "@/components/Popup";
import BoutonRafraichir from "@/components/BoutonRafraichir";
import { Icon, addIcon } from "@iconify/react";
import {
  phPlusBold,
  phCheckBold,
  phMinusBold,
  phMagnifyingGlassBold,
  phTrashBold,
  phUploadSimpleBold,
} from "@/lib/icons";

addIcon("ph:plus-bold", phPlusBold);
addIcon("ph:check-bold", phCheckBold);
addIcon("ph:minus-bold", phMinusBold);
addIcon("ph:magnifying-glass-bold", phMagnifyingGlassBold);
addIcon("ph:trash-bold", phTrashBold);
addIcon("ph:upload-simple-bold", phUploadSimpleBold);
import PopupConfirmation from "@/components/PopupConfirmation";
import type { ProduitClient } from "@/lib/types";
import { CATEGORIES, IMAGES_PRODUITS } from "@/lib/types";

export default function AdminProduitsPage() {
  const [produits, setProduits] = useState<ProduitClient[]>([]);
  const [nouveau, setNouveau] = useState({ nom: "", prix: "", description: "", stock: "", image: "", categorie: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState("");
  const [recherche, setRecherche] = useState("");
  const [aSupprimer, setASupprimer] = useState<{ id: string; nom: string } | null>(null);
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [tri, setTri] = useState("nom-asc");
  const [envoiImage, setEnvoiImage] = useState(false);

  const charger = useCallback(async () => {
    const res = await fetch("/api/produits?all=1");
    const data = await res.json();
    if (res.ok) setProduits(data.produits || []);
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const categories = CATEGORIES.filter((c) => produits.some((p) => p.categorie === c));
  const q = recherche.trim().toLowerCase();
  const produitsAffiches = produits
    .filter((p) => (!filtre || p.categorie === filtre) && (!q || p.nom.toLowerCase().includes(q)))
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

  // Redimensionne l'image importée à 512 px max (JPEG, fond blanc) avant l'envoi
  function redimensionnerFichier(fichier: File, max = 512): Promise<string> {
    return new Promise((resoudre, rejeter) => {
      const url = URL.createObjectURL(fichier);
      const img = new Image();
      img.onload = () => {
        try {
          const echelle = Math.min(1, max / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * echelle));
          const h = Math.max(1, Math.round(img.height * echelle));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas indisponible.");
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resoudre(canvas.toDataURL("image/jpeg", 0.85));
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        rejeter(new Error("Image illisible."));
      };
      img.src = url;
    });
  }

  async function importerPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = ""; // permettre de re-sélectionner le même fichier
    if (!fichier) return;
    setErreur(null);
    if (!fichier.type.startsWith("image/")) {
      setErreur("Choisis un fichier image (JPEG, PNG ou WebP).");
      return;
    }
    setEnvoiImage(true);
    try {
      const data = await redimensionnerFichier(fichier);
      const res = await fetch("/api/admin/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErreur(json.error || "Import impossible.");
        return;
      }
      setNouveau((n) => ({ ...n, image: json.image }));
    } catch {
      setErreur("Image illisible.");
    } finally {
      setEnvoiImage(false);
    }
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

      <div className="flex items-center justify-between gap-3 mb-6 max-sm:flex-col max-sm:items-stretch">
        <h1 className="text-3xl font-black">Produits & prix</h1>
        <div className="flex items-center gap-2">
          <BoutonRafraichir onClick={charger} className="max-sm:flex-1 max-sm:justify-center" />
          <button
            onClick={() => setAjoutOuvert(true)}
            className="inline-flex items-center justify-center gap-1.5 bg-cesi-jaune text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors max-sm:flex-1"
          >
            <Icon icon="ph:plus-bold" ssr className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </div>

      {ajoutOuvert && (
        <Popup titre="Ajouter un produit" onFermer={() => setAjoutOuvert(false)}>
          <form onSubmit={ajouter} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="space-y-1 sm:col-span-2">
              <span className="text-sm text-muted">Photo</span>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={nouveau.image}
                  onChange={(e) => setNouveau({ ...nouveau, image: e.target.value })}
                  aria-label="Choisir une photo de la bibliothèque"
                  className="flex-1 min-w-[10rem] bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
                >
                  <option value="">Aucune</option>
                  {nouveau.image && !Object.values(IMAGES_PRODUITS).includes(nouveau.image) && (
                    <option value={nouveau.image}>Photo importée</option>
                  )}
                  {Object.entries(IMAGES_PRODUITS).map(([cle, chemin]) => (
                    <option key={chemin} value={chemin}>
                      {cle}
                    </option>
                  ))}
                </select>
                <label
                  className={`inline-flex items-center gap-1.5 border border-line rounded-lg px-3 py-2 text-sm font-bold cursor-pointer transition-colors hover:border-cesi-jaune ${
                    envoiImage ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  <Icon icon="ph:upload-simple-bold" ssr aria-hidden="true" className="w-4 h-4" />
                  {envoiImage ? "Envoi…" : "Importer…"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={importerPhoto}
                    disabled={envoiImage}
                  />
                </label>
                {nouveau.image && (
                  <ImageProduit
                    src={nouveau.image}
                    alt="Photo choisie"
                    className="w-10 h-10 shrink-0"
                    ajustement="contain"
                    width={80}
                    height={80}
                  />
                )}
              </div>
            </div>
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
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon
              icon="ph:magnifying-glass-bold"
              ssr
              aria-hidden="true"
              className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher…"
              aria-label="Rechercher un produit"
              className="w-40 sm:w-48 text-sm bg-card border border-line rounded-lg pl-8 pr-3 py-1.5 focus:border-cesi-jaune focus:outline-none"
            />
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
      </div>

      <div className="space-y-3">
        {produitsAffiches.map((p) => (
          <LigneProduit key={p._id} produit={p} onModifier={modifier} onSupprimer={(id, nom) => setASupprimer({ id, nom })} />
        ))}
        {produitsAffiches.length === 0 && (
          <div className="text-center py-12 border border-dashed border-line rounded-xl">
            <p className="font-bold">Aucun produit</p>
            <p className="text-muted text-sm mt-1">
              {produits.length === 0
                ? "Ajoute ton premier produit au catalogue."
                : "Aucun produit ne correspond à ta recherche."}
            </p>
          </div>
        )}
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
  const [form, setForm] = useState({
    nom: produit.nom,
    prix: String(produit.prix),
    description: produit.description || "",
    stock: String(produit.stock ?? 0),
    image: produit.image || "",
    categorie: produit.categorie || "",
  });

  const prixNum = parseFloat(form.prix.replace(",", "."));
  const stockNum = parseInt(form.stock, 10);
  const actif = produit.actif !== false;
  const estMenu = form.categorie === "Menus";

  const modifie =
    form.nom.trim() !== produit.nom ||
    (Number.isFinite(prixNum) && prixNum !== produit.prix) ||
    form.description !== (produit.description || "") ||
    (!estMenu && Number.isInteger(stockNum) && stockNum !== (produit.stock ?? 0)) ||
    form.image !== (produit.image || "") ||
    form.categorie !== (produit.categorie || "");

  const sauvable = modifie && form.nom.trim() !== "" && Number.isFinite(prixNum) && prixNum > 0;

  const badgeClasse = !actif
    ? "bg-line/60 text-content"
    : estMenu || (produit.stock ?? 0) > 0
      ? "bg-green-500/10 text-green-600"
      : "bg-red-500/10 text-red-500";
  const badgeTexte = !actif ? "Masqué" : estMenu || (produit.stock ?? 0) > 0 ? "En vente" : "Épuisé";

  function maj(partial: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...partial }));
  }

  function pasStock(delta: number) {
    const v = parseInt(form.stock, 10);
    const base = Number.isInteger(v) && v >= 0 ? v : 0;
    maj({ stock: String(Math.max(0, base + delta)) });
  }

  function annuler() {
    setForm({
      nom: produit.nom,
      prix: String(produit.prix),
      description: produit.description || "",
      stock: String(produit.stock ?? 0),
      image: produit.image || "",
      categorie: produit.categorie || "",
    });
  }

  function sauver() {
    if (!sauvable) return;
    onModifier(produit._id, {
      nom: form.nom.trim(),
      prix: prixNum,
      ...(!estMenu && Number.isInteger(stockNum) && stockNum >= 0 ? { stock: stockNum } : {}),
      description: form.description,
      image: form.image,
      categorie: form.categorie,
    });
  }

  const champClasse =
    "w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none";

  return (
    <div
      className={`border rounded-xl bg-card p-4 sm:p-5 transition-colors ${
        modifie ? "border-cesi-jaune" : "border-line"
      }`}
    >
      {/* Identité : photo, nom, description, statut */}
      <div className="flex items-start gap-4 max-sm:flex-wrap">
        <ImageProduit
          src={form.image}
          alt={form.nom.trim() || produit.nom}
          className="w-14 h-14 sm:w-16 sm:h-16 shrink-0"
          ajustement="contain"
          width={128}
          height={128}
        />
        <div className="flex-1 min-w-[10rem] space-y-2">
          <input
            value={form.nom}
            onChange={(e) => maj({ nom: e.target.value })}
            aria-label="Nom du produit"
            className="w-full text-lg font-bold bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
          />
          <input
            value={form.description}
            onChange={(e) => maj({ description: e.target.value })}
            aria-label="Description"
            placeholder="Courte description affichée aux élèves…"
            className="w-full text-sm bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none text-muted"
          />
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0 max-sm:w-full max-sm:flex-row max-sm:items-center max-sm:justify-between">
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${badgeClasse}`}
          >
            {badgeTexte}
          </span>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="sr-only"
              checked={actif}
              onChange={(e) => onModifier(produit._id, { actif: e.target.checked })}
            />
            <span
              className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
                actif ? "bg-cesi-jaune" : "bg-line"
              }`}
              aria-hidden="true"
            >
              <span
                className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  actif ? "translate-x-4" : ""
                }`}
              />
            </span>
            <span className="text-sm text-muted whitespace-nowrap">{actif ? "En vente" : "En pause"}</span>
          </label>
        </div>
      </div>

      {/* Champs : prix, stock, catégorie, photo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
        <label className="space-y-1 min-w-0">
          <span className="block text-xs font-semibold text-muted">Prix (€)</span>
          <input
            value={form.prix}
            onChange={(e) => maj({ prix: e.target.value })}
            inputMode="decimal"
            aria-label="Prix en euros"
            className={`${champClasse} text-right`}
          />
        </label>
        {estMenu ? (
          <div className="space-y-1 min-w-0">
            <span className="block text-xs font-semibold text-muted">Stock</span>
            <p className="text-xs text-muted px-1 pt-2.5">Géré par les composants du menu</p>
          </div>
        ) : (
          <div className="space-y-1 min-w-0">
            <span className="block text-xs font-semibold text-muted">Stock</span>
            <div className="flex items-stretch bg-surface border border-line rounded-lg overflow-hidden focus-within:border-cesi-jaune">
              <button
                type="button"
                onClick={() => pasStock(-1)}
                disabled={(Number.isInteger(stockNum) ? stockNum : 0) <= 0}
                aria-label="Diminuer le stock"
                className="px-2.5 text-content hover:bg-cesi-jaune/15 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <Icon icon="ph:minus-bold" ssr aria-hidden="true" className="w-3.5 h-3.5" />
              </button>
              <input
                value={form.stock}
                onChange={(e) => maj({ stock: e.target.value })}
                inputMode="numeric"
                aria-label="Stock"
                className="w-10 bg-transparent border-0 text-center py-2 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => pasStock(1)}
                aria-label="Augmenter le stock"
                className="px-2.5 text-content hover:bg-cesi-jaune/15"
              >
                <Icon icon="ph:plus-bold" ssr aria-hidden="true" className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
        <label className="space-y-1 min-w-0">
          <span className="block text-xs font-semibold text-muted">Catégorie</span>
          <select
            value={form.categorie}
            onChange={(e) => maj({ categorie: e.target.value })}
            className={`${champClasse} text-sm`}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 min-w-0">
          <span className="block text-xs font-semibold text-muted">Photo</span>
          <select
            value={form.image}
            onChange={(e) => maj({ image: e.target.value })}
            className={`${champClasse} text-sm`}
          >
            <option value="">Aucune</option>
            {form.image && !Object.values(IMAGES_PRODUITS).includes(form.image) && (
              <option value={form.image}>Photo importée</option>
            )}
            {Object.entries(IMAGES_PRODUITS).map(([cle, chemin]) => (
              <option key={chemin} value={chemin}>
                {cle}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* État et actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-line">
        <p className="flex items-center gap-2 text-xs text-muted" aria-live="polite">
          <span
            className={`w-2 h-2 rounded-full ${modifie ? "bg-cesi-jaune" : "bg-green-500"}`}
            aria-hidden="true"
          />
          {modifie ? "Modifications non enregistrées" : "À jour"}
        </p>
        <div className="flex flex-wrap gap-2 max-sm:w-full">
          {modifie && (
            <button
              type="button"
              onClick={annuler}
              className="border border-line font-bold px-4 py-2 rounded-lg hover:border-cesi-jaune transition-colors max-sm:flex-1"
            >
              Annuler
            </button>
          )}
          <button
            type="button"
            onClick={sauver}
            disabled={!sauvable}
            className="inline-flex items-center justify-center gap-1.5 bg-cesi-jaune text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-cesi-jaune max-sm:flex-1"
          >
            <Icon icon="ph:check-bold" ssr aria-hidden="true" className="w-4 h-4" />
            Enregistrer
          </button>
          <button
            type="button"
            onClick={() => onSupprimer(produit._id, produit.nom)}
            className="inline-flex items-center justify-center gap-1.5 border border-red-500 text-red-500 font-bold px-4 py-2 rounded-lg hover:bg-red-500 hover:text-white focus-visible:bg-red-500 focus-visible:text-white transition-colors max-sm:flex-1"
          >
            <Icon icon="ph:trash-bold" ssr aria-hidden="true" className="w-4 h-4" />
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
