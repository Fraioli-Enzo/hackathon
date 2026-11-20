import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

function git(cmd) {
  try {
    return execSync(cmd).toString().trim();
  } catch {
    return "";
  }
}

// Version affichee dans le footer. Source fiable : le fichier VERSION (commite, present partout,
// meme quand git ou .git est absent au build, ex. hebergeur ou image alpine sans git).
// Fallbacks : variable d'env APP_VERSION, puis tags git, puis hash du commit.
function versionDepuisFichier() {
  try {
    return readFileSync(new URL("./VERSION", import.meta.url), "utf8").trim();
  } catch {
    return "";
  }
}

const version =
  versionDepuisFichier() ||
  process.env.APP_VERSION ||
  git("git describe --tags --abbrev=0") ||
  git("git tag --sort=-version:refname | head -1") ||
  git("git rev-parse --short HEAD") ||
  "dev";

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: { APP_VERSION: version },
  async rewrites() {
    // RFC 9728 / 8414 : les clients OAuth sondent /.well-known/* à la racine du domaine.
    // Les routes vivent sous /api/.well-known/*, on les expose aussi à la racine.
    return [
      { source: "/.well-known/oauth-protected-resource", destination: "/api/.well-known/oauth-protected-resource" },
      { source: "/.well-known/oauth-protected-resource/:path*", destination: "/api/.well-known/oauth-protected-resource" },
      { source: "/.well-known/oauth-authorization-server", destination: "/api/.well-known/oauth-authorization-server" },
      { source: "/.well-known/oauth-authorization-server/:path*", destination: "/api/.well-known/oauth-authorization-server" },
    ];
  },
};

export default nextConfig;
