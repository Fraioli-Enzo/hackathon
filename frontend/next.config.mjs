import { execSync } from "node:child_process";

// Hash du commit courant, affiche dans le footer. Relancer le serveur apres un commit pour le voir a jour.
let gitHash = "dev";
try {
  gitHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch {}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: { APP_VERSION: gitHash },
};

export default nextConfig;
