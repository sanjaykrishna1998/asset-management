const CACHE_NAME = "my-pwa-cache-v1";
const FILES_TO_CACHE = [
  "/",
  "/asset-form.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/style.css",
  "/app.js"
];

// Install Service Worker & Cache Files
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Install");

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching app shell");
      return Promise.all(
        FILES_TO_CACHE.map((url) =>
          fetch(url)
            .then((response) => {
              if (!response.ok) {
                console.error(`[Service Worker] Failed to fetch ${url}: ${response.statusText}`);
                return null;
              }
              return cache.put(url, response.clone());
            })
            .catch((err) => {
              console.error(`[Service Worker] Error fetching ${url}:`, err);
            })
        )
      );
    })
  );

  self.skipWaiting(); // Activate immediately
});

// Activate & Clean Old Caches
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activate");
  event.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache", key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch Cached Files or Network Fallback
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).catch(() => {
          // Offline fallback page (if you have one)
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
        })
      );
    })
  );
});
