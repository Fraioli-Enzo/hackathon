# Règles du projet - Cafet CESI

## Typographie

- INTERDIT d'utiliser des tirets longs (U+2014, U+2013, U+2015) dans le code, les commentaires, les messages de commit et la documentation. Utiliser le tiret simple "-" ou reformuler avec ":".

## Icônes

- Toujours utiliser Iconify (`@iconify/react`) pour les icônes. Les icônes sont embarquées dans `frontend/lib/icons.ts` (pas d'appel réseau vers l'API Iconify) et enregistrées avec `addIcon()`. Récupérer les données d'une icône sur https://icon-sets.iconify.design (penser à inclure `width`/`height`, ex. 256 pour Phosphor).

## Thème

- Ne jamais coder de couleurs Tailwind en dur (`bg-neutral-900`, etc.). Utiliser les couleurs sémantiques définies dans `frontend/app/globals.css` via variables CSS : `bg-surface`, `bg-card`, `border-line`, `text-content`, `text-muted`. Thème sombre par défaut, thème clair sous `:root.light`.

## Développement

- Le projet se lance avec `./start.sh` (mode dev, `npm run dev`).
- NE PAS lancer `npm run build` pendant qu'un serveur dev tourne : le build écrit dans le même `.next` et casse les chunks du serveur (erreurs 404 dans le navigateur). Vérifier le typage avec `npx tsc --noEmit` à la place.
- Docker (`docker compose up`) lance aussi l'app en mode dev (source montée en volume, hot reload). Le stage `runner` du Dockerfile sert au build de production.
