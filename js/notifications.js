/* NOTIFICATIONS.JS - Push notifications via Firebase */

firebase.initializeApp({
  apiKey: "AIzaSyAvNX4RcUBL3Red8APPmCqFm_8oiPEpH54",
  authDomain: "barberiafredy22.firebaseapp.com",
  projectId: "barberiafredy22",
  storageBucket: "barberiafredy22.firebasestorage.app",
  messagingSenderId: "796172532618",
  appId: "1:796172532618:web:5ec62e9598bfcd57c22673",
});

const VAPID_KEY = "BKeb4CaBmn5DEnOQq7IfNBQTK32HAOsgin2dOBwwGZztmkWfpJoD3xctl1yP7oKJBmjH-oEfcSElyZ4Hl9HXCLA";
const messaging = firebase.messaging();

async function activarNotificaciones(clienteId) {
  try {
    if (!("Notification" in window)) return;
    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") return;

    // Detectar la ruta base automaticamente (funciona en Live Server Y GitHub Pages)
    const basePath = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
    const swPath = basePath + '/firebase-messaging-sw.js';
    
    console.log('Registrando SW en:', swPath);

    const swRegistration = await navigator.serviceWorker.register(swPath);
    
    const token = await messaging.getToken({ 
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration
    });

    if (token && clienteId) {
      await llamarAirtable(CONFIG.TABLA_CLIENTES + "/" + clienteId, "PATCH", {
        fields: { "FCM_Token": token }
      });
      console.log("Notificaciones activadas, token guardado");
    }
  } catch (err) {
    console.log("Notificaciones no disponibles:", err.message);
  }
}

messaging.onMessage((payload) => {
  if (payload.notification) {
    new Notification(payload.notification.title, {
      body: payload.notification.body,
      icon: '/Barberia/icons/icon-192.png'
    });
  }
});
