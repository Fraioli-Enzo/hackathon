import { execSync } from "node:child_process";

function git(cmd) {
  try {
    return execSync(cmd).toString().trim();
  } catch {
    return "";
  }
}

// Version affichee dans le footer : dernier tag SemVer (vX.Y.Z) du repo, sinon hash du commit.
// Les tags sont poses sur prod a chaque release (voir memoire/WORKFLOW_GIT.md).
const version =
  git("git describe --tags --abbrev=0") || // tag pose sur un ancetre du commit (build depuis prod)
  git("git tag --sort=-version:refname | head -1") || // dernier tag SemVer du repo
  git("git rev-parse --short HEAD") ||
  "dev";

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: { APP_VERSION: version },
};

export default nextConfig;
