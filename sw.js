/* ============================================
   SW.JS — Service Worker
   
   El Service Worker es un script que corre en
   segundo plano en el navegador. Hace posible:
   
   1. Instalar la app en la pantalla de inicio
   2. Que la app cargue rápido (guarda archivos en caché)
   3. Funcionalidad offline básica
   
   El navegador lo registra automáticamente desde app.js
   ============================================ */

// Nombre de la caché — al cambiar este nombre, se invalida la caché anterior
// Útil cuando actualizas la app: cambias 'v1' por 'v2'
const CACHE_NAME = 'barberia-v1';

// Lista de archivos que guardaremos en caché para carga rápida
// Estos son los archivos "estáticos" que no cambian en cada visita
const ARCHIVOS_A_CACHEAR = [
  '/',
  '/index.html',
  '/css/global.css',
  '/js/config.js',
  '/js/airtable.js',
  '/js/app.js',
  '/manifest.json',
];

/* ─── INSTALACIÓN ────────────────────────────────
   
   Se ejecuta UNA VEZ cuando el Service Worker
   se instala por primera vez.
   Descarga y guarda los archivos en caché.
*/
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Cacheando archivos de la app...');
      return cache.addAll(ARCHIVOS_A_CACHEAR);
    })
  );
  // Activa el nuevo SW inmediatamente sin esperar
  self.skipWaiting();
});

/* ─── ACTIVACIÓN ─────────────────────────────────
   
   Se ejecuta cuando el Service Worker toma control.
   Limpia cachés viejas de versiones anteriores.
*/
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((nombresCache) => {
      return Promise.all(
        nombresCache
          .filter(nombre => nombre !== CACHE_NAME) // Las que NO son la actual
          .map(nombre => caches.delete(nombre))      // Las eliminamos
      );
    })
  );
  self.clients.claim(); // Toma control de todas las pestañas abiertas
});

/* ─── INTERCEPTAR PETICIONES ─────────────────────
   
   Cada vez que la app pide un archivo (HTML, CSS, JS, imagen),
   el Service Worker intercepta la petición.
   
   Estrategia "Network First para API, Cache First para estáticos":
   - Si es una llamada a Airtable → siempre va a internet (datos en vivo)
   - Si es un archivo estático → primero caché, luego internet
*/
self.addEventListener('fetch', (evento) => {
  const url = new URL(evento.request.url);
  
  // Si es una llamada a la API de Airtable, siempre ir a la red
  // No queremos datos desactualizados del caché para las citas
  if (url.hostname === 'api.airtable.com') {
    evento.respondWith(fetch(evento.request));
    return;
  }
  
  // Para todo lo demás: caché primero, red como respaldo
  evento.respondWith(
    caches.match(evento.request).then((respuestaEnCache) => {
      if (respuestaEnCache) {
        return respuestaEnCache; // Devuelve la versión en caché (más rápido)
      }
      return fetch(evento.request); // Si no está en caché, va a internet
    })
  );
});
