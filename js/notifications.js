/* ============================================
   NOTIFICATIONS.JS — Sistema de notificaciones push
   ============================================ */

// Firebase ya fue inicializado en firebase-config.js
// Solo obtenemos la instancia de messaging
const messaging = firebase.messaging();

// Registrar el Service Worker de Firebase con la ruta correcta para GitHub Pages
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/Barberia/firebase-messaging-sw.js')
    .then(registration => {
      messaging.useServiceWorker(registration);
      console.log("Firebase SW registrado");
    })
    .catch(err => console.log('SW Firebase error:', err));
}

async function activarNotificaciones(clienteId) {
  try {
    if (!('Notification' in window)) return;

    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') return;

    const token = await messaging.getToken({ vapidKey: VAPID_KEY });

    if (token) {
      await llamarAirtable(CONFIG.TABLA_CLIENTES + '/' + clienteId, 'PATCH', {
        fields: { 'FCM_Token': token }
      });
      console.log('Notificaciones activadas');
    }
  } catch (error) {
    console.log('Notificaciones no disponibles:', error.message);
  }
}

messaging.onMessage((payload) => {
  const { title, body } = payload.notification;
  new Notification(title, {
    body: body,
    icon: '/Barberia/icons/icon-192.png',
  });
});
