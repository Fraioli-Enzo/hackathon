# Fiche technique : Cafet CESI

Mémoire du projet : à quoi sert chaque partie, comment elle fonctionne, et où intervenir.

## 1. Vue d'ensemble

Application de commande de nourriture pour la cafétéria du CESI :

- **Elèves** : catalogue, commande en ligne, ticket avec QR code, paiement sur place.
- **Admins cafet** : panier de la semaine, CRUD produits (avec photos), gestion du stock, liste des commandes, scan QR pour valider les retraits.

Une seule application Next.js **14.2.x** (App Router) qui porte à la fois le front et l'API (`app/api/**`). Pas de backend séparé. Base MongoDB (Mongoose). Une seule base de code, un seul conteneur.

Dépendances notables : `bcryptjs` (mots de passe), `qrcode` + `jsqr` (QR), `jspdf` (ticket PDF), `@iconify/react` (icônes embarquées dans `lib/icons.ts`, pas d'appel réseau).

## 2. Règles d'or du repo

Voir `AGENTS.md` et `README.md`. En résumé :

- Pas de tirets longs dans le code, les commits, la doc.
- Icônes uniquement via Iconify embarqué (`addIcon`) ; jamais de couleur Tailwind en dur, passer par les variables sémantiques (`bg-card`, `border-line`, `text-muted`...).
- Rester sur Next 14.2.x (pas de migration 15/16 pendant le projet).
- Ne jamais lancer `npm run build` pendant qu'un serveur dev tourne : vérifier avec `npx tsc --noEmit`.
- Un seul serveur dev à la fois, sinon `.next` se corrompt.

Branches : `dev` (développement) -> `main` (intégration) -> `prod` (déployée par Coolify). Le `docker-compose.yml` de `prod` est un fichier différent de celui de dev : les merges ne doivent jamais l'écraser (jusqu'ici aucun commit dev ne le touche).

## 3. Modèle de données (Mongoose, `lib/models/`)

- **Produit** : `nom`, `prix`, `description`, `actif`, `stock`, `image`, `categorie`, et pour les menus `composition[]`. Un élément de composition référence soit une `categorie` (choix libre parmi les produits actifs de cette catégorie, ex. "2 Nems"), soit un `nomProduit` fixe (ex. "1 Cookie"). Les menus ne portent pas de stock : le stock est sur les produits de base.
- **Commande** : infos élève (`prenom`, `nom`, `batiment`, `jour`), `items[]` (lignes dénormalisées : `nom`, `prix`, `qte`, et pour les lignes de menu `variantes[]` = produits de base consommés), `total`, `statut` (`en_attente` | `recuperee`), `createdAt`.
- **Admin** : `email`, `passwordHash` (bcrypt). Comptes multiples via la page Comptes.
- **ImageUpload** : photo binaire en base (`data` Buffer + `contentType`). Justifié : en prod le conteneur est recréé à chaque déploiement, on ne peut pas écrire dans `public/`.

**Semaine cafet** (`lib/week.ts`) : du lundi 00h00 (heure locale) au lundi suivant exclu. Toute la logique "par semaine" (recap, liste des commandes) filtre `createdAt` sur cet intervalle.

## 4. Parcours élève

### Accueil (`app/page.tsx`, `components/Banniere.tsx`)

Server component. Lit le cookie `cafet-commandes` (jusqu'à 20 ids de commandes, posé côté client à la validation), récupère les commandes `en_attente` correspondantes et affiche une bannière "retrait en attente". Aucun compte élève n'existe : c'est le cookie + `sessionStorage` qui font le lien entre l'élève et ses commandes sur son appareil.

### Passer commande (`app/commander/page.tsx`, la page la plus riche en logique)

Catalogue filtrable par catégorie (tags), panier sticky, formulaire (prénom, nom, bâtiment Orion, jour Lundi/Mardi).

Le stock affiché est **dynamique et calculé côté client** à partir de l'état de la page (pas de requête) :

- `reserves` : Map produit -> quantité consommée par la sélection en cours (panier + compositions de tous les menus choisis). Les menus au choix consomment leurs variantes sélectionnées, les composants fixes consomment `qte * nombre de menus`.
- Chaque unité d'un composant au choix affiche un stock **dégressif** : la 2e unité voit le stock moins celles déjà prises avant elle (1er nem "50", 2e "49").
- Idem pour les composants fixes (Cookie) entre les instances d'un menu personnalisé.

**Menus personnalisables** : chaque exemplaire d'un même menu a sa propre composition. State `choix[menuId][instance][composant][unite]` (variantes). Dès quantité > 1, un toggle propose "Même partout" (une seule composition, multipliée) ou "Personnaliser chaque menu" (un éditeur par exemplaire). Les variantes se choisissent par tags cliquables (boutons `aria-pressed`), pas par selects.

Envoi (`POST /api/commandes`) : pour un menu, `choix[i]` = tableau aplati de toutes les variantes du composant i, tous exemplaires confondus. Deux formats acceptés par l'API (voir section 6).

### Confirmation (`app/confirmation/page.tsx`)

Lit la commande depuis `sessionStorage` (`cafet-commande`), génère le QR code (le payload est simplement l'`_id` de la commande) via `qrcode.toDataURL`, et propose un ticket PDF généré à la volée avec `jspdf` (import dynamique pour ne pas alourdir le bundle).

## 5. Parcours admin

### Auth (`lib/auth.ts`, `middleware.ts`)

- Login : `POST /api/admin/login` compare bcrypt, puis pose le cookie `cafet_admin` **httpOnly, sameSite=lax, secure en prod**, valable 7 jours.
- Token maison : payload `{email, exp}` en base64url + signature HMAC-SHA256 (Web Crypto, donc compatible edge). Pas de table de session, pas de révocation : changer `SESSION_SECRET` déconnecte tout le monde.
- `middleware.ts` protège toutes les pages `/admin/**` (redirection vers login). Les routes API vérifient elles-mêmes via `getAdminEmail(req)` : ne jamais oublier ce garde dans une nouvelle route admin.

### Dashboard (`/admin`)

Recap de la semaine : nb commandes, CA, en attente / récupérées, stock restant trié croissant (les ruptures remontent). Une requête `GET /api/admin/recap`, données agrégées côté serveur.

### Produits (`/admin/produits`)

CRUD complet (`POST/PUT/DELETE /api/produits[/id]`). Upload de photo : redimensionnement client (canvas) puis data-URL -> `POST /api/admin/image` (JPEG/PNG/WebP, 2 Mo max) -> stockée en base, servie par `GET /api/images/:id` avec cache immutable. Le catalogue public utilise `actif` pour cacher un produit sans le supprimer.

### Stock (`/admin/stock`)

Vue rapide du stock (y compris inactifs via `?all=1`, réservé admin), ajustement et réappro en quelques clics.

### Commandes (`/admin/commandes`)

Liste de la semaine via `GET /api/commandes` (aidé par le stock dynamique pour les menus à choix), suppression (`DELETE /api/commandes/:id`) qui **rend le stock** sauf si la commande était déjà récupérée. Scan QR : `getUserMedia` (caméra arrière), décodage `jsqr` frame par frame via canvas caché, puis `POST /api/admin/scan` qui passe la commande en `recuperee` (idempotent : renvoie `dejaRecuperee`).

### Comptes (`/admin/comptes`)

CRUD des admins, auto-identification via `GET /api/admin/me` pour la portée du reste.

## 6. Mécanique du stock (le morceau critique)

Principe : **le serveur est seul juge**. Le client affiche des stocks calculés pour l'ergonomie, mais c'est l'API qui valide et décrémente.

`POST /api/commandes` :

1. Valide les items, résout les menus : composants au choix + composants par nom.
2. Fusionne les quantités par produit de base.
3. Décrémente chaque stock avec une condition atomique : `updateOne({ _id, stock: { $gte: qte } }, { $inc: { stock: -qte } })`. Si un produit manque, tous les décréments déjà faits sont annulés (rollback manuel, pas de transaction) et l'API renvoie 409.
4. Enregistre la commande avec les lignes dénormalisées ; les lignes de menu gardent `variantes[]` (ce qu'elles consommées) pour pouvoir rendre le stock à la suppression.

Format des choix de menus dans `item.choix[i]` (composant i) : deux formats acceptés :

- **Par instance** (nouveau, page commander) : longueur `c.qte * item.qte`, chaque entrée compte 1.
- **Partagé** (ancien, page admin) : longueur `c.qte`, chaque entrée compte `item.qte`.

Rendu du stock : la suppression d'une commande `en_attente` incrémente le stock des variantes consommées ; une commande `recuperee` ne rend rien (bière déjà bue).

## 7. Déploiement et infra

- **Dev** : `./start.sh` (vérifie node + docker, seed, `npm run dev`). `docker compose up` monte aussi mongo:7 et l'app en mode dev (source montée, hot reload).
- **Prod** (branche `prod`, déployée par Coolify sur `cafet.enzolab.app`) : image `runner` du Dockerfile (node:20-alpine, `next start`), **pas de mongo local** : MongoDB mutualisé (`mongodb-global`) via le réseau `msi-shared-net` ; port publié sur `127.0.0.1:3000` uniquement, l'accès externe passe par tunnel Cloudflare -> Traefik. Secrets (`MONGODB_URI`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`) injectés par l'onglet Environment de Coolify.
- **Healthcheck** dans le compose prod : `wget` (busybox alpine) sur `http://127.0.0.1:3000/` depuis l'intérieur du conteneur, toutes les 30s, `start_period` 15s.
- Les chunks `_next/static` ont un hash par build : après un déploiement, un onglet ouvert peut demander un chunk disparu (404) : rechargement de page et c'est réglé.

## 8. Ce qui manque / idées d'ajouts

Par ordre d'utilité :

1. **Route `/api/health`** : un healthcheck indépendant de la home (réponse cheap, pas de requête DB, code 200 JSON). Permettrait en plus un *readiness probe* plus précis côté Coolify.
2. **Commandes par élèves sans session locale** : aujourd'hui tout repose sur cookie + sessionStorage d'un même appareil. Un minimum (le QR du ticket reste la preuve) mais un élève qui perd l'appareil perd la vue de ses commandes. Un compte léger ou une saisie "prénom + dernier 4 caractères de l'id" suffirait.
3. **Edition du stock par inventaire** : une page "entrées/sorties" avec motif (livraison, casse) tracerait les écarts et permettrait un historique, au lieu de simples ajustements.
4. **Journaux / observabilité** : rien de persisté côté app (console uniquement). Au minimum : logger les 409 stock insuffisant avec le produit en cause.
5. **Export du panier de la semaine** : le recap existe à l'écran ; un export CSV/PDF de la liste d'achats serait la suite logique pour les organisateurs.
6. **Créneaux de retrait** : le champ `jour` est libre ; des créneaux horaires bornés éviteraient les files et affineraient le recap.
7. **Rate limiting sur `POST /api/commandes`** : route publique avec impact stock ; un simple compteur par IP éviterait le spam.
8. **Tests** : aucun test automatisé. Les candidats évidents : `lib/week.ts` (pur), la validation des deux formats `choix` de `/api/commandes`, et la logique de rendu de stock sur suppression.

## 9. Cartographie rapide des fichiers

```
frontend/
├── app/
│   ├── page.tsx                    accueil élève (bannière retrait)
│   ├── commander/page.tsx          commande, stock dynamique, menus personnalisables
│   ├── confirmation/page.tsx       QR + ticket PDF
│   ├── admin/                      login, dashboard, produits, stock, commandes, comptes
│   └── api/
│       ├── produits/               GET (catalogue), POST/PUT/DELETE (admin)
│       ├── commandes/              POST (création + décrément), GET/DELETE (admin)
│       ├── admin/                  login, logout, me, recap, scan, image, comptes
│       └── images/[id]/            photos binaires (cache immutable)
├── lib/
│   ├── auth.ts                     cookie signé HMAC-SHA256 (edge-compatible)
│   ├── db.ts                       connexion Mongoose en cache (anti cold start)
│   ├── week.ts                     semaine cafet lundi -> lundi
│   ├── types.ts                    types partagés client/serveur
│   └── models/                     Produit, Commande, Admin, ImageUpload
├── middleware.ts                   protection /admin/**
└── scripts/seed.ts                 admin + catalogue initial
```
