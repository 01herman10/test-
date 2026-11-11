// Appli installable : garde une copie du calculateur pour qu'il marche aussi sans Internet.
// Prudence : on demande toujours d'abord la version en ligne (rien de périmé quand Internet marche) ;
// la copie ne sert que si le réseau ne répond pas. Les pages privées et l'API ne sont jamais gardées,
// sauf le taux de change du jour (dernier taux connu, utile hors ligne).
const CACHE = "douane-afrique-v1";
const ESSENTIELS = [
  "/", "/calculateur.js", "/douane/regles.js", "/douane/devises.js", "/douane/partage.js",
  "/manifest.webmanifest", "/icones/icone.svg", "/icones/icone-192.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESSENTIELS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((k) => k.startsWith("douane-afrique-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function aGarder(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return url.pathname === "/api/taux";
  return !/^\/(suivi|admin)\//.test(url.pathname) && url.pathname !== "/presence.js";
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!aGarder(url)) return;
  e.respondWith(
    fetch(req)
      .then((rep) => {
        if (rep.ok && rep.type === "basic") {
          const copie = rep.clone();
          caches.open(CACHE).then((c) => c.put(req.mode === "navigate" ? url.pathname : req, copie)).catch(() => {});
        }
        return rep;
      })
      .catch(() =>
        caches.match(req.mode === "navigate" ? url.pathname : req, { ignoreSearch: req.mode === "navigate" })
          .then((r) => r || (req.mode === "navigate" ? caches.match("/") : undefined))
          .then((r) => r || Response.error())
      )
  );
});
