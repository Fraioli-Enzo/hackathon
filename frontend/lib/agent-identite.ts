// Identité de l'agent : BAO par défaut, DUONG déblocable (easter egg, par session).

export type IdentiteAgent = "bao" | "duong";

export const CLE_AGENT = "cafet-agent";
export const EVT_CHANGEMENT_AGENT = "cafet-agent-change";

export function lireAgentSession(): IdentiteAgent {
  if (typeof window === "undefined" || !sessionStorage) return "bao";
  return sessionStorage.getItem(CLE_AGENT) === "duong" ? "duong" : "bao";
}

export function definirAgentSession(identite: IdentiteAgent) {
  sessionStorage.setItem(CLE_AGENT, identite);
  window.dispatchEvent(new Event(EVT_CHANGEMENT_AGENT));
}

export type ApparenceAgent = {
  nom: string; // "Agent BAO"
  court: string; // "BAO"
  intro: string; // bulle du bouton flottant
  imageFlottante: string; // personnage entier du bouton
  avatarBulle: string; // petit avatar à côté des bulles
  gifReflexion: string; // gif pendant que l'agent réfléchit
  dureeGifMs: number; // durée réelle du gif, pour la rediffusion
  messageAccueil: string;
};

export const APPARENCES: Record<IdentiteAgent, ApparenceAgent> = {
  bao: {
    nom: "Agent BAO",
    court: "BAO",
    intro: "Agent BAO à votre service",
    imageFlottante: "/images/agents/bao_acceuil.png",
    avatarBulle: "/images/agents/bao.png",
    gifReflexion: "/images/agents/bao_gif.gif",
    dureeGifMs: 1000, // 4 frames mesurées à 1 s
    messageAccueil:
      "Salut ! Je suis BAO, l'agent de la Cafet CESI. Demande-moi les produits, les prix et les stocks, ou commande directement ici. Qu'est-ce qui te ferait plaisir cette semaine ?",
  },
  duong: {
    nom: "Agent DUONG",
    court: "DUONG",
    intro: "Agent DUONG à votre service",
    imageFlottante: "/images/agents/asian.png",
    avatarBulle: "/images/agents/asian_head.png",
    gifReflexion: "/images/agents/asian_gif.gif",
    dureeGifMs: 1000, // 4 frames mesurées à 1 s
    messageAccueil:
      "Salut ! Je suis DUONG, l'agent de la Cafet CESI. Demande-moi les produits, les prix et les stocks, ou commande directement ici. Qu'est-ce qui te ferait plaisir cette semaine ?",
  },
};
