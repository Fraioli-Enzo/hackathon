"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de connexion.");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inconnue.");
      setEnvoi(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto py-12">
      <h1 className="text-3xl font-black mb-6 text-center">Espace cafet</h1>
      <form onSubmit={valider} className="space-y-4 border border-line rounded-xl bg-card p-6">
        <label className="block space-y-1">
          <span className="text-sm text-muted">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-muted">Mot de passe</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-surface border border-line rounded-lg px-3 py-2 focus:border-cesi-jaune focus:outline-none"
            required
          />
        </label>
        {erreur && <p className="text-red-500 text-sm">{erreur}</p>}
        <button
          type="submit"
          disabled={envoi}
          className="w-full bg-cesi-jaune text-black font-bold py-3 rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-50"
        >
          {envoi ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
