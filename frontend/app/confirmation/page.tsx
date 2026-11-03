"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { CommandeClient } from "@/lib/types";

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
          Merci {commande.prenom} ! Ton ticket PDF a été téléchargé. Présente le QR code au retrait, paiement sur place (espèces ou carte).
        </p>
      </div>

      <div className="border border-line rounded-xl bg-card p-6 space-y-4 text-left">
        <div className="flex justify-between text-sm text-muted">
          <span>Ticket n° {commande._id.slice(-8).toUpperCase()}</span>
          <span>{new Date(commande.createdAt).toLocaleString("fr-FR")}</span>
        </div>
        <ul className="space-y-1">
          {commande.items.map((item, i) => (
            <li key={i} className="flex justify-between">
              <span>
                {item.qte} × {item.nom}
              </span>
              <span>{(item.qte * item.prix).toFixed(2)} €</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between font-black text-lg border-t border-line pt-3">
          <span>Total</span>
          <span className="text-cesi-jaune">{commande.total.toFixed(2)} €</span>
        </div>
        {qrDataUrl && (
          <div className="flex flex-col items-center gap-2 pt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR code de retrait" className="w-40 h-40 bg-white rounded-lg p-1" />
            <span className="text-xs text-muted">Scanner par la cafet au retrait</span>
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

  doc.setFontSize(22);
  doc.text("Cafet CESI", 105, 20, { align: "center" });
  doc.setFontSize(11);
  doc.text("Ticket de commande", 105, 28, { align: "center" });

  let y = 40;
  doc.text(`N° ${commande._id.slice(-8).toUpperCase()}`, 14, y);
  doc.text(new Date(commande.createdAt).toLocaleString("fr-FR"), 196, y, { align: "right" });
  y += 8;
  doc.text(`${commande.prenom} ${commande.nom} - bat. ${commande.batiment}`, 14, y);
  y += 6;
  doc.text(commande.email, 14, y);
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

  const qr = await QR.toDataURL(commande._id, { width: 220, margin: 1 });
  doc.addImage(qr, "PNG", 146, 46, 50, 50);

  doc.save(`ticket-cafet-${commande._id.slice(-6)}.pdf`);
}
