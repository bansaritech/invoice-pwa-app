const CACHE = 'invoice-simple-v10';
const ASSETS = ['./', './index.html', './app.js', './data.json', './manifest.webmanifest', './icons/icon-192.svg', './icons/icon-512.svg'];
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS))));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => { if (event.request.method === 'GET') event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request))); });
