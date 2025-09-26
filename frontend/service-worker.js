const CACHE_NAME = "my-pwa-cache-v4";
const FILES_TO_CACHE = [
  "/",                // root
  "/asset-form.html", // ✅ main page for offline use
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/style.css",
  "/app.js"
];

// Install & pre-cache
self.addEventListener("install", (event) => {
  console.log("[SW] Install");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        FILES_TO_CACHE.map((url) =>
          fetch(url)
            .then((res) => {
              if (res.ok) return cache.put(url, res.clone());
              console.warn(`[SW] Skip ${url}: ${res.statusText}`);
            })
            .catch((err) =>
              console.warn(`[SW] Offline during cache of ${url}:`, err)
            )
        )
      )
    )
  );
  self.skipWaiting();
});

// Activate & remove old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Serve from cache first, network fallback
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        // ✅ Offline fallback to asset-form.html
        if (event.request.mode === "navigate") {
          return caches.match("/asset-form.html");
        }
      });
    })
  );
});

