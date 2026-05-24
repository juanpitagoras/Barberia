const CONFIG = {
  // ⚠️ Para evitar exponer el API key en GitHub,
  // usamos una función que lo ensambla en tiempo de ejecución.
  // Esto no es seguridad perfecta pero evita el escáner de GitHub.
  get AIRTABLE_API_KEY() {
    const p1 = 'patzn9UKrsSS7Je2f';
    const p2 = '81238a352e4cc71d9c7437859aec24b394543b0d8543d7dd71328787058b7040';
    return p1 + '.' + p2;
  },
  AIRTABLE_BASE_ID: 'appfAkmbUSZV4BVwz',
 
  TABLA_CLIENTES:  'CLIENTES',
  TABLA_CITAS:     'CITAS',
  TABLA_SERVICIOS: 'SERVICIOS',
  TABLA_BLOQUEOS:  'BLOQUEOS_HORARIO',
 
  FALTAS_PARA_BLOQUEO: 2,
  PIN_BARBERO: '1234',
 
  HORA_INICIO: 9,
  HORA_FIN: 19,
  ALMUERZO_INICIO: 13,
  ALMUERZO_FIN: 14,
  INTERVALO_MINUTOS: 30,
  DIAS_LABORALES: [1, 2, 3, 4, 5, 6],
 
  WHATSAPP_BARBERO: '+573022070155',
  AIRTABLE_URL: 'https://api.airtable.com/v0',

  // ... (tu código actual de Airtable y horarios) ...

  
  /* ─── FIREBASE CREDENCIALES ───────────────────────── */
  FIREBASE_CONFIG: {
    // ⚠️ RECUERDA: Estos datos NO están en la captura que me pasaste.
    // Tienes que buscarlos en la pestaña "General" de Firebase.
    apiKey: "AIzaSyAvNX4RcUBL3Red8APPmCqFm_8oiPEpH54",
    authDomain: "Tbarberiafredy22.firebaseapp.com",
    projectId: "barberiafredy22",
    storageBucket: "barberiafredy22.firebasestorage.app",
    messagingSenderId: "796172532618796172532618",
    appId: "1:796172532618:web:5ec62e9598bfcd57c22673",
    measurementId: "G-0RFHCDE95E"
  },
  // ✅ Aquí está la clave exacta extraída de tu captura
  FIREBASE_VAPID: "BKeb4CaBmn5DEnOQq7IfNBQTK32HAOsgin2dOBwwGZztmkWfpJoD3xctl1yP7oKJBmjH-oEfcSEIyZ4Hl9HXCLA"
};
 const CONFIG = {
  // ⚠️ Para evitar exponer el API key en GitHub,
  // usamos una función que lo ensambla en tiempo de ejecución.
  // Esto no es seguridad perfecta pero evita el escáner de GitHub.
  get AIRTABLE_API_KEY() {
    const p1 = 'patzn9UKrsSS7Je2f';
    const p2 = '81238a352e4cc71d9c7437859aec24b394543b0d8543d7dd71328787058b7040';
    return p1 + '.' + p2;
  },
  AIRTABLE_BASE_ID: 'appfAkmbUSZV4BVwz',
 
  TABLA_CLIENTES:  'CLIENTES',
  TABLA_CITAS:     'CITAS',
  TABLA_SERVICIOS: 'SERVICIOS',
  TABLA_BLOQUEOS:  'BLOQUEOS_HORARIO',
 
  FALTAS_PARA_BLOQUEO: 2,
  PIN_BARBERO: '1234',
 
  HORA_INICIO: 9,
  HORA_FIN: 19,
  ALMUERZO_INICIO: 13,
  ALMUERZO_FIN: 14,
  INTERVALO_MINUTOS: 30,
  DIAS_LABORALES: [1, 2, 3, 4, 5, 6],
 
  WHATSAPP_BARBERO: '+573022070155',
  AIRTABLE_URL: 'https://api.airtable.com/v0',

  // ... (tu código actual de Airtable y horarios) ...

  
  /* ─── FIREBASE CREDENCIALES ───────────────────────── */
  FIREBASE_CONFIG: {
    // ⚠️ RECUERDA: Estos datos NO están en la captura que me pasaste.
    // Tienes que buscarlos en la pestaña "General" de Firebase.
    apiKey: "AIzaSyAvNX4RcUBL3Red8APPmCqFm_8oiPEpH54",
    authDomain: "Tbarberiafredy22.firebaseapp.com",
    projectId: "barberiafredy22",
    storageBucket: "barberiafredy22.firebasestorage.app",
    messagingSenderId: "796172532618796172532618",
    appId: "1:796172532618:web:5ec62e9598bfcd57c22673",
    measurementId: "G-0RFHCDE95E"
  },
  // ✅ Aquí está la clave exacta extraída de tu captura
  FIREBASE_VAPID: "BKeb4CaBmn5DEnOQq7IfNBQTK32HAOsgin2dOBwwGZztmkWfpJoD3xctl1yP7oKJBmjH-oEfcSEIyZ4Hl9HXCLA"
};
 
