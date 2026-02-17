self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(clients.claim());
});

// Function to show a notification
const showBeautifulNotification = (title, body, data, icon, badge) => {
  const options = {
    body: body,
    icon: icon || '/logo512.png',
    badge: badge || '/logo512.png',
    vibrate: [100, 50, 100],
    data: data,
    actions: [
      { action: 'view', title: 'View Rates' }
    ],
    // Using a dynamic tag or unique identifier helps avoid spam filters
    // that flag identical repeated notifications
    tag: data.tag || 'price-update-' + Date.now(), 
    renotify: true,
    requireInteraction: false // Don't force interaction for simple updates
  };

  return self.registration.showNotification(title, options);
};

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received!', event);
  let payload = {};
  try {
    if (event.data) {
      const rawData = event.data.text();
      console.log('[SW] Raw push data:', rawData);
      payload = JSON.parse(rawData);
      console.log('[SW] Parsed payload:', payload);
    } else {
      console.warn('[SW] Push event has no data');
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
    payload = { title: 'GoldView Update', body: 'Check the latest gold prices!' };
  }
  
  event.waitUntil(
    showBeautifulNotification(
      payload.title || 'GoldView Nepal',
      payload.body || 'New market rates are available.',
      payload.data || {},
      payload.icon,
      payload.badge
    ).then(() => {
      console.log('[SW] Notification displayed successfully');
    }).catch(err => {
      console.error('[SW] Failed to show notification:', err);
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      console.log('[SW] Found', clientList.length, 'open windows');
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          console.log('[SW] Focusing existing window');
          return client.focus();
        }
      }
      if (clients.openWindow) {
        console.log('[SW] Opening new window');
        return clients.openWindow('/');
      }
    })
  );
});
