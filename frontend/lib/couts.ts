// Prix d'achat unitaires (onglet "Prix" du fichier de trésorerie).
// ponytail: coûts figés ici, passer par un champ "cout" sur le produit si les prix changent souvent.
const COUTS_ACHAT: { motif: RegExp; cout: number }[] = [
  { motif: /bao/i, cout: 1.8 },
  { motif: /nem/i, cout: 0.8 },
  { motif: /samoussa|samossa/i, cout: 1.2 },
  { motif: /mochi/i, cout: 1.8 },
  { motif: /cookie/i, cout: 0.6 },
  { motif: /crêpe|crepe/i, cout: 0.2 },
];

export function coutAchat(nom: string): number {
  const p = COUTS_ACHAT.find((c) => c.motif.test(nom));
  return p ? p.cout : 0;
}

// Éléments d'un menu lus dans son nom, ex. "Menu Asia Cookie (Bao au Boeuf + Nem au Porc ×2 + Cookie)"
export function elementsComposition(nom: string): { nom: string; qte: number }[] {
  const m = nom.match(/\(([^)]+)\)/);
  if (!m) return [];
  return m[1].split("+").map((element) => {
    const e = element.trim();
    const qte = e.match(/×\s*(\d+)$/);
    return { nom: qte ? e.slice(0, qte.index).trim() : e, qte: qte ? Number(qte[1]) : 1 };
  });
}

// Coût d'un menu sans variantes enregistrées : la composition est dans le nom.
export function coutComposition(nom: string): number {
  const elements = elementsComposition(nom);
  return elements.length ? elements.reduce((total, e) => total + coutAchat(e.nom) * e.qte, 0) : coutAchat(nom);
}
