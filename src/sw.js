const cacheName = 'SERVICE_WORKERS_CACHE_NAME';
// const contentToCache = [
    // '/boot.js',
    // '/index.html',
    // '/styles.css',
    // '/script.js',
    // '/full/index.html',
    // '/full/styles.css',
    // '/full/script.js',
    // '/img/favicon/icon-32.png'
// ];

self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(cacheName).then(function(cache) {
            console.log('[Service Worker] Caching all: app shell and content');
            return cache.addAll([]);
        })
    );
});
self.addEventListener('fetch', function(e) {
    e.respondWith(
        caches.match(e.request).then(function(r) {
            return r || fetch(e.request).then(function(response) {
                return caches.open(cacheName).then(function(cache) {
                    cache.put(e.request, response.clone());
                    return response;
                });
            });
        })
    );
});

self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(keyList) {
            return Promise.all(keyList.map(function(key) {
                if(cacheName.indexOf(key) === -1) {
                    return caches.delete(key);
                }
            }));
        })
    );
});

function syncNotification() {
}

self.addEventListener('periodicsync', function(event) {
    const tag = JSON.parse(event.tag);
    if (new Date().getTime() >= schedule) {
      self.registration.showNotification(...tag.notification);
      // event.waitUntil();
    }
});

self.addEventListener('notificationclick', event => {
  if (event.action === 'close') {
    event.notification.close();
  } else {
    self.clients.openWindow('/');
  }
});
