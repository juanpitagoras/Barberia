/* ============================================
   NETLIFY FUNCTION: send-notification.js
   
   Esta función recibe una petición de Make y
   envía una notificación push al cliente/barbero.
   
   Make la llama así:
   POST https://barberiafredy.netlify.app/.netlify/functions/send-notification
   Body: { "subscription": "...", "title": "...", "body": "..." }
   ============================================ */

const webpush = require('web-push');

// Claves VAPID — las mismas que están en notifications.js
webpush.setVapidDetails(
  'mailto:juanmiguelramirezortiz042@gmail.com',
  'BGcv6AGAVihvR41YXkYC-gv3pm2vfunJ44eiB3XDhoQzuH--EH-MBzXvNQdXO4Qo4u3ZzvWkQgcAXXv0pP5s6zc',
  '8U_3TH9PuhQO5KmcOryOK_aAfNgS6zCeLL4nuxKQfJA'
);

exports.handler = async (event) => {
  // Solo aceptamos POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { subscription, title, body } = JSON.parse(event.body);

    if (!subscription || !title || !body) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Faltan datos: subscription, title, body' })
      };
    }

    // La suscripción viene como string JSON desde Airtable
    const sub = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;

    // Enviamos la notificación push
    await webpush.sendNotification(sub, JSON.stringify({ title, body }));

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Notificación enviada' })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
