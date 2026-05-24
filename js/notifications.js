/* NOTIFICATIONS.JS - Web Push nativo sin Firebase */

const VAPID_PUBLIC_KEY = 'BGcv6AGAVihvR41YXkYC-gv3pm2vfunJ44eiB3XDhoQzuH--EH-MBzXvNQdXO4Qo4u3ZzvWkQgcAXXv0pP5s6zc';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function activarNotificaciones(clienteId) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push no soportado en este navegador');
      return;
    }

    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') {
      console.log('Permiso denegado');
      return;
    }

    // Usar el SW principal que ya está registrado
    const swRegistration = await navigator.serviceWorker.ready;

    // Suscribir al usuario a Web Push
    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    // Guardar la suscripción en Airtable como JSON
    const subJSON = JSON.stringify(subscription);
    
    if (clienteId) {
      await llamarAirtable(CONFIG.TABLA_CLIENTES + '/' + clienteId, 'PATCH', {
        fields: { 'FCM_Token': subJSON }
      });
      console.log('✅ Suscripción push guardada en Airtable');
    }

  } catch (err) {
    console.log('Push no disponible:', err.message);
  }
}
navigator.serviceWorker.ready.then(sw => sw.pushManager.getSubscription()).then(sub => { if(sub) sub.unsubscribe().then(r => console.log('Limpiado:', r)) })
