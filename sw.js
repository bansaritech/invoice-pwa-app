const CACHE = 'invoice-simple-v19';
const ASSETS = ['./', './index.html', './app.js', './data.json', './manifest.webmanifest', './icons/icon-192.svg', './icons/icon-512.svg'];
self.addEventListener('install', (event) => { self.skipWaiting(); event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS))); });
self.addEventListener('activate', (event) => event.waitUntil((async () => { const keys = await caches.keys(); await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))); await self.clients.claim(); })()));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // data.json is user data: always try the network first so source edits show, fall back to cache offline.
  if (new URL(event.request.url).pathname.endsWith('data.json')) {
    event.respondWith(fetch(event.request).then((response) => { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(event.request, copy)); return response; }).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
