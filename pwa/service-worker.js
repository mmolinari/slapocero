/**
 * Slapocero Service Worker
 * Implements cache-first strategy for assets and network-first for HTML/JS
 */

const CACHE_NAME = 'slapocero-v1.0.0';
const CACHE_VERSION = 1;

// Assets to cache on install
const CACHE_ASSETS = [
  '/slapocero/',
  '/slapocero/index.html',
  '/slapocero/styles.css',
  '/slapocero/src/app.js',
  '/slapocero/src/utils.js',
  '/slapocero/src/state.js',
  '/slapocero/src/audio.js',
  '/slapocero/pwa/manifest.json',
  // Images
  '/slapocero/assets/img/slapocero_idle_01.jpeg',
  '/slapocero/assets/img/slapocero_idle_02.jpeg',
  '/slapocero/assets/img/slapocero_idle_03.jpeg',
  '/slapocero/assets/img/slapocero_idle_04.jpeg',
  '/slapocero/assets/img/slapocero_idle_05.jpeg',
  '/slapocero/assets/img/slapocero_idle_06.jpeg',
  '/slapocero/assets/img/slapocero_hit_07.jpeg',
  '/slapocero/assets/img/slapocero_hit_08.jpeg',
  '/slapocero/assets/img/slapocero_hit_09.jpeg',
  '/slapocero/assets/img/slapocero_hit_10.jpeg',
  '/slapocero/assets/img/slapocero_hit_11.jpeg',
  '/slapocero/assets/img/slapocero_hit_12.jpeg',
  // Audio files (mp3 format as primary)
  '/slapocero/assets/audio/grunt_idle_01.mp3',
  '/slapocero/assets/audio/grunt_idle_02.mp3',
  '/slapocero/assets/audio/grunt_idle_03.mp3',
  '/slapocero/assets/audio/grunt_hit_01.mp3',
  '/slapocero/assets/audio/grunt_hit_02.mp3',
  '/slapocero/assets/audio/grunt_hit_03.mp3',
  '/slapocero/assets/audio/slap_ciaf_01.mp3',
  '/slapocero/assets/audio/slap_ciaf_02.mp3',
  '/slapocero/assets/audio/slap_ciaf_03.mp3',
  '/slapocero/assets/audio/slap_ciaf_04.mp3',
  '/slapocero/assets/audio/slap_ciaf_05.mp3',
  '/slapocero/assets/audio/slap_ciaf_06.mp3',
  '/slapocero/assets/audio/slap_ciaf_07.mp3',
  '/slapocero/assets/audio/slap_ciaf_08.mp3'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell and assets');
        return cache.addAll(CACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] All assets cached successfully');
        // Force activation of new service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache assets:', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-HTTP requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Skip cross-origin requests that aren't assets
  if (url.origin !== location.origin) {
    return;
  }
  
  event.respondWith(handleFetch(request));
});

/**
 * Handle fetch requests with appropriate caching strategy
 */
async function handleFetch(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  try {
    // Cache-first strategy for assets (images, audio, CSS)
    if (isAssetRequest(pathname)) {
      return await cacheFirst(request);
    }
    
    // Network-first strategy for HTML and JS files
    if (isDocumentOrScript(pathname)) {
      return await networkFirst(request);
    }
    
    // Default to network-first for everything else
    return await networkFirst(request);
    
  } catch (error) {
    console.error('[SW] Fetch error:', error);
    
    // Return cached version if available, otherwise show offline page
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return a basic offline response for navigation requests
    if (request.mode === 'navigate') {
      return new Response(
        createOfflinePage(),
        { 
          headers: { 'Content-Type': 'text/html' },
          status: 200,
          statusText: 'OK'
        }
      );
    }
    
    // For other requests, return a network error
    return new Response('Network error', { 
      status: 503, 
      statusText: 'Service Unavailable' 
    });
  }
}

/**
 * Cache-first strategy: check cache first, then network
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log('[SW] Cache hit:', request.url);
    return cachedResponse;
  }
  
  console.log('[SW] Cache miss, fetching from network:', request.url);
  const networkResponse = await fetch(request);
  
  // Cache successful responses
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

/**
 * Network-first strategy: try network first, fallback to cache
 */
async function networkFirst(request, timeout = 3000) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Add timeout to network request
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Network timeout')), timeout);
    });
    
    const networkResponse = await Promise.race([networkPromise, timeoutPromise]);
    
    if (networkResponse.ok) {
      // Update cache with fresh response
      cache.put(request, networkResponse.clone());
      console.log('[SW] Network success, cached:', request.url);
      return networkResponse;
    }
    
    throw new Error(`HTTP ${networkResponse.status}`);
    
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url, error.message);
    
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('[SW] Cache fallback:', request.url);
      return cachedResponse;
    }
    
    throw error;
  }
}

/**
 * Check if request is for an asset (images, audio, fonts, CSS)
 */
function isAssetRequest(pathname) {
  return (
    pathname.startsWith('/slapocero/assets/') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.gif') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.mp3') ||
    pathname.endsWith('.ogg') ||
    pathname.endsWith('.wav') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.ttf')
  );
}

/**
 * Check if request is for HTML or JavaScript
 */
function isDocumentOrScript(pathname) {
  return (
    pathname === '/slapocero/' ||
    pathname === '/slapocero/index.html' ||
    pathname.endsWith('.html') ||
    pathname.endsWith('.js') ||
    pathname.startsWith('/slapocero/src/')
  );
}

/**
 * Create a simple offline page
 */
function createOfflinePage() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Slapocero - Offline</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f3e8d2;
                color: #3d2914;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                text-align: center;
            }
            .offline-container {
                max-width: 400px;
                padding: 20px;
                background: white;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            .warthog-emoji {
                font-size: 4rem;
                margin-bottom: 1rem;
            }
            h1 {
                color: #7a4b2a;
                margin-bottom: 1rem;
            }
            .retry-btn {
                background: #7a4b2a;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 1rem;
                margin-top: 1rem;
            }
            .retry-btn:hover {
                background: #5d3820;
            }
        </style>
    </head>
    <body>
        <div class="offline-container">
            <div class="warthog-emoji">🐗</div>
            <h1>Slapocero</h1>
            <p>You're offline, but the warthog is still here!</p>
            <p>The game should work offline once it's been loaded.</p>
            <button class="retry-btn" onclick="window.location.reload()">
                Try Again
            </button>
        </div>
    </body>
    </html>
  `;
}

// Handle messages from the app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      type: 'VERSION',
      version: CACHE_NAME,
      cacheVersion: CACHE_VERSION
    });
  }
});

// Background sync for potential future features
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-stats') {
    event.waitUntil(syncGameStats());
  }
});

/**
 * Sync game statistics (placeholder for future functionality)
 */
async function syncGameStats() {
  try {
    console.log('[SW] Syncing game stats...');
    // This could upload stats to a server when online
    // For now, it's just a placeholder
  } catch (error) {
    console.error('[SW] Failed to sync stats:', error);
  }
}

// Log service worker startup
console.log('[SW] Service Worker script loaded');
console.log('[SW] Cache name:', CACHE_NAME);
console.log('[SW] Will cache', CACHE_ASSETS.length, 'assets');