# Workflow Git - Cafet CESI

Branches : `dev` (travail) → `main` (validé) → `prod` (déployé).

## Règle

Toujours travailler sur `dev` (directement pour une petite tâche). Ne jamais commit directement sur `main` ou `prod`.

## Tâche significative

Créer une branche dédiée à partir de `dev`, travailler dessus, puis la merger sur `dev` une fois terminée :

```bash
git checkout dev
git pull
git checkout -b feat/ma-tache
# ... commits sur la branche ...

git checkout dev
git merge feat/ma-tache
git branch -d feat/ma-tache        # supprime la branche locale
```

Puis le workflow normal (push dev, merge main, merge prod). La branche distante est supprimée au push du merge si elle n'est plus utile.

## Quand une tâche est finie et validée

```bash
git checkout dev
git pull

git push origin dev

git checkout main
git merge dev
git push origin main

git checkout prod
git merge main
git push origin prod

# Release SemVer (vX.Y.Z) :
# - patch (v1.0.1) : correction de bug
# - mineur (v1.1.0) : nouvelle fonctionnalite
# - majeur (v2.0.0) : changement cassant
# 1. Ecrire le numero dans frontend/VERSION (c'est ce fichier, commite, qui est affiche
#    dans le footer en prod : git/.git peut etre absent du build chez l'hebergeur) :
echo "v1.1.0" > frontend/VERSION
git add frontend/VERSION
git commit -m "Release v1.1.0"
# 2. Taguer la release sur prod, puis tout pousser :
git tag v1.1.0 prod
git push origin prod
git push origin v1.1.0

git checkout dev
```

## En résumé

`dev → push → merge dans main → push → merge dans prod → push → tag vX.Y.Z sur prod → push du tag → retour sur dev`
