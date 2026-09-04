// Service Worker للتطبيق
const CACHE_NAME = 'order-manager-v1';
const urlsToCache = [
  './'
];

// تثبيت Service Worker وتخزين الملفات
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((err) => {
        console.log('Some URLs failed to cache:', err);
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// تنظيف الـ Cache القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// استراتيجية الشبكة - Cache First مع Fallback للشبكة
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  if (request.url.includes('localhost') || request.url.startsWith('ws')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        })
        .catch((err) => {
          console.log('Fetch failed:', err);
          return new Response('لا يوجد اتصال بالإنترنت', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain; charset=utf-8'
            })
          });
        });
    })
  );
});

// معالجة الإشعارات
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'مدير الطلبيات';
  const options = {
    body: data.body || 'لديك إشعار جديد',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%232563eb" width="192" height="192"/><text x="96" y="120" font-size="80" font-weight="bold" text-anchor="middle" fill="white" font-family="Arial">📋</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%232563eb" width="192" height="192"/><text x="96" y="120" font-size="80" font-weight="bold" text-anchor="middle" fill="white" font-family="Arial">📋</text></svg>',
    tag: 'notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// معالجة النقر على الإشعارات
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-deferred-orders') {
    event.waitUntil(
      Promise.resolve()
    );
  }
});

console.log('Service Worker loaded and ready!');
