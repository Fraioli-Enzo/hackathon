#!/usr/bin/env bash
# Installation & lancement automatiques pour le site de commande de la cafet CESI.
# Idempotent : peut être relancé sans risque.
# Options : --seed-only (seed puis quitte), --no-start (tout prépare mais ne lance pas le dev server)

set -euo pipefail
cd "$(dirname "$0")"

SEED_ONLY=0
NO_START=0
for arg in "$@"; do
  case "$arg" in
    --seed-only) SEED_ONLY=1 ;;
    --no-start) NO_START=1 ;;
    *) echo "Option inconnue : $arg"; exit 1 ;;
  esac
done

# 1. Vérifications
if ! command -v node >/dev/null 2>&1; then
  echo "Erreur : node n'est pas installé."; exit 1
fi
NODE_MAJEUR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJEUR" -lt 20 ]; then
  echo "Erreur : node >= 20 requis (version actuelle : $(node --version))."; exit 1
fi
if ! command -v docker >/dev/null 2>&1; then
  echo "Erreur : docker n'est pas installé."; exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Erreur : docker compose n'est pas disponible."; exit 1
fi

# 2. Dépendances
echo ">> Installation des dépendances npm…"
npm install

# 3. .env.local (sans écraser une config existante)
if [ ! -f .env.local ]; then
  echo ">> Création de .env.local…"
  SECRET=$(openssl rand -hex 32 2>/dev/null || echo "cafet-secret-dev")
  cat > .env.local <<EOF
MONGODB_URI=mongodb://localhost:27017/cafet
SESSION_SECRET=$SECRET
ADMIN_EMAIL=admin@cesi.fr
ADMIN_PASSWORD=cafet2026
EOF
  echo ">> .env.local créé (admin : admin@cesi.fr / cafet2026 — à changer)."
else
  echo ">> .env.local existant, conservé."
fi

if [ "$SEED_ONLY" -eq 1 ]; then
  echo ">> Seed…"
  npm run seed
  echo ">> Terminé (--seed-only)."
  exit 0
fi

# 4. MongoDB
echo ">> Démarrage de MongoDB (docker)…"
docker compose up -d mongo
echo ">> Attente de la connexion MongoDB…"
for i in $(seq 1 30); do
  if docker compose exec -T mongo mongosh --quiet --eval "db.version()" >/dev/null 2>&1; then
    echo ">> MongoDB prêt."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "Erreur : MongoDB n'a pas répondu en 30 tentatives."; exit 1
  fi
  sleep 1
done

# 5. Seed
echo ">> Seed (admin + produits)…"
npm run seed

# 6. Lancement
if [ "$NO_START" -eq 1 ]; then
  echo ">> Tout est prêt. Lance « npm run dev » pour démarrer."
else
  echo ">> Lancement du serveur de développement : http://localhost:3000"
  npm run dev
fi
