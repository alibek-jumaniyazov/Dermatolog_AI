const CACHE = 'derma-static-v1';
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['/offline.html', '/icon.svg']))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))); self.clients.claim(); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api')) return;
  if (event.request.mode === 'navigate') { event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html'))); return; }
  if (url.pathname === '/icon.svg' || url.pathname.startsWith('/assets/')) event.respondWith(caches.open(CACHE).then(async cache => { const saved = await cache.match(event.request); if (saved) return saved; const response = await fetch(event.request); if (response.ok) await cache.put(event.request, response.clone()); return response; }));
});
