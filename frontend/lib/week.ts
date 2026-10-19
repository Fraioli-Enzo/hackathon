// Semaine "cafet" : du lundi 00h00 (heure locale) au lundi suivant 00h00 (exclus).

export function getWeekRange(date: Date = new Date()): { start: Date; end: Date } {
  const d = new Date(date);
  const jourSemaine = (d.getDay() + 6) % 7; // lundi = 0
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - jourSemaine, 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}
