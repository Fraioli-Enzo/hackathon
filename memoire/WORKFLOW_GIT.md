# Workflow Git - Cafet CESI

Branches : `dev` (travail) → `main` (validé) → `prod` (déployé).

## Règle

Toujours travailler sur `dev`. Ne jamais commit directement sur `main` ou `prod`.

## Quand une tâche est finie et validée

```bash
git checkout dev
git pull
git merge <branche-de-la-tache>   # ou commit direct sur dev

git push origin dev

git checkout main
git merge dev
git push origin main

git checkout prod
git merge main
git push origin prod

git checkout dev
```

## En résumé

`dev → push → merge dans main → push → merge dans prod → push → retour sur dev`
