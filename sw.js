/* SW.JS — Service Worker con Web Push nativo */

const CACHE_NAME = 'barberia-v5';

const ARCHIVOS_A_CACHEAR = [
  '/Barberia/',
  '/Barberia/index.html',
  '/Barberia/css/global.css',
  '/Barberia/js/config.js',
  '/Barberia/js/airtable.js',
  '/Barberia/js/notifications.js',
  '/Barberia/js/app.js',
  '/Barberia/manifest.json',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ARCHIVOS_A_CACHEAR).catch(err => {
        console.log('Cache parcial:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((nombres) => {
      return Promise.all(
        nombres.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evento) => {
  const url = new URL(evento.request.url);
  if (url.hostname === 'api.airtable.com') {
    evento.respondWith(fetch(evento.request));
    return;
  }
  evento.respondWith(
    caches.match(evento.request).then((cached) => cached || fetch(evento.request))
  );
});

// Recibir notificaciones push
self.addEventListener('push', (evento) => {
  const data = evento.data ? evento.data.json() : {};
  const titulo = data.title || 'Barbería';
  const opciones = {
    body: data.body || 'Tienes una cita próxima',
    icon: '/Barberia/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: '/Barberia/' }
  };
  evento.waitUntil(
    self.registration.showNotification(titulo, opciones)
  );
});

// Al tocar la notificación
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  evento.waitUntil(clients.openWindow('/Barberia/'));
});
