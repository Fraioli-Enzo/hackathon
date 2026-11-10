# 📋 Plan - Site de commande pour la cafet CESI

Projet hackathon : plateforme de commande de nourriture (banh bao, nems, mochis) pour la cafétéria de l'école, avec regroupement automatique des commandes de la semaine pour les organisateurs.

## 🎯 Objectif

- **Côté élèves** : commander facilement via un formulaire, recevoir un ticket PDF avec QR code.
- **Côté admin (cafet)** : savoir exactement quoi acheter pour la semaine, gérer les produits et prix, valider les retraits via QR code.

## 🏗️ Architecture

**Next.js full-stack + MongoDB** (pas de backend Python - l'API est intégrée à Next.js, un seul service à déployer).

| Couche | Technologie |
|---|---|
| Front | Next.js 14+ (App Router), Tailwind CSS, thème **noir & jaune CESI** |
| Back | API Routes Next.js (`app/api/**`) |
| BDD | MongoDB (serveur perso en prod, container Docker en dev), driver via Mongoose |
| PDF | Génération du ticket côté client (`jspdf` ou `pdf-lib`) |
| QR code | `qrcode` - encode l'ID de commande pour le scan admin |

## 📐 Structure du projet

```
hackathon/
├── app/
│   ├── page.tsx                  # Accueil : présentation + produits
│   ├── commander/page.tsx        # Formulaire de commande + panier
│   ├── confirmation/page.tsx     # Succès + génération PDF ticket
│   ├── admin/
│   │   ├── login/page.tsx       # Connexion admin
│   │   ├── page.tsx             # Dashboard : panier de la semaine
│   │   ├── produits/page.tsx     # CRUD produits & prix
│   │   ├── commandes/page.tsx    # Liste des commandes de la semaine
│   │   └── scan/page.tsx         # Scan QR → commande "récupérée"
│   └── api/
│       ├── commandes/route.ts    # POST (créer), GET (lister)
│       ├── produits/route.ts     # GET, POST
│       ├── produits/[id]/route.ts# PUT, DELETE
│       ├── admin/login/route.ts  # POST (auth)
│       ├── admin/me/route.ts     # GET (session)
│       ├── admin/logout/route.ts # POST
│       ├── admin/scan/route.ts   # POST (marquer récupérée)
│       └── admin/recap/route.ts  # GET (aggrégation semaine)
├── components/                   # UI réutilisable (Cart, ProductCard, etc.)
├── lib/
│   ├── db.ts                     # Connexion Mongoose (singleton)
│   ├── models/                   # Schémas (Admin, Produit, Commande)
│   └── week.ts                   # Utils semaine ISO (lundi→dimanche)
├── scripts/seed.ts               # Création admin + produits initiaux
├── Dockerfile                    # Build multi-stage node:20-alpine
├── docker-compose.yml            # Services mongo + app
├── setup.sh                      # Installation & lancement automatiques
├── .env.local                    # MONGODB_URI (jamais commité)
└── README.md
```

## 🗄️ Modèles MongoDB

```
admins     { email, passwordHash }
produits   { nom, prix, description, actif }
commandes  { prenom, nom, email, batiment: "Orion"|"Antares",
             items: [{ produitId, nom, prix, qte }],
             total, statut: "en_attente"|"recuperee",
             createdAt }
```

- Le QR code encode l'`_id` de la commande.
- Le panier de la semaine = agrégation des commandes dont `createdAt` est dans la semaine ISO courante (lundi → dimanche), groupée par produit (somme des quantités).

## 🖥️ Pages & fonctionnalités

### Côté utilisateur
1. **Accueil** (`/`) : présentation du concept, liste des produits actifs avec prix, CTA "Commander".
2. **Commander** (`/commander`) :
   - Formulaire : prénom, nom, bâtiment (**Orion** / **Antares**), jour de retrait (**lundi à vendredi**, hors week-end)
   - Chaque produit avec sélecteur de quantité (+/-), composition des menus (choix des variantes), gestion du stock en temps réel
   - Panier en temps réel, total dynamique
   - Validation → `POST /api/commandes` → redirection vers la confirmation
3. **Confirmation** (`/confirmation`) :
   - Génération et téléchargement du **PDF ticket de caisse** : produits, quantités, prix, total, QR code unique
   - Mention "paiement sur place (par carte uniquement)"
4. **Agent IA (BAO)** (`/`) : chat intégré qui répond aux questions produits et passe commande via les outils (`lister_produits`, `detail_produit`, `creer_commande`). Un serveur **MCP** (`mcp/cafet-produits`) expose aussi le catalogue (`lister_produits`, `detail_produit`) en stdio.

### Côté admin
1. **Login** (`/admin/login`) : email + mot de passe (hashé en BDD), session par cookie httpOnly.
2. **Dashboard** (`/admin`) : panier de la semaine - total par produit à acheter (ex. "45 banh bao, 38 nems, 52 mochis"), nombre de commandes, CA de la semaine.
3. **Produits** (`/admin/produits`) : ajouter / modifier / supprimer des produits et leur prix (donc facile d'ajouter un produit au-delà des 3 de départ). Gestion des images.
4. **Commandes** (`/admin/commandes`) : liste détaillée de la semaine, badges de statut (**récupérée / pas récupérée**, **payée / pas payée**), filtres (statut, payées / non payées), recherche par nom. Actions : **Valider** (marque récupérée *et* payée), **Dévalider**, **Marquer payée / pas payée**, **Supprimer**, plus une saisie de **commande sur place**.
5. **Scan QR** (intégré à `/admin/commandes`) : scanner le QR du ticket → passe la commande en "récupérée" *et* "payée" (évite les doubles retraits). Fallback : bouton "Valider" dans le tableau.
6. **Stock** (`/admin/stock`) : stock restant par produit. **Comptes** (`/admin/comptes`) : gestion des comptes admins.

## 🐳 Docker

- **`Dockerfile`** : build multi-stage `node:20-alpine`, image finale légère, port 3000.
- **`docker-compose.yml`** (dev) :
  - `mongo` : `mongo:7`, volume persistant `mongo-data`, port `27017` local
  - `app` : Next.js, `MONGODB_URI=mongodb://mongo:27017/cafet`
- Données persistantes entre `docker compose down` / `up` (volume).

## 🔧 start.sh

Script unique et idempotent :
1. Vérifie `node` ≥ 20
2. `npm install`
3. Crée `.env.local` (sans écraser une config existante)
4. Lance `npm run dev` (mode dev)

Le seed se lance via `npm run seed` (compte admin + produits de départ). En dev, MongoDB tourne en container Docker (`docker compose up -d mongo`).

## ✅ Ordre de développement

| Étape | Contenu | Statut |
|---|---|---|
| 1 | Squelette Next.js + Tailwind, thème | ✅ Fait |
| 2 | Docker (Dockerfile + compose) | ✅ Fait |
| 3 | Connexion Mongo + modèles + seed | ✅ Fait |
| 4 | API produits + page admin produits (CRUD) | ✅ Fait |
| 5 | Formulaire commande + panier + `POST /api/commandes` | ✅ Fait |
| 6 | PDF ticket + QR code | ✅ Fait |
| 7 | Login admin + sessions (cookie signé HMAC) | ✅ Fait |
| 8 | Dashboard semaine (aggrégation) + liste commandes + scan QR | ✅ Fait |
| 9 | Agent IA (BAO) + serveur MCP | ✅ Fait |
| 10 | Retours v1 : paiement carte uniquement, retraits lun-ven, statuts admin (payé, dévalidation), fix login dashboard | ✅ Fait (`fix/v1`) |

## 🔐 Sécurité & config

- `.env.local` jamais commité (`.gitignore`), `MONGODB_URI` en variable d'env
- Mots de passe admin hashés (bcrypt), cookie de session httpOnly
- Validation des entrées côté serveur (prénom/nom, bâtiment, jour de retrait lun-ven, quantités > 0) et "pas de paiement en ligne" (sur place, par carte uniquement)

## 🗓️ Backlog après la hackathon

- **Migrer Next.js vers 15 puis 16** : Turbopack par défaut, React 19, builds plus rapides. C'est une migration majeure, prévoir une session dédiée : params async des routes dynamiques (`app/api/**/[id]`), nouveaux défauts de cache (vérifier les pages `force-dynamic`), `middleware.ts`, `next/image`, puis re-test complet du parcours (commande, ticket PDF, scan QR, admin). En attendant : rester en 14.2.x à jour (14.2.35) et ignorer le bandeau « outdated » de l'overlay dev.
