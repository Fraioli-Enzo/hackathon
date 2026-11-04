"use client";

import { useCallback, useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";
import Banniere from "@/components/Banniere";
import Popup from "@/components/Popup";
import PopupConfirmation from "@/components/PopupConfirmation";
import BoutonRafraichir from "@/components/BoutonRafraichir";

type CompteAdmin = { _id: string; email: string };

export default function AdminComptesPage() {
  const [comptes, setComptes] = useState<CompteAdmin[]>([]);
  const [principal, setPrincipal] = useState("");
  const [moi, setMoi] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [aSupprimer, setASupprimer] = useState<CompteAdmin | null>(null);
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [nouveau, setNouveau] = useState({ email: "", password: "" });

  const charger = useCallback(async () => {
    const res = await fetch("/api/admin/comptes");
    const data = await res.json();
    if (res.ok) {
      setComptes(data.admins || []);
      setPrincipal(data.principal || "");
    }
    const me = await fetch("/api/admin/me");
    if (me.ok) {
      const d = await me.json();
      setMoi(d.email || "");
    }
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
    if (!nouveau.email.trim() || nouveau.password.length < 6) {
      setErreur("Email valide et mot de passe (6 caractères minimum) requis.");
      return;
    }
    const res = await fetch("/api/admin/comptes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: nouveau.email.trim(), password: nouveau.password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErreur(data.error || "Erreur.");
      return;
    }
    setNouveau({ email: "", password: "" });
    setAjoutOuvert(false);
    informer(`Compte admin « ${data.admin.email} » créé.`);
    charger();
  }

  async function confirmerSuppression() {
    if (!aSupprimer) return;
    const res = await fetch(`/api/admin/comptes/${aSupprimer._id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setASupprimer(null);
    if (res.ok) {
      informer(`Compte « ${aSupprimer.email} » supprimé.`);
      charger();
    } else {
      setErreur(data.error || "Suppression impossible.");
    }
  }

  return (
    <div>
      <AdminNav />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black">Comptes admin</h1>
        <div className="flex items-center gap-2">
          <BoutonRafraichir onClick={charger} />
          <button
            onClick={() => setAjoutOuvert(true)}
            className="inline-flex items-center gap-1.5 bg-cesi-jaune text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
          >
            Ajouter
          </button>
        </div>
      </div>

      {erreur && (
        <p className="text-red-500 border border-red-500 bg-red-500/10 rounded-lg px-4 py-2 mb-4">{erreur}</p>
      )}

      <div className="border border-line rounded-xl overflow-hidden max-sm:border-0 max-sm:rounded-none">
        <table className="w-full text-left bg-card text-sm max-sm:block max-sm:bg-transparent">
          <thead className="border-b border-line text-muted max-sm:hidden">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="max-sm:block">
            {comptes.map((c) => {
              const estPrincipal = c.email === principal;
              const estMoi = c.email === moi;
              return (
                <tr
                  key={c._id}
                  className="max-sm:grid max-sm:grid-cols-[1fr,auto] max-sm:gap-x-3 max-sm:gap-y-2 max-sm:mb-3 max-sm:rounded-xl max-sm:border max-sm:border-line max-sm:bg-card max-sm:p-4 sm:border-b sm:border-line sm:last:border-0"
                >
                  <td className="px-4 py-3 font-semibold max-sm:col-start-1 max-sm:row-start-1 max-sm:py-0">
                    {c.email}
                    {estMoi && <span className="text-muted text-xs font-normal sm:hidden"> (toi)</span>}
                  </td>
                  <td className="px-4 py-3 max-sm:col-start-1 max-sm:row-start-2 max-sm:py-0">
                    {estPrincipal ? (
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-cesi-jaune/15 text-yellow-600">
                        Admin principal
                      </span>
                    ) : (
                      <span className="text-muted">Admin{estMoi ? " (toi)" : ""}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right max-sm:col-start-2 max-sm:row-start-1 max-sm:row-span-2 max-sm:self-center max-sm:justify-self-end max-sm:py-0">
                    {!estPrincipal && !estMoi ? (
                      <button
                        onClick={() => setASupprimer(c)}
                        className="border border-red-500 text-red-500 font-bold px-4 py-2 rounded-lg hover:bg-red-500 hover:text-white focus-visible:bg-red-500 focus-visible:text-white transition-colors max-sm:px-3 max-sm:py-1.5 max-sm:text-sm"
                      >
                        Supprimer
                      </button>
                    ) : (
                      <span className="text-muted text-xs">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {comptes.length === 0 && <p className="text-muted p-4">Aucun compte.</p>}
      </div>

      {ajoutOuvert && (
        <Popup titre="Ajouter un compte admin" onFermer={() => setAjoutOuvert(false)}>
          <form onSubmit={ajouter} className="grid grid-cols-1 gap-3">
            <label className="space-y-1">
              <span className="text-sm text-muted">Email</span>
              <input
                type="email"
                value={nouveau.email}
                onChange={(e) => setNouveau({ ...nouveau, email: e.target.value })}
                className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
                placeholder="prenom.nom@viacesi.fr"
                required
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm text-muted">Mot de passe</span>
              <input
                type="password"
                value={nouveau.password}
                onChange={(e) => setNouveau({ ...nouveau, password: e.target.value })}
                className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
                minLength={6}
                required
              />
            </label>
            {erreur && (
              <p className="text-red-500 border border-red-500 bg-red-500/10 rounded-lg px-4 py-2">{erreur}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAjoutOuvert(false)}
                className="border border-line font-bold px-4 py-2 rounded-lg hover:border-cesi-jaune transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="bg-cesi-jaune text-black font-bold px-5 py-2 rounded-lg hover:bg-yellow-300"
              >
                Ajouter
              </button>
            </div>
          </form>
        </Popup>
      )}

      {aSupprimer && (
        <PopupConfirmation
          titre="Supprimer ce compte admin ?"
          message={`« ${aSupprimer.email} » ne pourra plus se connecter à l'espace cafet.`}
          onConfirmer={confirmerSuppression}
          onAnnuler={() => setASupprimer(null)}
        />
      )}

      <Banniere texte={message} type="succes" />
      <Banniere texte={erreur} type="erreur" />
    </div>
  );
}
