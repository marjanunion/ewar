self.addEventListener('push', (event) => {
  let data = { 
    title: 'eWAR Notification', 
    body: 'Tournament update available.',
    url: '/'
  };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.warn('Push event data parse failed:', e);
      data = { 
        title: 'eWAR Notification', 
        body: event.data.text(),
        url: '/'
      };
    }
  }

  const options = {
    body: data.body,
    icon: '/icon.png',
    badge: '/icon.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      tournamentId: data.tournamentId || null
    },
    actions: [
      { action: 'open', title: 'Open eWAR' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification);
});
