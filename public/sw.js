self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Function to show a beautiful notification
const showBeautifulNotification = (title, body, data) => {
  const options = {
    body: body,
    icon: '/logo192.png',
    badge: '/logo192.png', // Small icon for Android status bar
    vibrate: [100, 50, 100],
    data: data,
    actions: [
      { action: 'view', title: 'View Rates' }
    ],
    tag: 'price-update', // Replaces previous notification of same type
    renotify: true
  };

  return self.registration.showNotification(title, options);
};

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: 'GoldView Update', body: 'Check the latest gold prices!' };
  }
  
  event.waitUntil(
    showBeautifulNotification(
      payload.title || 'GoldView Nepal',
      payload.body || 'New market rates are available.',
      payload.data || {}
    )
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
