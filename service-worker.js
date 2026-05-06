// Service Worker for Cache Management
// This provides better control over caching than ?v= parameters

const CACHE_VERSION = 'v2026050421';
const CACHE_NAME = `inventory-helper-${CACHE_VERSION}`;

// Files to cache
const STATIC_CACHE = [
    '/',
    '/index.html',
    '/css/main.css',
    '/css/upload.css',
    '/css/category.css',
    '/css/editor.css',
    '/css/review.css',
    '/css/report.css',
    '/css/rescan.css',
    '/css/scanner.css',
    '/js/translations.js',
    '/js/i18n.js',
    '/js/state.js',
    '/js/utils/xlsx-parser.js',
    '/js/utils/sorter.js',
    '/js/utils/exporter.js',
    '/js/utils/barcode-scanner.js',
    '/js/screens/upload.js',
    '/js/screens/category.js',
    '/js/screens/editor.js',
    '/js/screens/rescan.js',
    '/js/screens/review.js',
    '/js/screens/report.js',
    '/js/app.js'
];

// Install event - cache files
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing version:', CACHE_VERSION);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching app shell');
                return cache.addAll(STATIC_CACHE);
            })
            .then(() => self.skipWaiting()) // Activate immediately
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating version:', CACHE_VERSION);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control immediately
    );
});

// Fetch event - network first, fall back to cache
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip chrome-extension and other non-http(s) requests
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        // Network First strategy for HTML and JS files
        fetch(event.request)
            .then((response) => {
                // Clone the response before caching
                const responseToCache = response.clone();

                // Update cache with fresh content
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request).then((response) => {
                    if (response) {
                        console.log('[Service Worker] Serving from cache:', event.request.url);
                        return response;
                    }
                    // If not in cache either, return a custom offline page or error
                    return new Response('Offline - content not available', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({
                            'Content-Type': 'text/plain'
                        })
                    });
                });
            })
    );
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            })
        );
    }
});
