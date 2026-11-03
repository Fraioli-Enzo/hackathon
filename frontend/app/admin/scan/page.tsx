"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import AdminNav from "@/components/AdminNav";
import type { CommandeClient } from "@/lib/types";

type ResultatScan = { commande: CommandeClient; dejaRecuperee: boolean };

export default function AdminScanPage() {
  const [scanning, setScanning] = useState(false);
  const [resultat, setResultat] = useState<ResultatScan | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [rechercheEmail, setRechercheEmail] = useState("");
  const [resultats, setResultats] = useState<CommandeClient[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanEnCours = useRef(false);

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
        setErreur("Accès caméra impossible. Utilise la recherche manuelle ci-dessous.");
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
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setTimeout(() => {
        scanEnCours.current = false;
      }, 2000);
    }
  }

  async function chercherEmail(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/commandes?email=${encodeURIComponent(rechercheEmail)}`);
    const data = await res.json();
    setResultats(data.commandes || []);
  }

  return (
    <div>
      <AdminNav />
      <h1 className="text-3xl font-black mb-6">Scan des retraits</h1>

      <div className="border border-line rounded-xl bg-card p-6 space-y-4">
        {!scanning ? (
          <button onClick={() => setScanning(true)} className="bg-cesi-jaune text-black font-bold px-6 py-3 rounded-lg hover:bg-yellow-300">
            Démarrer la caméra
          </button>
        ) : (
          <div className="space-y-3">
            <video ref={videoRef} className="w-full max-w-md rounded-lg mx-auto" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            <button onClick={() => setScanning(false)} className="border border-line font-bold px-6 py-3 rounded-lg hover:border-red-500">
              Arrêter
            </button>
          </div>
        )}
        {erreur && <p className="text-red-500 text-sm">{erreur}</p>}
        {resultat && (
          <div className={`border rounded-lg p-4 ${resultat.dejaRecuperee ? "border-orange-500 bg-orange-500/10" : "border-green-500 bg-green-500/10"}`}>
            {resultat.dejaRecuperee ? (
              <p className="font-bold text-orange-600">Commande déjà récupérée !</p>
            ) : (
              <p className="font-bold text-green-600">Commande marquée récupérée.</p>
            )}
            <p className="text-sm mt-1">
              {resultat.commande.prenom} {resultat.commande.nom} — {resultat.commande.items.map((i) => `${i.qte}×${i.nom}`).join(", ")} —{" "}
              {resultat.commande.total.toFixed(2)} €
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 border border-line rounded-xl bg-card p-6 space-y-4">
        <h2 className="text-lg font-bold">Recherche manuelle</h2>
        <form onSubmit={chercherEmail} className="flex gap-3">
          <input
            type="email"
            value={rechercheEmail}
            onChange={(e) => setRechercheEmail(e.target.value)}
            placeholder="Email de l'élève…"
            className="flex-1 bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
          />
          <button type="submit" className="bg-cesi-jaune text-black font-bold px-5 py-2 rounded-lg hover:bg-yellow-300">
            Chercher
          </button>
        </form>
        <ul className="space-y-2">
          {resultats.map((c) => (
            <li key={c._id} className="flex items-center justify-between gap-3 border border-line rounded-lg p-3">
              <div className="text-sm">
                <p className="font-semibold">
                  {c.prenom} {c.nom} — {c.items.map((i) => `${i.qte}×${i.nom}`).join(", ")}
                </p>
                <p className="text-muted">
                  {c.total.toFixed(2)} € — {c.statut === "recuperee" ? "Récupérée" : "En attente"}
                </p>
              </div>
              {c.statut !== "recuperee" && (
                <button
                  onClick={() => traiterCode(c._id)}
                  className="bg-cesi-jaune text-black font-bold px-4 py-2 rounded-lg hover:bg-yellow-300 text-sm whitespace-nowrap"
                >
                  Marquer récupérée
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
