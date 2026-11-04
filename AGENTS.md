# Règles du projet - Cafet CESI

## Typographie

- INTERDIT d'utiliser des tirets longs (U+2014, U+2013, U+2015) dans le code, les commentaires, les messages de commit et la documentation. Utiliser le tiret simple "-" ou reformuler avec ":".

## Icônes

- Toujours utiliser Iconify (`@iconify/react`) pour les icônes. Les icônes sont embarquées dans `frontend/lib/icons.ts` (pas d'appel réseau vers l'API Iconify) et enregistrées avec `addIcon()`. Récupérer les données d'une icône sur https://icon-sets.iconify.design (penser à inclure `width`/`height`, ex. 256 pour Phosphor).

## Thème

- Ne jamais coder de couleurs Tailwind en dur (`bg-neutral-900`, etc.). Utiliser les couleurs sémantiques définies dans `frontend/app/globals.css` via variables CSS : `bg-surface`, `bg-card`, `border-line`, `text-content`, `text-muted`. Thème clair par défaut, thème sombre sous `:root.dark`.

## Développement

- Next.js : rester sur la dernière **14.2.x** (`14.2.35` actuellement, déjà la plus récente de la branche 14). NE PAS migrer vers Next 15/16 pendant le projet : c'est une migration majeure (React 19, défauts de cache, params async des routes dynamiques, middleware, `next/image`). Le bandeau « Next.js is outdated » de l'overlay d'erreur dev s'affiche parce que les versions 15/16 existent : l'ignorer, ce n'est pas une erreur. Migration à envisager uniquement après la hackathon, dans une session dédiée avec re-test complet.
- Le projet se lance avec `./start.sh` (mode dev, `npm run dev`).
- NE PAS lancer `npm run build` pendant qu'un serveur dev tourne : le build écrit dans le même `.next` et casse les chunks du serveur (erreurs 404 dans le navigateur). Vérifier le typage avec `npx tsc --noEmit` à la place.
- UN SEUL serveur dev à la fois. Si un serveur tourne déjà (souvent celui de l'utilisateur sur le port 3000), faire les tests dessus s'il répond, sinon lancer le sien sur un autre port et LE COUPER SYSTÉMATIQUEMENT après les tests. Deux serveurs sur le même projet se corrompent mutuellement le `.next`.
- Docker (`docker compose up`) lance aussi l'app en mode dev (source montée en volume, hot reload). Le stage `runner` du Dockerfile sert au build de production.
