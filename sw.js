// Service Worker для кэширования — v2
const CACHE_NAME = 'rune-site-v2';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/runes.html',
    '/gods.html',
    '/about.html',
    '/rune-horoscope.html',
    '/feedback.html',
    '/support.html'
];

// Установка
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            Promise.all(
                urlsToCache.map(url =>
                    cache.add(url).catch(err => console.warn('SW: skip', url, err))
                )
            )
        )
    );
});

// Активация
self.addEventListener('activate', event => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then(names =>
                Promise.all(
                    names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
                )
            )
        ])
    );
});

// Перехват запросов
self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== location.origin) return;

    // HTML — network-first
    if (request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then(res => {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(request, copy));
                    return res;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // Остальное — stale-while-revalidate
    event.respondWith(
        caches.match(request).then(cached => {
            const network = fetch(request)
                .then(res => {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(request, copy));
                    return res;
                })
                .catch(() => cached);
            return cached || network;
        })
    );
});