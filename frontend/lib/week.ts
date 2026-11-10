// Semaine "cafet" : du mercredi 00h00 (heure locale) au mercredi suivant 00h00 (exclus).
// Les élèves commandent en avance : la semaine utile de commandes va du
// mercredi au mardi inclus (retraits du lundi au vendredi, hors week-end).
// "decalage" décale de N semaines (0 = en cours, 1 = suivante, -1 = précédente).

export function getWeekRange(date: Date = new Date(), decalage = 0): { start: Date; end: Date } {
  const d = new Date(date);
  d.setDate(d.getDate() + decalage * 7);
  const jourSemaine = (d.getDay() + 4) % 7; // mercredi = 0
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - jourSemaine);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

// Dernier jour inclus (mardi), pour l'affichage "du X au Y" ("end" étant exclusif).
export function dernierJour(fin: Date | string): Date {
  const d = new Date(fin);
  d.setDate(d.getDate() - 1);
  return d;
}
