// Déclare les fichiers CSS importés pour leurs effets de bord (ex. globals.css)
// afin que TypeScript ne les signale pas comme modules introuvables.
// Les CSS Modules (*.module.css) gardent leurs types générés par Next.js,
// ce motif moins spécifique ne les remplace pas.
declare module "*.css";
