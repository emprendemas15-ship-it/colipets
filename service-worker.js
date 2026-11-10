const CACHE_NAME = 'colipets-shell-v15';
const APP_SHELL = [
    './',
    './index.html',
    './manifest.webmanifest',
    './src/app.css',
    './src/legacy/clean-baseline.js',
    './src/legacy/original-calculator.js',
    './src/app.js?v=15',
    './src/cloud-sync.js',
    './src/supabase-config.js',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => Promise.all(
                cacheNames
                    .filter(cacheName => cacheName.startsWith('colipets-shell-') && cacheName !== CACHE_NAME)
                    .map(cacheName => caches.delete(cacheName))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const requestUrl = new URL(request.url);
    if (requestUrl.origin !== self.location.origin && requestUrl.origin !== 'https://cdn.jsdelivr.net') return;

    event.respondWith(
        fetch(request)
            .then(response => {
                if (response.ok || response.type === 'opaque') {
                    return caches.open(CACHE_NAME)
                            .then(cache => cache.put(request, response.clone()))
                            .then(() => response)
                            .catch(error => {
                                console.error('No se pudo guardar un recurso de COLIPETS para uso sin conexión:', error);
                                return response;
                            });
                }
                return response;
            })
            .catch(async () => {
                const cachedResponse = await caches.match(request);
                if (cachedResponse) return cachedResponse;
                if (request.mode === 'navigate') {
                    const appShell = await caches.match('./index.html');
                    if (appShell) return appShell;
                }
                return Response.error();
            })
    );
});
