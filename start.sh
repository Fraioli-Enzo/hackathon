#!/usr/bin/env bash
# Lancement du projet en une commande : délègue à frontend/setup.sh (idempotent).
# Options transmises : --seed-only, --no-start

set -euo pipefail
cd "$(dirname "$0")"
exec ./frontend/setup.sh "$@"
