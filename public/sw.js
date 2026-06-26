self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Новое сообщение', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Новое сообщение в чате';
  const options = {
    body: data.body || '',
    icon: 'https://cdn.poehali.dev/projects/13876108-688c-474f-aed7-7b67d3d10ce5/bucket/4f60f5bc-a46a-4c70-9dbb-6513705f811b.png',
    badge: 'https://cdn.poehali.dev/projects/13876108-688c-474f-aed7-7b67d3d10ce5/bucket/4f60f5bc-a46a-4c70-9dbb-6513705f811b.png',
    tag: 'chat-message',
    renotify: true,
    data: { url: data.url || '/#chat' },
  };

  const tasks = [self.registration.showNotification(title, options)];

  // Бейдж на иконке приложения при получении push в фоне (важно для iPhone)
  if (self.navigator && self.navigator.setAppBadge) {
    const count = typeof data.badge_count === 'number' ? data.badge_count : 1;
    tasks.push(self.navigator.setAppBadge(count).catch(() => {}));
  }

  event.waitUntil(Promise.all(tasks));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (self.navigator && self.navigator.clearAppBadge) {
    self.navigator.clearAppBadge().catch(() => {});
  }
  const targetUrl = (event.notification.data && event.notification.data.url) || '/#chat';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            try { client.navigate(targetUrl); } catch (e) {}
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});