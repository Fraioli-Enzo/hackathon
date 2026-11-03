"use client";

import { useEffect, useState } from "react";
import ImageProduit from "@/components/ImageProduit";
import AdminNav from "@/components/AdminNav";
import type { Recap } from "@/lib/types";

export default function AdminDashboard() {
  const [recap, setRecap] = useState<Recap | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/recap")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Erreur de chargement"))))
      .then(setRecap)
      .catch((e) => setErreur(e.message));
  }, []);

  if (erreur) return <p className="text-red-500">{erreur}</p>;
  if (!recap) return <p className="text-muted">Chargement…</p>;

  const debut = new Date(recap.debut).toLocaleDateString("fr-FR");
  const fin = new Date(recap.fin).toLocaleDateString("fr-FR");
  const imageParNom = new Map((recap.imagesProduits || []).map((p) => [p.nom, p.image]));
  // Les lignes de menus ont un libellé détaillé : on cherche l'image par nom exact,
  // puis par préfixe (ex. « Menu Asia Cookie (Bao au Boeuf + ...) »)
  function imageDe(nom: string): string | undefined {
    const exacte = imageParNom.get(nom);
    if (exacte) return exacte;
    for (const [nomProduit, image] of Array.from(imageParNom.entries())) {
      if (image && nom.startsWith(nomProduit)) return image;
    }
    return undefined;
  }

  return (
    <div>
      <AdminNav />
      <h1 className="text-3xl font-black mb-2">Panier de la semaine</h1>
      <p className="text-muted mb-6">
        Semaine du {debut} au {fin}
      </p>

      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <div className="border border-line rounded-xl bg-card p-4">
          <p className="text-sm text-muted">Commandes</p>
          <p className="text-3xl font-black text-cesi-jaune">{recap.nbCommandes}</p>
        </div>
        <div className="border border-line rounded-xl bg-card p-4">
          <p className="text-sm text-muted">CA de la semaine</p>
          <p className="text-3xl font-black">{recap.ca.toFixed(2)} €</p>
        </div>
        <div className="border border-line rounded-xl bg-card p-4">
          <p className="text-sm text-muted">En attente</p>
          <p className="text-3xl font-black">{recap.enAttente}</p>
        </div>
        <div className="border border-line rounded-xl bg-card p-4">
          <p className="text-sm text-muted">Récupérées</p>
          <p className="text-3xl font-black">{recap.recuperees}</p>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-3">À acheter</h2>
      {recap.produits.length === 0 ? (
        <p className="text-muted">Aucune commande cette semaine.</p>
      ) : (
        <div className="border border-line rounded-xl overflow-hidden max-sm:border-0 max-sm:rounded-none">
          <table className="w-full text-left bg-card max-sm:block max-sm:bg-transparent">
            <thead className="border-b border-line text-muted text-sm max-sm:hidden">
              <tr>
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3 text-right">Quantité</th>
                <th className="px-4 py-3 text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              {recap.produits.map((p) => (
                <tr key={p.nom} className="max-sm:block max-sm:mb-3 max-sm:rounded-xl max-sm:border max-sm:border-line max-sm:bg-card max-sm:p-4 sm:border-b sm:border-line sm:last:border-0">
                  <td data-label="Produit" className="px-4 py-3 font-semibold max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-3 max-sm:py-1.5 max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted">
                    <div className="flex items-center gap-3">
                      <ImageProduit src={imageDe(p.nom)} alt={p.nom} className="w-9 h-9" width={54} height={54} />
                      {p.nom}
                    </div>
                  </td>
                  <td data-label="Quantité" className="px-4 py-3 text-right font-black text-cesi-jaune max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-3 max-sm:py-1.5 max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted">{p.qte}</td>
                  <td data-label="Montant" className="px-4 py-3 text-right max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-3 max-sm:py-1.5 max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted">{p.total.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="text-xl font-bold mb-3 mt-8">Stock restant</h2>
      {recap.stockRestant?.length ? (
        <div className="border border-line rounded-xl overflow-hidden max-sm:border-0 max-sm:rounded-none">
          <table className="w-full text-left bg-card max-sm:block max-sm:bg-transparent">
            <thead className="border-b border-line text-muted text-sm max-sm:hidden">
              <tr>
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3 text-right">Stock</th>
              </tr>
            </thead>
            <tbody>
              {recap.stockRestant.map((p) => (
                <tr key={p.nom} className="max-sm:block max-sm:mb-3 max-sm:rounded-xl max-sm:border max-sm:border-line max-sm:bg-card max-sm:p-4 sm:border-b sm:border-line sm:last:border-0">
                  <td data-label="Produit" className="px-4 py-3 font-semibold max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-3 max-sm:py-1.5 max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted">
                    <div className="flex items-center gap-3">
                      <ImageProduit src={p.image} alt={p.nom} className="w-9 h-9" width={54} height={54} />
                      {p.nom}
                    </div>
                  </td>
                  <td data-label="Stock" className="px-4 py-3 text-right font-bold max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-3 max-sm:py-1.5 max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted">
                    {p.stock === 0 ? (
                      <span className="text-red-500">Rupture</span>
                    ) : p.stock <= 10 ? (
                      <span className="text-orange-500">{p.stock}</span>
                    ) : (
                      p.stock
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted">Aucun produit actif.</p>
      )}
    </div>
  );
}
