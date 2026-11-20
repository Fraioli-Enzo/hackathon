// Fail closed : une variable critique manquante fait échouer, jamais de valeur de repli en dur.
export function envRequise(nom: string): string {
  const v = process.env[nom];
  if (!v) throw new Error(`Variable d'environnement requise manquante : ${nom}`);
  return v;
}

// Email du compte admin principal (protege contre la suppression), null si non defini.
export function emailAdminPrincipal(): string | null {
  const v = process.env.ADMIN_EMAIL;
  return v ? v.toLowerCase() : null;
}
