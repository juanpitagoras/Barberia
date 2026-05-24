/* ============================================
   FIREBASE MESSAGING SERVICE WORKER
   Maneja notificaciones cuando la app está cerrada
   ============================================ */

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAvNX4RcUBL3Red8APPmCqFm_8oiPEpH54",
  authDomain: "barberiafredy22.firebaseapp.com",
  projectId: "barberiafredy22",
  storageBucket: "barberiafredy22.firebasestorage.app",
  messagingSenderId: "796172532618",
  appId: "1:796172532618:web:5ec62e9598bfcd57c22673",
});

const messaging = firebase.messaging();

// Notificación cuando app está CERRADA o en SEGUNDO PLANO
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body: body,
    icon: '/Barberia/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: '/Barberia/' },
  });
});

// Al tocar la notificación abre la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/Barberia/'));
});
