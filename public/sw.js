// Use a unique cache name for this version of the app
const CACHE_NAME = 'lingualecta-cache-v1';

// This is an array of critical assets that the app needs to function offline.
// This list will be pre-cached when the service worker is installed.
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/pdf.worker.mjs'
  // NOTE: Other critical assets like main JS/CSS chunks are added dynamically by the build process.
  // We will cache other assets on-the-fly as the user navigates.
];


// The install event is fired when the service worker is first installed.
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install event fired.');
  // waitUntil() ensures that the service worker will not install until the code inside has successfully completed.
  event.waitUntil(
    // Open the cache.
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching pre-cache assets.');
      // Add all the specified assets to the cache.
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Forces the waiting service worker to become the active service worker.
  self.skipWaiting();
});

// The activate event is fired when the service worker starts up.
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate event fired.');
  event.waitUntil(
    // Get all the cache keys (cache names).
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // If a cache name is not the current one, delete it.
          if (cacheName !== CACHE_NAME) {
            console.log(`[Service Worker] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // When a service worker is initially registered, pages won't use it until they next load.
  // The claim() method causes those pages to be controlled by the service worker immediately.
  return self.clients.claim();
});

// The fetch event is fired for every network request the page makes.
self.addEventListener('fetch', (event) => {
  // We only want to intercept GET requests.
  if (event.request.method !== 'GET') {
    return;
  }
  
  // For navigation requests (i.e., for HTML pages), use a "Network Falling Back to Cache" strategy.
  // This is good for content that updates frequently.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/'))
    );
    return;
  }
  
  // For all other requests (like images, scripts, styles), use a "Cache First, Falling Back to Network" strategy.
  // This is good for static assets that don't change often.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // If the resource is in the cache, return it.
      if (cachedResponse) {
        // console.log('[Service Worker] Returning from cache:', event.request.url);
        return cachedResponse;
      }

      // If the resource is not in the cache, fetch it from the network.
      return fetch(event.request).then((networkResponse) => {
        // console.log('[Service Worker] Fetching from network and caching:', event.request.url);
        
        // Clone the response because it's a stream and can only be consumed once.
        const responseToCache = networkResponse.clone();
        
        // Open the cache and add the new resource to it.
        caches.open(CACHE_NAME).then((cache) => {
            if (event.request.url.includes('chrome-extension')) {
                return;
            }
            cache.put(event.request, responseToCache);
        });
        
        // Return the network response.
        return networkResponse;
      }).catch(error => {
        console.log('[Service Worker] Fetch failed for:', event.request.url, error);
        // You could return a fallback asset here if you have one.
      });
    })
  );
});
