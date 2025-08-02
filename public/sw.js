const CACHE_NAME = 'lingualecta-cache-v2';

// On install, activate immediately
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

// On activation, take control of all clients and clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })()
  );
});

// Fetch event: Cache-first strategy
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // For navigation requests (e.g., loading the page), use a network-first approach
  // to ensure the user gets the latest version of the app shell.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(event.request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        } catch (error) {
          // If the network fails, try to serve from the cache
          const cachedResponse = await caches.match(event.request);
          return cachedResponse || caches.match('/');
        }
      })()
    );
    return;
  }

  // For all other requests (assets like JS, CSS, images), use a cache-first strategy.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await caches.match(event.request);

      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(event.request);
        // Only cache successful responses
        if (networkResponse.ok) {
          await cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        console.error('Fetch failed:', error);
        // We don't have a fallback for non-cached assets, so the request will fail.
        // This is okay for a simple cache-first strategy.
        throw error;
      }
    })()
  );
});
