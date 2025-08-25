const CACHE_NAME = "asset-pwa-v1";
const FILES_TO_CACHE = [
  "/",
  "/asset-form.html",
  "/asset-table.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/manifest.json"
];

self.addEventListener("install", (e) => {
console.log("SW: Install");
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
console.log("SW: Activate");
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  let reqUrl = new URL(e.request.url);

  // Remove query params (Safari adds ?standalone=1)
  let cacheKey = reqUrl.pathname;

  e.respondWith(
    caches.match(cacheKey).then((resp) => {
      return resp || fetch(e.request).catch(() => caches.match("/asset-form.html"));
    })
  );
});

