import { cookies } from "next/headers";
import Link from "next/link";
import ImageProduit from "@/components/ImageProduit";
import { connectDB } from "@/lib/db";
import { Produit } from "@/lib/models/Produit";
import { Commande } from "@/lib/models/Commande";

export const dynamic = "force-dynamic";

export default async function Accueil() {
  await connectDB();
  const produits = await Produit.find({ actif: true }).sort({ nom: 1 }).lean();

  // Commandes en attente de retrait mémorisées dans le navigateur (cookie)
  let mesCommandes: { _id: unknown; jour: string; total: number; items: { nom: string; prix: number; qte: number }[] }[] = [];
  try {
    const brut = cookies().get("cafet-commandes")?.value;
    if (brut) {
      const ids = JSON.parse(brut);
      if (Array.isArray(ids) && ids.length > 0) {
        mesCommandes = (await Commande.find({ _id: { $in: ids }, statut: "en_attente" })
          .sort({ createdAt: -1 })
          .lean()) as typeof mesCommandes;
      }
    }
  } catch {
    // cookie illisible : pas de commande affichée
  }

  return (
    <div className="space-y-12">
      <section className="text-center space-y-5 py-10">
        <h1 className="text-4xl sm:text-5xl font-black">
          Ta cafet, <span className="text-cesi-jaune">commandée en ligne</span>
        </h1>
        <p className="text-muted max-w-2xl mx-auto">
          Banh bao, nems, mochis… Commande en quelques clics, reçois ton ticket avec QR code,
          et paie sur place à la cafet. Les commandes de la semaine sont regroupées pour les organisateurs.
        </p>
        <Link
          href="/commander"
          className="inline-block bg-cesi-jaune text-black font-bold px-8 py-3 rounded-lg hover:bg-yellow-300 transition-colors"
        >
          Commander
        </Link>
      </section>

      {mesCommandes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Ta commande en cours</h2>
          {mesCommandes.map((c) => (
            <div key={String(c._id)} className="border border-line rounded-xl bg-card p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">Ticket n° {String(c._id).slice(-8).toUpperCase()}</p>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cesi-jaune/15 text-yellow-700">
                  Retrait {String(c.jour).toLowerCase()}
                </span>
              </div>
              <ul className="space-y-1 text-sm">
                {c.items.map((item, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>{item.qte} × {item.nom}</span>
                    <span className="text-muted">{(item.qte * item.prix).toFixed(2)} €</span>
                  </li>
                ))}
              </ul>
              <p className="flex justify-between font-black border-t border-line pt-2">
                <span>Total</span>
                <span className="text-cesi-jaune">{Number(c.total).toFixed(2)} €</span>
              </p>
              <p className="text-muted text-xs">
                Présente le QR code de ton ticket au retrait, paiement sur place (espèces ou carte).
              </p>
            </div>
          ))}
        </section>
      )}

      <section>
        <h2 className="text-2xl font-bold mb-5">Nos produits</h2>
        {produits.length === 0 ? (
          <p className="text-muted">Aucun produit disponible pour le moment.</p>
        ) : (
          <div className="grid sm:grid-cols-3 gap-4">
            {produits.map((p) => (
              <div key={String(p._id)} className="flex flex-col gap-2 border border-line rounded-xl p-5 bg-card">
                <ImageProduit src={p.image} alt={p.nom} className="w-full aspect-square" ajustement="contain" width={384} height={384} />
                <h3 className="font-bold text-lg">{p.nom}</h3>
                <p className="text-muted text-sm flex-1">{p.description || "-"}</p>
                <p className="text-cesi-jaune font-black text-xl">{p.prix.toFixed(2)} €</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border border-line rounded-xl p-6 bg-card">
        <h2 className="text-xl font-bold mb-4">Comment ça marche ?</h2>
        <ol className="space-y-3 text-muted">
          <li>
            <span className="text-cesi-jaune font-bold">1.</span> Tu commandes en ligne avec ton nom, ton prénom et ton bâtiment.
          </li>
          <li>
            <span className="text-cesi-jaune font-bold">2.</span> Tu reçois un ticket PDF avec un QR code unique.
          </li>
          <li>
            <span className="text-cesi-jaune font-bold">3.</span> Tu paies sur place (espèces ou carte) et récupères ta commande en présentant le QR code.
          </li>
        </ol>
      </section>
    </div>
  );
}
