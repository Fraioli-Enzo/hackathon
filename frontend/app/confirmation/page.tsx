"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { CommandeClient } from "@/lib/types";

// « Menu Asia Cookie (Bao au Boeuf + ...) » -> nom du produit + composition
function separeComposition(nom: string): { base: string; composition: string | null } {
  const i = nom.indexOf(" (");
  if (i === -1) return { base: nom, composition: null };
  return { base: nom.slice(0, i), composition: nom.slice(i + 2).replace(/\)$/, "") };
}

export default function ConfirmationPage() {
  const [commande, setCommande] = useState<CommandeClient | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const telecharge = useRef(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("cafet-commande");
      if (raw) setCommande(JSON.parse(raw));
    } catch {
      // sessionStorage corrompu : ignoré
    }
  }, []);

  useEffect(() => {
    if (!commande) return;
    QRCode.toDataURL(commande._id, { width: 240, margin: 1 }).then(setQrDataUrl).catch(() => {});
    if (!telecharge.current) {
      telecharge.current = true;
      telechargerTicket(commande);
    }
  }, [commande]);

  if (!commande) {
    return (
      <div className="text-center space-y-4 py-16">
        <h1 className="text-3xl font-black">Aucune commande récente</h1>
        <p className="text-muted">Repasses une commande pour recevoir un ticket.</p>
        <Link href="/commander" className="inline-block bg-cesi-jaune text-black font-bold px-6 py-3 rounded-lg hover:bg-yellow-300">
          Commander
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-black">Commande enregistrée !</h1>
        <p className="text-muted">
          Merci {commande.prenom} ! Ton ticket PDF a été téléchargé. Retrait le {commande.jour.toLowerCase()}, présente le QR code sur place, paiement en espèces ou carte.
        </p>
      </div>

      <div className="border border-line rounded-xl bg-card text-left overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Ticket</p>
            <p className="text-lg font-black">n° {commande._id.slice(-8).toUpperCase()}</p>
          </div>
          <p className="text-xs text-muted">{new Date(commande.createdAt).toLocaleString("fr-FR")}</p>
        </div>

        <ul className="divide-y divide-line">
          {commande.items.map((item, i) => {
            const { base, composition } = separeComposition(item.nom);
            return (
              <li key={i} className="flex items-start gap-3 px-6 py-4">
                <span className="flex h-7 min-w-7 items-center justify-center rounded-md bg-cesi-jaune/15 text-cesi-jaune font-black text-sm px-1 shrink-0">
                  {item.qte}×
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold leading-snug">{base}</p>
                  {composition && <p className="text-xs text-muted mt-0.5">{composition}</p>}
                  {item.qte > 1 && <p className="text-xs text-muted">{item.prix.toFixed(2)} € l&apos;unité</p>}
                </div>
                <span className="font-bold whitespace-nowrap">{(item.qte * item.prix).toFixed(2)} €</span>
              </li>
            );
          })}
        </ul>

        <div className="flex items-end justify-between px-6 py-4 border-t border-line bg-surface">
          <div>
            <p className="font-bold">Total</p>
            <p className="text-xs text-muted">à payer sur place (espèces ou carte)</p>
          </div>
          <span className="text-2xl font-black text-cesi-jaune">{commande.total.toFixed(2)} €</span>
        </div>

        {qrDataUrl && (
          <div className="flex flex-col items-center gap-2 px-6 py-6 border-t border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR code de retrait" className="w-40 h-40 bg-white rounded-lg p-2" />
            <p className="text-xs text-muted">Scanné par la cafet au retrait</p>
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-center">
        <button
          onClick={() => telechargerTicket(commande)}
          className="bg-cesi-jaune text-black font-bold px-6 py-3 rounded-lg hover:bg-yellow-300"
        >
          Re-télécharger le ticket
        </button>
        <Link href="/" className="border border-line font-bold px-6 py-3 rounded-lg hover:border-cesi-jaune">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}

async function telechargerTicket(commande: CommandeClient) {
  const { jsPDF } = await import("jspdf");
  const QR = (await import("qrcode")).default;
  const doc = new jsPDF();

  // Logo CESI en haut du ticket
  try {
    const logo = await fetch("/images/logo-cesi-jaune.png");
    const blob = await logo.blob();
    const dataUrl = await new Promise<string>((resoudre) => {
      const fr = new FileReader();
      fr.onload = () => resoudre(String(fr.result));
      fr.readAsDataURL(blob);
    });
    doc.addImage(dataUrl, "PNG", 93, 8, 24, 24);
  } catch {
    // logo indisponible : ticket sans image
  }

  doc.setFontSize(22);
  doc.text("Cafet CESI", 105, 40, { align: "center" });
  doc.setFontSize(11);
  doc.text("Ticket de commande", 105, 48, { align: "center" });

  let y = 74; // sous le QR code (qui descend jusqu'à y=70)
  doc.text(`N° ${commande._id.slice(-8).toUpperCase()}`, 14, y);
  doc.text(new Date(commande.createdAt).toLocaleString("fr-FR"), 196, y, { align: "right" });
  y += 8;
  doc.text(`${commande.prenom} ${commande.nom} - bat. ${commande.batiment} - retrait ${commande.jour.toLowerCase()}`, 14, y);
  y += 8;
  doc.line(14, y, 196, y);
  y += 9;

  for (const item of commande.items) {
    doc.text(`${item.qte} x ${item.nom}`, 14, y);
    doc.text(`${(item.qte * item.prix).toFixed(2)} EUR`, 196, y, { align: "right" });
    y += 7;
  }
  doc.line(14, y, 196, y);
  y += 10;

  doc.setFontSize(14);
  doc.text(`Total : ${commande.total.toFixed(2)} EUR`, 14, y);
  doc.setFontSize(11);
  y += 10;
  doc.text("Paiement sur place (especes ou carte).", 14, y);
  y += 8;
  doc.text("Presente ce QR code au retrait.", 14, y);

  const qr = await QR.toDataURL(commande._id, { width: 420, margin: 1 });
  doc.addImage(qr, "PNG", 134, 8, 62, 62);

  doc.save(`ticket-cafet-${commande._id.slice(-6)}.pdf`);
}
