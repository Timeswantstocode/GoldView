const CACHE_NAME = 'goldview-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo512.webp',
  '/logo192.webp',
  '/apple-touch-icon.png',
  '/logo_raw.webp'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Special handling for data.json - Stale-While-Revalidate
  // This allows charts to load instantly from cache while updating in background
  if (url.pathname.includes('data.json')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // For navigation requests (index.html), try Network-First
  // This avoids the blank page issue when new asset hashes are deployed
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For other static assets, try cache then network
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Function to show a notification
const showBeautifulNotification = (title, body, data, icon, badge) => {
  const options = {
    body: body,
    icon: icon || '/logo512.webp',
    badge: badge || '/logo512.webp',
    vibrate: [100, 50, 100],
    data: data,
    actions: [
      { action: 'view', title: 'View Rates' }
    ],
    tag: data.tag || 'price-update',
    renotify: true,
    requireInteraction: false
  };

  return self.registration.showNotification(title, options);
};

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received!', event);
  let payload = {};
  try {
    if (event.data) {
      payload = event.data.json();
    } else {
      payload = { title: 'GoldView Update', body: 'New market rates are available.' };
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
    payload = { title: 'GoldView Update', body: 'Check the latest gold prices!' };
  }
  
  event.waitUntil(
    showBeautifulNotification(
      payload.title || 'GoldView',
      payload.body || 'New market rates are available.',
      payload.data || {},
      payload.icon,
      payload.badge
    )
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
