// Service worker minimal : met en cache les assets statiques Next.js et les images.
// La mise a jour n'est appliquee que sur demande de l'utilisateur (message SKIP_WAITING).

const CACHE = "cafet-static-v1";

self.addEventListener("install", () => {
  // rien a precacher : on laisse le navigateur telecharger, le cache se remplit au fetch
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const estStatique = url.origin === self.location.origin && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/images/"));

  if (estStatique) {
    // cache d'abord, reseau en secours (les noms de fichiers Next.js sont hashes : immuables)
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((rep) => {
        const copie = rep.clone();
        caches.open(CACHE).then((c) => c.put(request, copie));
        return rep;
      }))
    );
    return;
  }

  if (request.mode === "navigate") {
    // pages : reseau d'abord pour toujours voir la derniere version, cache en secours hors-ligne
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((hit) => hit || caches.match("/")))
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
