import { cookies } from "next/headers";
import Image from "next/image";
import { SKINS_BAO } from "@/lib/agent-identite";

export const dynamic = "force-dynamic";

export default async function QuetePage() {
  // Commandes passées depuis ce navigateur (cookie écrit à chaque commande réussie)
  let nbCommandes = 0;
  try {
    const brut = cookies().get("cafet-commandes")?.value;
    const ids = brut ? JSON.parse(brut) : [];
    if (Array.isArray(ids)) nbCommandes = new Set(ids).size;
  } catch {
    // cookie illisible : on commence la quête à zéro
  }

  const prochain = SKINS_BAO.find((s) => s.palier > nbCommandes);

  return (
    <div className="space-y-8">
      <section className="text-center space-y-4 py-6">
        <h1 className="text-3xl sm:text-4xl font-black">Ta quête bao 🥟</h1>
        <p className="text-muted max-w-xl mx-auto">
          Chaque commande passée te fait progresser : tu débloques un nouveau bao toutes les 2 commandes.
        </p>
        <p className="font-bold">
          {nbCommandes <= 1 ? `${nbCommandes} commande` : `${nbCommandes} commandes`} passée
          {nbCommandes > 1 ? "s" : ""}
        </p>
        <p className="text-sm text-muted">
          {prochain
            ? `Encore ${prochain.palier - nbCommandes} commande${prochain.palier - nbCommandes > 1 ? "s" : ""} pour débloquer ${prochain.nom} !`
            : "Collection complète, bravo !"}
        </p>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {SKINS_BAO.map((skin) => {
          const debloque = nbCommandes >= skin.palier;
          return (
            <div
              key={skin.nom}
              className={
                "border rounded-xl bg-card p-4 text-center space-y-3 " +
                (debloque ? "border-cesi-jaune" : "border-line")
              }
            >
              <Image
                src={skin.image}
                alt={skin.nom}
                width={128}
                height={128}
                className={"w-28 h-28 sm:w-32 sm:h-32 object-contain mx-auto " + (debloque ? "" : "grayscale opacity-40")}
              />
              <p className="font-bold">{skin.nom}</p>
              {debloque ? (
                <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-full bg-cesi-jaune/15 text-yellow-700">
                  Débloqué
                </span>
              ) : (
                <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-full bg-surface text-muted border border-line">
                  {skin.palier === 0 ? "Départ" : `${skin.palier} commandes`}
                </span>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
