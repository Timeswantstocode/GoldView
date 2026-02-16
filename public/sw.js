self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Function to show a notification
const showBeautifulNotification = (title, body, data) => {
  const options = {
    body: body,
    icon: '/logo192.png',
    badge: '/logo192.png',
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
