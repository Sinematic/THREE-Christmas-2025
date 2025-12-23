self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
});

self.addEventListener('fetch', (event) => {
  // simple fetch pass-through, pas de cache
  event.respondWith(fetch(event.request));
});
