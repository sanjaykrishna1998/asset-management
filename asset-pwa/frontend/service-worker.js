self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('asset-cache').then(c => c.addAll([
      '/', '/asset-form.html', '/asset-table.html', '/manifest.json'
    ]))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
