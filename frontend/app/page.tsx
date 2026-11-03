import Link from "next/link";
import ImageProduit from "@/components/ImageProduit";
import { connectDB } from "@/lib/db";
import { Produit } from "@/lib/models/Produit";

export const dynamic = "force-dynamic";

export default async function Accueil() {
  await connectDB();
  const produits = await Produit.find({ actif: true }).sort({ nom: 1 }).lean();

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

      <section>
        <h2 className="text-2xl font-bold mb-5">Nos produits</h2>
        {produits.length === 0 ? (
          <p className="text-muted">Aucun produit disponible pour le moment.</p>
        ) : (
          <div className="grid sm:grid-cols-3 gap-4">
            {produits.map((p) => (
              <div key={String(p._id)} className="flex flex-col gap-2 border border-line rounded-xl p-5 bg-card">
                <ImageProduit src={p.image} alt={p.nom} className="w-full h-36" />
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
            <span className="text-cesi-jaune font-bold">1.</span> Tu commandes en ligne avec ton nom, ton email et ton bâtiment.
          </li>
          <li>
            <span className="text-cesi-jaune font-bold">2.</span> Tu reçois un ticket PDF avec un QR code unique.
          </li>
          <li>
            <span className="text-cesi-jaune font-bold">3.</span> Tu paies sur place (espèces / Lydia) et récupères ta commande en présentant le QR code.
          </li>
        </ol>
      </section>
    </div>
  );
}
