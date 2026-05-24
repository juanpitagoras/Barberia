/* ============================================
   AIRTABLE.JS — Módulo de base de datos
   
   Este archivo maneja TODA la comunicación con Airtable.
   Cada función hace exactamente una cosa:
   leer o escribir datos.
   
   "async/await" = esperar a que el servidor responda
   antes de continuar. Como cuando llamas a alguien
   y esperas que conteste.
   ============================================ */


/* ─── FUNCIÓN BASE: LLAMAR A LA API ───────────────
   
   Esta función es el "mensajero" entre tu app y Airtable.
   Todas las demás funciones la usan internamente.
   
   Parámetros:
   - tabla: nombre de la tabla (ej: 'CLIENTES')
   - metodo: qué tipo de acción ('GET'=leer, 'POST'=crear, 'PATCH'=editar)
   - datos: los datos que envías (solo en POST y PATCH)
   - filtro: condición de búsqueda (solo en GET)
*/
async function llamarAirtable(tabla, metodo = 'GET', datos = null, filtro = '') {
  
  // Construimos la URL completa de la API
  let url = `${CONFIG.AIRTABLE_URL}/${CONFIG.AIRTABLE_BASE_ID}/${tabla}`;
  
  // Si hay filtro, lo agregamos a la URL como parámetro
  // encodeURIComponent convierte caracteres especiales para URLs
  if (filtro) {
    url += `?filterByFormula=${encodeURIComponent(filtro)}`;
  }

  // Configuramos la petición
  const opciones = {
    method: metodo,
    headers: {
      // Le decimos a Airtable quiénes somos con el API key
      'Authorization': `Bearer ${CONFIG.AIRTABLE_API_KEY}`,
      // Le decimos que enviamos datos en formato JSON
      'Content-Type': 'application/json',
    },
  };

  // Si hay datos que enviar (en crear o editar), los adjuntamos
  if (datos) {
    opciones.body = JSON.stringify(datos);
  }

  // Hacemos la petición y esperamos la respuesta
  const respuesta = await fetch(url, opciones);

  // Si algo salió mal, lanzamos un error con el detalle
  if (!respuesta.ok) {
    const error = await respuesta.json();
    throw new Error(`Airtable error: ${JSON.stringify(error)}`);
  }

  // Convertimos la respuesta a formato JavaScript y la retornamos
  return await respuesta.json();
}


/* ─── CLIENTES ─────────────────────────────────── */

/*
  Busca un cliente por su número de teléfono.
  Retorna el cliente encontrado o null si no existe.
*/
async function buscarClientePorTelefono(telefono) {
  // Airtable usa una sintaxis especial para filtros: SEARCH() o campo={valor}
  const filtro = `{Telefono_WhatsApp}="${telefono}"`;
  const resultado = await llamarAirtable(CONFIG.TABLA_CLIENTES, 'GET', null, filtro);
  
  // Si encontró registros, retorna el primero. Si no, retorna null.
  return resultado.records.length > 0 ? resultado.records[0] : null;
}

/*
  Crea un cliente nuevo en Airtable.
  Retorna el cliente creado con su ID asignado.
*/
async function crearCliente(nombre, telefono) {
  const datos = {
    fields: {
      // 'fields' es como Airtable llama a las columnas
      'Nombre': nombre,
      'Telefono_WhatsApp': telefono,
      'Faltas_Acumuladas': 0,  // Empieza en cero
    }
  };
  return await llamarAirtable(CONFIG.TABLA_CLIENTES, 'POST', datos);
}

/*
  Suma +1 a las faltas de un cliente.
  Se llama cuando el barbero marca "No Asistió".
  
  Parámetro:
  - clienteId: el ID interno de Airtable (recId... empieza con "rec")
  - faltasActuales: cuántas faltas tiene actualmente
*/
async function sumarFalta(clienteId, faltasActuales) {
  const datos = {
    fields: {
      'Faltas_Acumuladas': faltasActuales + 1
    }
  };
  // PATCH edita solo los campos que le enviamos, sin tocar el resto
  return await llamarAirtable(`${CONFIG.TABLA_CLIENTES}/${clienteId}`, 'PATCH', datos);
}


/* ─── SERVICIOS ────────────────────────────────── */

/*
  Obtiene todos los servicios activos de la barbería.
  Los servicios se cargan al inicio del formulario de reserva.
*/
async function obtenerServicios() {
  // Solo traemos los servicios marcados como activos
  const filtro = `{Activo}=TRUE()`;
  const resultado = await llamarAirtable(CONFIG.TABLA_SERVICIOS, 'GET', null, filtro);
  return resultado.records;
}


/* ─── CITAS ─────────────────────────────────────── */

/*
  Obtiene las citas de una fecha específica.
  Usada para saber qué horas están ocupadas ese día.
  
  Parámetro:
  - fecha: string en formato 'YYYY-MM-DD', ej: '2025-01-15'
*/
async function obtenerCitasPorFecha(fecha) {
  // El filtro busca citas de esa fecha que NO estén canceladas
  const filtro = `AND(IS_SAME({Fecha}, "${fecha}", 'day'), {Estado}!="Cancelada")`;
  const resultado = await llamarAirtable(CONFIG.TABLA_CITAS, 'GET', null, filtro);
  return resultado.records;
}

/*
  Obtiene las citas del día de hoy para el panel del barbero.
  Trae todas las citas sin importar el estado.
*/
async function obtenerCitasHoy() {
  // Calculamos la fecha de hoy en formato que entiende Airtable
  const hoy = new Date().toISOString().split('T')[0]; // '2025-01-15'
  const filtro = `IS_SAME({Fecha}, "${hoy}", 'day')`;
  const resultado = await llamarAirtable(CONFIG.TABLA_CITAS, 'GET', null, filtro);
  
  // Ordenamos las citas por hora (más temprana primero)
  return resultado.records.sort((a, b) => {
    return a.fields.Hora_Inicio.localeCompare(b.fields.Hora_Inicio);
  });
}

/*
  Crea una nueva cita en Airtable.
  
  Parámetros:
  - clienteId: ID del cliente (de Airtable, ej: 'recXXXXXX')
  - servicioId: ID del servicio seleccionado
  - fecha: '2025-01-15'
  - horaInicio: '10:00'
*/
async function crearCita(clienteId, servicioId, fecha, horaInicio) {
  const datos = {
    fields: {
      'Cliente': [clienteId],       // En Airtable, los links son arrays
      'Servicio': [servicioId],
      'Fecha': fecha,
      'Hora_Inicio': horaInicio,
      'Notificacion_Enviada': false,
    }
  };
  return await llamarAirtable(CONFIG.TABLA_CITAS, 'POST', datos);
}

/*
  Cambia el estado de una cita.
  Usada en los botones del panel del barbero.
  
  Parámetros:
  - citaId: ID de la cita en Airtable
  - nuevoEstado: 'Completada', 'No Asistió', o 'Cancelada'
*/
async function actualizarEstadoCita(citaId, nuevoEstado) {
  const datos = {
    fields: {
      'Estado': nuevoEstado
    }
  };
  return await llamarAirtable(`${CONFIG.TABLA_CITAS}/${citaId}`, 'PATCH', datos);
}


/* ─── BLOQUEOS ──────────────────────────────────── */

/*
  Obtiene los bloqueos de horario para una fecha.
  Se combinan con las citas para saber qué horas NO mostrar.
*/
async function obtenerBloqueosPorFecha(fecha) {
  // Traemos bloqueos de ese día O los que son recurrentes (almuerzo diario)
  const filtro = `OR(IS_SAME({Fecha}, "${fecha}", 'day'), {Recurrente}=TRUE())`;
  const resultado = await llamarAirtable(CONFIG.TABLA_BLOQUEOS, 'GET', null, filtro);
  return resultado.records;
}

/*
  Crea un bloqueo manual (lo hace el barbero desde el panel).
*/
async function crearBloqueo(motivo, fecha, horaInicio, horaFin, recurrente = false) {
  const datos = {
    fields: {
      'Motivo': motivo,
      'Fecha': fecha,
      'Hora_Inicio': horaInicio,
      'Hora_Fin': horaFin,
      'Recurrente': recurrente,
    }
  };
  return await llamarAirtable(CONFIG.TABLA_BLOQUEOS, 'POST', datos);
}
