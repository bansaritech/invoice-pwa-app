const CACHE = 'ledger-v11';
const CORE = ['./', './index.html', './app.js', './manifest.webmanifest',
  './assets/ledger.css', './assets/theme.js', './assets/drawer.js'];

self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE))); });
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
  await self.clients.claim();
})()));

// Network-first for same-origin GETs (fresh app on every reload), falling back to cache
// when offline. Cross-origin (GitHub API, fonts) goes straight to network.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
