/* ============================================
   NOTIFICATIONS.JS — Sistema de notificaciones push
   ============================================ */

// Inicializar Firebase
firebase.initializeApp(FIREBASE_CONFIG);
const messaging = firebase.messaging();

// Registrar el Service Worker de Firebase manualmente con la ruta correcta
navigator.serviceWorker.register('/Barberia/firebase-messaging-sw.js')
  .then(registration => {
    messaging.useServiceWorker(registration);
  })
  .catch(err => console.log('SW Firebase error:', err));

/*
  Pide permiso y guarda el token del dispositivo en Airtable.
  Se llama después de que el cliente se registra.
*/
async function activarNotificaciones(clienteId) {
  try {
    // Solo funciona en HTTPS o localhost
    if (!('Notification' in window)) {
      console.log('Este navegador no soporta notificaciones');
      return;
    }

    // Pedir permiso al usuario
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') {
      console.log('Permiso de notificaciones rechazado');
      return;
    }

    // Obtener token único de este dispositivo
    const token = await messaging.getToken({ vapidKey: VAPID_KEY });

    if (token) {
      // Guardar token en Airtable junto al cliente
      await llamarAirtable(`${CONFIG.TABLA_CLIENTES}/${clienteId}`, 'PATCH', {
        fields: { 'FCM_Token': token }
      });
      console.log('✅ Notificaciones activadas');
    }

  } catch (error) {
    console.log('Notificaciones no disponibles:', error.message);
  }
}

// Notificación cuando app está ABIERTA
messaging.onMessage((payload) => {
  const { title, body } = payload.notification;
  new Notification(title, {
    body: body,
    icon: '/Barberia/icons/icon-192.png',
  });
});
