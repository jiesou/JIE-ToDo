const cacheName="BUILD_3kybst6w62q1672235531125";self.addEventListener("install",(function(e){e.waitUntil(caches.open(cacheName).then((function(e){return e.addAll([])})))})),self.addEventListener("fetch",(function(e){e.respondWith(caches.match(e.request).then((function(n){return n||fetch(e.request).then((function(n){return caches.open(cacheName).then((function(t){return t.put(e.request,n.clone()),n}))}))})))})),self.addEventListener("activate",(function(e){e.waitUntil(caches.keys().then((function(e){return Promise.all(e.map((function(e){if(-1===cacheName.indexOf(e))return caches.delete(e)})))})))})),self.addEventListener("periodicsync",(function(e){const n=JSON.parse(e.notify);(new Date).getTime()>=n.schedule&&e.waitUntil(self.registration.showNotification(...n.notification))})),self.addEventListener("notificationclick",(e=>{"close"===e.action?e.notification.close():self.clients.openWindow("/")}));