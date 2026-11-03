# Cafet CESI — Site de commande

Plateforme de commande de nourriture (banh bao, nems, mochis…) pour la cafétéria du CESI, avec regroupement automatique des commandes de la semaine pour les organisateurs.

- **Élèves** : formulaire de commande, ticket PDF avec QR code, paiement sur place (espèces / Lydia).
- **Admin cafet** : panier de la semaine (quoi acheter), CRUD produits & prix, liste des commandes, scan QR pour valider les retraits.

## Stack

Next.js 14 (App Router) full-stack, Tailwind CSS (thème noir & jaune), MongoDB via Mongoose, PDF via `jspdf`, QR via `qrcode` + `jsqr`. Un seul service, dockerisable.

## Structure

```
hackathon/
├── PLAN.md               # plan projet
├── start.sh              # lancement en une commande
├── docker-compose.yml    # mongo + app
└── frontend/             # application Next.js complète (front + API intégrée)
    ├── app/              # pages, API routes (app/api/**)
    ├── components/
    ├── lib/              # db, modèles, sessions, utils semaine
    ├── scripts/seed.ts
    ├── middleware.ts     # protection /admin/**
    ├── Dockerfile
    └── setup.sh
```

## Démarrage rapide

```bash
./start.sh
```

Le script délègue à `frontend/setup.sh` qui vérifie node ≥ 20 et docker, installe les dépendances, crée `.env.local`, démarre MongoDB dans Docker, fait le seed (admin + produits de départ), puis lance le serveur sur http://localhost:3000.

Options : `./start.sh --seed-only`, `./start.sh --no-start`.

## Comptes / variables

`frontend/.env.local` (jamais commité) :

```
MONGODB_URI=mongodb://localhost:27017/cafet
SESSION_SECRET=<secret aléatoire>
ADMIN_EMAIL=admin@cesi.fr
ADMIN_PASSWORD=cafet2026
```

Admin par défaut après seed : `admin@cesi.fr` / `cafet2026` (à changer pour la prod).

## Docker (tout conteneurisé)

Depuis la racine du repo :

```bash
docker compose up -d --build
```

- `mongo` : mongo:7, volume persistant `mongo-data`, port 27017
- `app` : image Next.js, port 3000

## Développement manuel

```bash
cd frontend
npm install
docker compose up -d mongo   # depuis la racine, ou n'importe quel MongoDB local
npm run seed
npm run dev
```

## Parcours de test

1. Accueil → Commander → remplir le formulaire, choisir des quantités, valider.
2. Ticket PDF téléchargé avec QR code unique.
3. `/admin/login` → dashboard de la semaine (quantités par produit, CA).
4. `/admin/scan` → scanner le QR du ticket, la commande passe en « récupérée » (le double scan est signalé).
