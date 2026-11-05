// Caché propia de esta app (nombre distinto al de otras PWA del mismo usuario de GitHub)
const CACHE_NAME = "heas-dx-v2";
const APP_SHELL = ["./", "./index.html", "./styles.css", "./script.js", "./manifest.json", "./datos_heas.json", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      // solo borra cachés de ESTA app (prefijo heas-dx-), nunca las de otras PWA
      Promise.all(keys.filter((k) => k.startsWith("heas-dx-") && k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Red primero (datos siempre al día); si no hay internet, usa la copia guardada.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        const copia = resp.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, copia)).catch(() => {});
        return resp;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
