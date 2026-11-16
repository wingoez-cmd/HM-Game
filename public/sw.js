// Jeu du HM — service worker : le jeu reste jouable hors connexion.
const CACHE = 'jeu-du-hm-__VERSION__';
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname === '/ws') return;
  // Réseau d'abord (pour recevoir les mises à jour), cache si hors ligne
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(url.pathname === '/' ? '/' : e.request, copy)); }
      return r;
    }).catch(() => caches.match(url.pathname === '/' || url.pathname === '/index.html' ? '/' : e.request))
  );
});
