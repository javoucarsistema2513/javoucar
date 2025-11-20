const CACHE_NAME = 'javoucar-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512.png'
];

// Instalação do Service Worker
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Retorna o recurso do cache se existir
        if (response) {
          return response;
        }
        // Caso contrário, faz a requisição normalmente
        return fetch(event.request);
      }
    )
  );
});

// Atualização do Service Worker
self.addEventListener('activate', function(event) {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Recebimento de notificações push
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const title = data.title || 'JávouCar';
    const options = {
      body: data.body || 'Você recebeu um novo alerta',
      icon: data.icon || '/icon-192x192.png',
      badge: data.badge || '/badge-72x72.png',
      data: data.data || {},
      vibrate: [200, 100, 200, 100, 200], // Vibração padrão
      tag: 'javoucar-alert', // Tag para evitar notificações duplicadas
      renotify: true // Renotificar se já houver uma notificação com a mesma tag
    };

    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// Clique em notificações
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  // Abrir a aplicação quando o usuário clicar na notificação
  event.waitUntil(
    clients.openWindow('/').then(function(client) {
      if (client) {
        client.focus();
      }
    })
  );
});