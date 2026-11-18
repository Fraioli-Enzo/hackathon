# Mémoire du projet - Cafet CESI

Règles de cohérence entre pages. À lire avant de modifier une page listée ici.

## Pages miroir : commande élève et commande admin

`frontend/app/commander/page.tsx` (commande élève, panier) et `frontend/app/admin/commandes/page.tsx` (mode "Ajouter" : commande sur place) dupliquent la même logique de commande : formulaire élève, panier, stocks dynamiques, jour de retrait.

**Toute modification de la page `/commander` doit être répercutée sur le formulaire "Ajouter une commande" de la page admin, et inversement.**

Exemples déjà appliqués des deux côtés :

- Limite de 50 caractères sur les champs nom et prénom (`maxLength={50}`).
- Jour de retrait par défaut = jour même (fallback "Lundi" le week-end) : `jourRetraitParDefaut()` côté admin, `useEffect` côté `/commander`.
