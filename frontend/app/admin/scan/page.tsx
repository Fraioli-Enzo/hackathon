"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import AdminNav from "@/components/AdminNav";
import Banniere from "@/components/Banniere";
import type { CommandeClient } from "@/lib/types";

type ResultatScan = { commande: CommandeClient; dejaRecuperee: boolean };

export default function AdminScanPage() {
  const [scanning, setScanning] = useState(false);
  const [resultat, setResultat] = useState<ResultatScan | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [commandes, setCommandes] = useState<CommandeClient[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanEnCours = useRef(false);

  const charger = useCallback(async () => {
    const res = await fetch("/api/commandes");
    const data = await res.json();
    if (res.ok) setCommandes(data.commandes || []);
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  useEffect(() => {
    if (!scanning) return;
    let annule = false;
    let stream: MediaStream | null = null;
    let rafId = 0;

    async function demarrer() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        const video = videoRef.current;
        if (!video || annule) return;
        video.srcObject = stream;
        await video.play();
        boucle();
      } catch {
        setErreur("Accès caméra impossible. Utilise la validation manuelle ci-dessous.");
        setScanning(false);
      }
    }

    function boucle() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || annule || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafId = requestAnimationFrame(boucle);
        return;
      }
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(image.data, image.width, image.height);
      if (code?.data && !scanEnCours.current) {
        scanEnCours.current = true;
        traiterCode(code.data);
      } else {
        rafId = requestAnimationFrame(boucle);
      }
    }

    demarrer();

    return () => {
      annule = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  async function traiterCode(code: string) {
    try {
      const res = await fetch("/api/admin/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de scan.");
      setResultat(data);
      setErreur(null);
      setMessage(
        data.dejaRecuperee
          ? `« ${data.commande.prenom} ${data.commande.nom} » : commande déjà récupérée.`
          : `Commande de ${data.commande.prenom} ${data.commande.nom} marquée récupérée.`
      );
      charger();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setTimeout(() => {
        scanEnCours.current = false;
      }, 2000);
    }
  }

  const q = recherche.trim().toLowerCase();
  const commandesAffichees = q
    ? commandes.filter((c) => `${c.prenom} ${c.nom}`.toLowerCase().includes(q))
    : commandes;
  const enAttente = commandes.filter((c) => c.statut !== "recuperee").length;

  return (
    <div>
      <AdminNav />
      <h1 className="text-3xl font-black mb-6">Scan des retraits</h1>

      <div className="border border-line rounded-xl bg-card p-6 space-y-4 mb-8">
        {!scanning ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted text-sm">
              {enAttente > 0
                ? `${enAttente} commande${enAttente > 1 ? "s" : ""} en attente de retrait.`
                : "Aucune commande en attente."}
            </p>
            <button
              onClick={() => setScanning(true)}
              className="bg-cesi-jaune text-black font-bold px-6 py-3 rounded-lg hover:bg-yellow-300 transition-colors"
            >
              Démarrer la caméra
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <video ref={videoRef} className="w-full max-w-md rounded-lg mx-auto" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            <button
              onClick={() => setScanning(false)}
              className="border border-line font-bold px-6 py-3 rounded-lg hover:border-red-500 hover:text-red-500 transition-colors"
            >
              Arrêter
            </button>
          </div>
        )}
        {erreur && (
          <div className="border border-red-500 bg-red-500/10 text-red-500 rounded-lg p-4 font-semibold">
            {erreur}
          </div>
        )}
        {resultat && (
          <div
            className={`border rounded-lg p-4 ${
              resultat.dejaRecuperee ? "border-orange-500 bg-orange-500/10" : "border-green-500 bg-green-500/10"
            }`}
          >
            {resultat.dejaRecuperee ? (
              <p className="font-bold text-orange-600">Commande déjà récupérée !</p>
            ) : (
              <p className="font-bold text-green-600">Commande marquée récupérée.</p>
            )}
            <p className="text-sm mt-1">
              {resultat.commande.prenom} {resultat.commande.nom} - retrait {resultat.commande.jour.toLowerCase()} -{" "}
              {resultat.commande.items.map((i) => `${i.qte}×${i.nom}`).join(", ")} -{" "}
              {resultat.commande.total.toFixed(2)} €
            </p>
          </div>
        )}
      </div>

      <h2 className="text-xl font-bold mb-3">Validation manuelle</h2>
      <input
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher par nom…"
        className="w-full sm:w-72 bg-card border border-line rounded-lg px-3 py-2 mb-4 focus:border-cesi-jaune focus:outline-none"
      />

      {commandesAffichees.length === 0 ? (
        <p className="text-muted">Aucune commande à afficher.</p>
      ) : (
        <div className="border border-line rounded-xl overflow-hidden max-sm:border-0 max-sm:rounded-none">
          <table className="w-full text-left bg-card text-sm max-sm:block max-sm:bg-transparent">
            <thead className="border-b border-line text-muted max-sm:hidden">
              <tr>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Élève</th>
                <th className="px-3 py-3">Bât.</th>
                <th className="px-3 py-3">Jour</th>
                <th className="px-3 py-3">Commande</th>
                <th className="px-3 py-3 text-right">Total</th>
                <th className="px-3 py-3">Statut</th>
                <th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="max-sm:block">
              {commandesAffichees.map((c) => (
                <tr
                  key={c._id}
                  className="max-sm:block max-sm:mb-3 max-sm:rounded-xl max-sm:border max-sm:border-line max-sm:bg-card max-sm:p-4 sm:border-b sm:border-line sm:last:border-0"
                >
                  <td
                    data-label="Date"
                    className="px-3 py-3 whitespace-nowrap max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-3 max-sm:py-1.5 max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted"
                  >
                    {new Date(c.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td
                    className="px-3 py-3 max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-3 max-sm:py-1.5 max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted"
                    data-label="Élève"
                  >
                    <p className="font-semibold">
                      {c.prenom} {c.nom}
                    </p>
                  </td>
                  <td
                    data-label="Bâtiment"
                    className="px-3 py-3 max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-3 max-sm:py-1.5 max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted"
                  >
                    {c.batiment}
                  </td>
                  <td
                    data-label="Jour"
                    className="px-3 py-3 max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-3 max-sm:py-1.5 max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted"
                  >
                    {c.jour}
                  </td>
                  <td
                    data-label="Commande"
                    className="px-3 py-3 max-sm:flex max-sm:flex-col max-sm:items-start max-sm:gap-3 max-sm:py-1.5 max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted"
                  >
                    <ul className="space-y-1.5">
                      {c.items.map((i, idx) => {
                        const sep = i.nom.indexOf(" (");
                        const nom = sep > 0 ? i.nom.slice(0, sep) : i.nom;
                        const detail = sep > 0 ? i.nom.slice(sep + 2, -1).split(" + ").join(" · ") : null;
                        return (
                          <li key={idx}>
                            <p>
                              <span className="font-bold">{i.qte}×</span> {nom}
                            </p>
                            {detail && <p className="text-muted text-xs">{detail}</p>}
                          </li>
                        );
                      })}
                    </ul>
                  </td>
                  <td
                    data-label="Total"
                    className="px-3 py-3 text-right font-semibold max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-3 max-sm:py-1.5 max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted"
                  >
                    {c.total.toFixed(2)} €
                  </td>
                  <td
                    data-label="Statut"
                    className="px-3 py-3 max-sm:flex max-sm:items-center max-sm:justify-between max-sm:gap-3 max-sm:py-1.5 max-sm:before:content-[attr(data-label)] max-sm:before:text-xs max-sm:before:text-muted"
                  >
                    {c.statut === "recuperee" ? (
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-600">
                        Récupérée
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-600">
                        En attente
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {c.statut !== "recuperee" ? (
                      <button
                        onClick={() => traiterCode(c._id)}
                        className="bg-cesi-jaune text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors max-sm:w-full"
                      >
                        Valider
                      </button>
                    ) : (
                      <span className="text-muted text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Banniere texte={message} type="succes" />
      <Banniere texte={erreur} type="erreur" />
    </div>
  );
}
