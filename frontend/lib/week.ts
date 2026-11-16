// Semaine "cafet" : du lundi 00h00 (heure locale) au lundi suivant 00h00 (exclus).
// Les commandes sont regroupées par semaine calendaire (lundi à dimanche inclus).
// "decalage" décale de N semaines (0 = en cours, 1 = suivante, -1 = précédente).

export function getWeekRange(date: Date = new Date(), decalage = 0): { start: Date; end: Date } {
  const d = new Date(date);
  d.setDate(d.getDate() + decalage * 7);
  const jourSemaine = (d.getDay() + 6) % 7; // lundi = 0
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - jourSemaine);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

// Dernier jour inclus (dimanche), pour l'affichage "du X au Y" ("end" étant exclusif).
export function dernierJour(fin: Date | string): Date {
  const d = new Date(fin);
  d.setDate(d.getDate() - 1);
  return d;
}
