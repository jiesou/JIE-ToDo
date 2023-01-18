const cacheName = 'SERVICE_WORKERS_CACHE_NAME';

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
            return (cacheName.startsWith("DEV_")) ? fetch(e.request)
            : r || fetch(e.request).then((res) => {
                return caches.open(cacheName).then((cache) => {
                    cache.put(e.request, res.clone());
                    return res;
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


self.addEventListener('periodicsync', function(event) {
    const notify = JSON.parse(event.notify);
    if (new Date().getTime() >= notify.schedule) {
      event.waitUntil(self.registration.showNotification(...notify.notification));
    }
});

self.addEventListener('notificationclick', event => {
  if (event.action === 'close') {
    event.notification.close();
  } else {
    self.clients.openWindow('/');
  }
});
