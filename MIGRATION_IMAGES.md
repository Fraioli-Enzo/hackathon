# Plan de migration : images triées en thèmes

Cette migration accompagne le commit "Images triées en thèmes : produits/, agents/, logos/". Elle ne concerne **que** une base de prod qui contient déjà des produits avec les anciens chemins d'images. Une base vide ou un simple seed n'a rien à faire : `scripts/seed.ts` crée déjà les produits avec les bons chemins.

## Ce qui a changé

- Les 28 images de `frontend/public/images/` sont réparties en 3 sous-dossiers :
  - `produits/` (20 images de produits, référencées en BDD)
  - `agents/` (7 images des agents BAO et DUONG)
  - `logos/` (2 logos CESI)
- Le code qui les référence est à jour : `lib/types.ts` (IMAGES_PRODUITS), `scripts/seed.ts`, `layout.tsx`, `lib/agent-identite.ts`, `components/EasterEggDuong.tsx`, `app/confirmation/page.tsx`.
- **Ce que le code ne peut pas corriger lui-même** : les 20 documents `produits` stockent leur chemin d'image en base (`image: "/images/bao-porc.webp"`). Il faut les mettre à jour à la main sur le Mongo de prod.

## Étapes de déploiement (prod avec data existante)

1. **Déployer le nouveau code** (branche contenant le commit de tri des images).

2. **Lancer la migration sur le Mongo de prod**, juste après la mise en ligne :

   ```bash
   mongosh "mongodb://<URL-MONGO-PROD>/cafet" --eval '
   db.produits.updateMany(
     { image: { $regex: "^/images/" } },
     [ { $set: { image: { $replaceOne: { input: "$image", find: "/images/", replacement: "/images/produits/" } } } }
   ])'
   ```

   - Le filtre `^/images/` ne touche que les anciens chemins.
   - Idempotent : un second passage ne modifie rien (les nouveaux chemins commencent par `/images/produits/`).

3. **Vérifier** :

   ```bash
   mongosh "mongodb://<URL-MONGO-PROD>/cafet" --quiet --eval '
   db.produits.countDocuments({ image: { $regex: "^/images/(?!produits/)" } })'
   # attendu : 0
   ```

   Puis dans le navigateur :
   - l'accueil affiche les images des produits (pas de 404),
   - une image directe répond 200 : `https://<app>/images/produits/bao-porc.webp`,
   - l'agent flottant et le footer s'affichent (agents/ et logos/).

## Fenêtre de coupure

Entre le déploiement du code et l'exécution de la migration, les images des produits sont en 404. Durée : le temps de lancer la commande. Lancer la migration immédiatement après la mise en ligne.

## Rollback

- Code : revenir sur le commit précédent (les `git mv` préservent l'historique, `git revert` suffit).
- Base : commande inverse :

  ```bash
  mongosh "mongodb://<URL-MONGO-PROD>/cafet" --eval '
  db.produits.updateMany(
    { image: { $regex: "^/images/produits/" } },
    [ { $set: { image: { $replaceOne: { input: "$image", find: "/images/produits/", replacement: "/images/" } } } }
   ])'
  ```

## Non concernés

- Images uploadées via l'espace admin : stockées en base (binaire), servies par `/api/images/...`, aucun chemin sur disque.
- Comptes, commandes, stocks : aucun lien avec cette migration.
