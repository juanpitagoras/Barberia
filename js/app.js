/* ============================================
   APP.JS — Lógica principal de la aplicación
   
   Aquí vive toda la inteligencia de la app:
   - Navegación entre pantallas
   - Lógica del formulario de reserva
   - Panel del barbero
   - Reglas de negocio (bloqueos, inasistencias)
   ============================================ */


/* ─── ESTADO GLOBAL ─────────────────────────────
   
   'estado' es como la "memoria" de la app.
   Guarda todo lo que el usuario ha seleccionado
   mientras navega por el proceso de reserva.
   Es un simple objeto JavaScript.
*/
const estado = {
  cliente: null,          // Objeto del cliente (id, nombre, teléfono, faltas)
  servicio: null,         // Objeto del servicio seleccionado
  fecha: null,            // String: '2025-01-15'
  hora: null,             // String: '10:00'
  semanaOffset: 0,        // Cuántas semanas adelante está viendo el usuario
  citasDelDia: [],        // Array de citas del día seleccionado
  bloqueosDelDia: [],     // Array de bloqueos del día seleccionado
};


/* ─── NAVEGACIÓN ENTRE PANTALLAS ────────────────
   
   La app tiene UNA sola página HTML (index.html).
   Navegamos entre secciones ocultando y mostrando divs.
   Esto hace la app muy rápida porque no recarga la página.
*/
function mostrarPantalla(idPantalla) {
  // 1. Ocultar TODAS las pantallas
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  
  // 2. Mostrar solo la pantalla que queremos
  document.getElementById(idPantalla).classList.remove('hidden');
  
  // 3. Scroll al inicio
  window.scrollTo(0, 0);

  // 4. Si volvemos al home, reseteamos TODO el estado
  if (idPantalla === 'screen-home') {
    estado.cliente = null;
    estado.servicio = null;
    estado.fecha = null;
    estado.hora = null;
    estado.semanaOffset = 0;
    estado.citasDelDia = [];
    estado.bloqueosDelDia = [];
    // Limpiar formularios
    const inputNombre = document.getElementById('input-nombre');
    const inputTelefono = document.getElementById('input-telefono');
    if (inputNombre) inputNombre.value = '';
    if (inputTelefono) inputTelefono.value = '';
    const avisoBloqueo = document.getElementById('bloqueo-aviso');
    const btnContinuar = document.getElementById('btn-continuar-registro');
    if (avisoBloqueo) avisoBloqueo.classList.add('hidden');
    if (btnContinuar) btnContinuar.classList.remove('hidden');
    // Limpiar selección de servicios
    document.querySelectorAll('.servicio-card').forEach(c => c.classList.remove('activo'));
    // Ocultar éxito de reserva
    const exitoReserva = document.getElementById('exito-reserva');
    if (exitoReserva) exitoReserva.classList.add('hidden');
    const btnConfirmar = document.querySelector('#screen-confirmacion .btn-primary');
    if (btnConfirmar) { btnConfirmar.classList.remove('hidden'); btnConfirmar.disabled = false; btnConfirmar.textContent = '✓ Confirmar reserva'; }
  }
}


/* ─── SPLASH SCREEN (pantalla de carga) ─────────
   
   Se muestra 1.5 segundos al abrir la app,
   luego desaparece con una animación y muestra el home.
*/
window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash');
    splash.style.opacity = '0';
    
    // Después de la animación (600ms), lo ocultamos del todo
    setTimeout(() => {
      splash.classList.add('hidden');
      mostrarPantalla('screen-home');
    }, 600);
    
  }, 1500); // Mostrar splash por 1.5 segundos
});


/* ═══════════════════════════════════════════════
   FLUJO DEL CLIENTE
   ═══════════════════════════════════════════════ */


/* ─── PASO 1: REGISTRO DEL CLIENTE ──────────────
   
   Se activa cuando el cliente envía el formulario
   de nombre y teléfono.
*/
async function registrarCliente(evento) {
  // Evita que el formulario recargue la página (comportamiento HTML por defecto)
  evento.preventDefault();
  
  const nombre   = document.getElementById('input-nombre').value.trim();
  const telefono = document.getElementById('input-telefono').value.trim();
  const btnContinuar = document.getElementById('btn-continuar-registro');
  const avisoBloqueo = document.getElementById('bloqueo-aviso');
  
  // Mostramos feedback visual: desactivamos el botón mientras procesamos
  btnContinuar.textContent = 'Verificando...';
  btnContinuar.disabled = true;
  
  try {
    // ¿Ya existe este cliente en Airtable?
    let cliente = await buscarClientePorTelefono(telefono);
    
    if (!cliente) {
      // No existe → creamos uno nuevo
      cliente = await crearCliente(nombre, telefono);
    }
    
    // Guardamos el cliente en el estado global
    estado.cliente = {
      id: cliente.id,
      nombre: cliente.fields.Nombre,
      telefono: cliente.fields.Telefono_WhatsApp,
      faltas: cliente.fields.Faltas_Acumuladas || 0,
    };
    
    // ¿Está bloqueado? (tiene 2 o más inasistencias)
    if (estado.cliente.faltas >= CONFIG.FALTAS_PARA_BLOQUEO) {
      // Mostramos el aviso de bloqueo y ocultamos el botón de continuar
      avisoBloqueo.classList.remove('hidden');
      btnContinuar.classList.add('hidden');
      
      // Actualizamos el link de WhatsApp con el número del barbero
      const linkWA = avisoBloqueo.querySelector('.btn-whatsapp');
      linkWA.href = `https://wa.me/${CONFIG.WHATSAPP_BARBERO.replace('+','')}?text=Hola%2C%20soy%20${encodeURIComponent(nombre)}%20y%20quiero%20reagendar%20mi%20cita`;
      return; // Paramos aquí, no dejamos continuar
    }
    
    // Activar notificaciones push para este cliente
    activarNotificaciones(estado.cliente.id);

    // Activar notificaciones push
    activarNotificaciones(estado.cliente.id);

    // Todo bien → vamos a seleccionar el servicio
    mostrarPantalla('screen-servicios');
    cargarServicios();
    
  } catch (error) {
    console.error('Error al registrar cliente:', error);
    alert('Hubo un problema al verificar tu información. Intenta de nuevo.');
  } finally {
    // Siempre restauramos el botón al terminar
    btnContinuar.textContent = 'Continuar →';
    btnContinuar.disabled = false;
  }
}


/* ─── PASO 2: CARGAR SERVICIOS ──────────────────
   
   Pide los servicios a Airtable y los muestra
   como tarjetas seleccionables.
*/
async function cargarServicios() {
  const contenedor = document.getElementById('lista-servicios');
  contenedor.innerHTML = '<div class="loading-spinner">Cargando servicios...</div>';
  
  try {
    const servicios = await obtenerServicios();
    
    if (servicios.length === 0) {
      contenedor.innerHTML = '<div class="mensaje-vacio">No hay servicios disponibles.</div>';
      return;
    }
    
    // Vaciamos el contenedor y llenamos con las tarjetas
    contenedor.innerHTML = '';
    
    servicios.forEach(servicio => {
      const card = document.createElement('div');
      card.className = 'servicio-card';
      card.dataset.id = servicio.id; // Guardamos el ID para usarlo después
      
      // Formateamos el precio en pesos colombianos
      const precio = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
      }).format(servicio.fields.Precio_COP);
      
      card.innerHTML = `
        <div class="servicio-info">
          <h3>${servicio.fields.Nombre_Servicio}</h3>
          <p>⏱ ${servicio.fields.Duracion_Minutos} minutos</p>
        </div>
        <div class="servicio-precio">${precio}</div>
      `;
      
      // Al tocar la tarjeta, la seleccionamos
      card.addEventListener('click', () => seleccionarServicio(servicio, card));
      
      contenedor.appendChild(card);
    });
    
  } catch (error) {
    console.error('Error al cargar servicios:', error);
    contenedor.innerHTML = '<div class="mensaje-vacio">Error al cargar. Intenta de nuevo.</div>';
  }
}

/*
  Marca el servicio como seleccionado y avanza al calendario.
*/
function seleccionarServicio(servicio, cardElement) {
  // Quita el estilo activo de todas las tarjetas
  document.querySelectorAll('.servicio-card').forEach(c => c.classList.remove('activo'));
  
  // Activa solo la tocada
  cardElement.classList.add('activo');
  
  // Guardamos el servicio en el estado
  estado.servicio = {
    id: servicio.id,
    nombre: servicio.fields.Nombre_Servicio,
    duracion: servicio.fields.Duracion_Minutos,
    precio: servicio.fields.Precio_COP,
  };
  
  // Pequeño delay para que el usuario vea la selección
  setTimeout(() => {
    mostrarPantalla('screen-calendario');
    inicializarCalendario();
  }, 200);
}


/* ─── PASO 3: CALENDARIO Y HORAS ────────────────
   
   Muestra los días de la semana y al seleccionar uno
   carga las horas disponibles desde Airtable.
*/
function inicializarCalendario() {
  // Mostramos el nombre del servicio seleccionado como subtítulo
  document.getElementById('texto-servicio-seleccionado').textContent =
    `${estado.servicio.nombre} · ${estado.servicio.duracion} min`;
  
  // Resetear calendario completamente
  estado.semanaOffset = 0;
  estado.fecha = null;
  estado.hora = null;
  estado.citasDelDia = [];
  estado.bloqueosDelDia = [];
  
  // Limpiar grid de horas y días visualmente
  document.getElementById('grid-horas').innerHTML = 
    '<div class="loading-spinner">Selecciona una fecha...</div>';
  document.querySelectorAll('.dia-btn').forEach(b => b.classList.remove('activo'));
  document.querySelectorAll('.hora-btn').forEach(b => b.classList.remove('activo'));
  
  renderizarDias();
}

/*
  Renderiza los botones de días de la semana.
  semanaOffset=0 → semana actual, semanaOffset=1 → próxima semana, etc.
*/
function renderizarDias() {
  const contenedor = document.getElementById('dias-semana');
  contenedor.innerHTML = '';
  
  const hoy = new Date();
  // Usamos fecha local para evitar problemas de zona horaria (Colombia = UTC-5)
  const hoyLocal = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const diasNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  // Si ya pasó la hora límite del día (HORA_FIN), empezamos desde mañana
  const horaActual = hoy.getHours();
  const offsetInicial = horaActual >= CONFIG.HORA_FIN ? 1 : 0;
  
  for (let i = 0; i < 7; i++) {
    const dia = new Date(hoyLocal);
    dia.setDate(hoyLocal.getDate() + offsetInicial + (estado.semanaOffset * 7) + i);
    
    const numeroDia = dia.getDay();
    const esPasado = dia < hoyLocal;
    const esLaboral = CONFIG.DIAS_LABORALES.includes(numeroDia);
    
    if (!esLaboral) continue;
    
    const btn = document.createElement('button');
    btn.className = `dia-btn${esPasado ? ' pasado' : ''}`;
    
    // Formato local YYYY-MM-DD sin problemas de zona horaria
    const year = dia.getFullYear();
    const month = String(dia.getMonth() + 1).padStart(2, '0');
    const day = String(dia.getDate()).padStart(2, '0');
    const fechaStr = `${year}-${month}-${day}`;
    
    btn.innerHTML = `
      <span class="dia-nombre">${diasNombres[numeroDia]}</span>
      <span class="dia-num">${dia.getDate()}</span>
    `;
    
    btn.addEventListener('click', () => seleccionarDia(fechaStr, btn));
    contenedor.appendChild(btn);
  }
  
  // Desactivar botón "anterior" si estamos en la semana actual
  document.getElementById('btn-fecha-ant').disabled = estado.semanaOffset <= 0;
}

/*
  Avanza o retrocede la semana visible en el calendario.
  direccion = 1 (siguiente) o -1 (anterior)
*/
function cambiarSemana(direccion) {
  const nuevaOffset = estado.semanaOffset + direccion;
  if (nuevaOffset < 0) return; // No viajar al pasado
  estado.semanaOffset = nuevaOffset;
  renderizarDias();
  document.getElementById('grid-horas').innerHTML =
    '<div class="loading-spinner">Selecciona una fecha...</div>';
}

/*
  Cuando el usuario toca un día, cargamos las horas disponibles.
*/
async function seleccionarDia(fecha, btnElement) {
  // Marcar día activo visualmente
  document.querySelectorAll('.dia-btn').forEach(b => b.classList.remove('activo'));
  btnElement.classList.add('activo');
  
  estado.fecha = fecha;
  estado.hora = null; // Reseteamos la hora si cambia de día
  
  const gridHoras = document.getElementById('grid-horas');
  gridHoras.innerHTML = '<div class="loading-spinner">Cargando horarios...</div>';
  
  try {
    // Pedimos en paralelo las citas Y los bloqueos del día (más rápido que uno por uno)
    const [citas, bloqueos] = await Promise.all([
      obtenerCitasPorFecha(fecha),
      obtenerBloqueosPorFecha(fecha),
    ]);
    
    estado.citasDelDia = citas;
    estado.bloqueosDelDia = bloqueos;
    
    renderizarHoras();
    
  } catch (error) {
    console.error('Error al cargar horarios:', error);
    gridHoras.innerHTML = '<div class="mensaje-vacio">Error al cargar horarios. Intenta de nuevo.</div>';
  }
}

/*
  Genera todos los slots de hora posibles y marca cuáles están ocupados.
*/
function renderizarHoras() {
  const grid = document.getElementById('grid-horas');
  grid.innerHTML = '';
  
  // Horas que ya están ocupadas (extraemos solo la hora de inicio de cada cita)
  const horasOcupadas = new Set(
    estado.citasDelDia.map(c => c.fields.Hora_Inicio)
  );
  
  // Horas bloqueadas (calculamos los rangos de bloqueos)
  // Un bloqueo cubre todas las horas dentro de su rango
  
  let hayAlgunaDisponible = false;
  
  // Generamos slots de hora en hora (o cada 30 min según config)
  for (let h = CONFIG.HORA_INICIO; h < CONFIG.HORA_FIN; h++) {
    for (let m = 0; m < 60; m += CONFIG.INTERVALO_MINUTOS) {
      
      // Formateamos la hora: '9' → '09:00', '14' → '14:30'
      const horaStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      
      // ¿Está en hora de almuerzo?
      const esAlmuerzo = h >= CONFIG.ALMUERZO_INICIO && h < CONFIG.ALMUERZO_FIN;
      
      // ¿Está en algún bloqueo manual del barbero?
      const estaBloqueada = estado.bloqueosDelDia.some(bloqueo => {
        const inicio = bloqueo.fields.Hora_Inicio;
        const fin    = bloqueo.fields.Hora_Fin;
        return horaStr >= inicio && horaStr < fin;
      });
      
      // ¿Ya tiene cita?
      const estaOcupada = horasOcupadas.has(horaStr);
      
      const noDisponible = esAlmuerzo || estaBloqueada || estaOcupada;
      
      if (!noDisponible) hayAlgunaDisponible = true;
      
      const btn = document.createElement('button');
      btn.className = `hora-btn${noDisponible ? ' ocupada' : ''}`;
      btn.textContent = horaStr;
      
      if (!noDisponible) {
        btn.addEventListener('click', () => seleccionarHora(horaStr, btn));
      }
      
      grid.appendChild(btn);
    }
  }
  
  if (!hayAlgunaDisponible) {
    grid.innerHTML = '<div class="mensaje-vacio">No hay horarios disponibles<br>para este día.</div>';
  }
}

/*
  Cuando el usuario selecciona una hora, avanzamos a la confirmación.
*/
function seleccionarHora(hora, btnElement) {
  document.querySelectorAll('.hora-btn').forEach(b => b.classList.remove('activo'));
  btnElement.classList.add('activo');
  
  estado.hora = hora;
  
  // Pequeño delay para ver la selección
  setTimeout(() => {
    mostrarPantalla('screen-confirmacion');
    renderizarResumen();
  }, 200);
}


/* ─── PASO 4: CONFIRMACIÓN ───────────────────────
   
   Muestra el resumen de la cita antes de confirmar.
*/
function renderizarResumen() {
  const contenedor = document.getElementById('resumen-cita');
  
  // Formateamos la fecha en español para que sea más legible
  // Construimos la fecha manualmente para evitar problemas de zona horaria
  const [anio, mes, dia2] = estado.fecha.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia2); // mes-1 porque JS usa 0-11
  const fechaFormateada = fecha.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  
  const precio = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(estado.servicio.precio);
  
  contenedor.innerHTML = `
    <div class="resumen-fila">
      <span class="label">Cliente</span>
      <span class="valor">${estado.cliente.nombre}</span>
    </div>
    <div class="resumen-fila">
      <span class="label">Servicio</span>
      <span class="valor">${estado.servicio.nombre}</span>
    </div>
    <div class="resumen-fila">
      <span class="label">Fecha</span>
      <span class="valor">${fechaFormateada}</span>
    </div>
    <div class="resumen-fila">
      <span class="label">Hora</span>
      <span class="valor">${estado.hora}</span>
    </div>
    <div class="resumen-fila">
      <span class="label">Total</span>
      <span class="valor dorado">${precio}</span>
    </div>
  `;
  
  // Ocultamos el mensaje de éxito (por si el usuario regresó atrás)
  document.getElementById('exito-reserva').classList.add('hidden');
}

/*
  Confirma y guarda la cita en Airtable.
*/
async function confirmarReserva() {
  const btn = document.querySelector('#screen-confirmacion .btn-primary');
  btn.textContent = 'Guardando...';
  btn.disabled = true;
  
  try {
    await crearCita(
      estado.cliente.id,
      estado.servicio.id,
      estado.fecha,
      estado.hora,
    );
    
    // ¡Éxito! Mostramos el mensaje y ocultamos el botón
    btn.classList.add('hidden');
    document.getElementById('exito-reserva').classList.remove('hidden');
    
    // Reseteamos el estado COMPLETO para permitir nueva reserva sin reiniciar
    estado.servicio = null;
    estado.fecha = null;
    estado.hora = null;
    estado.semanaOffset = 0;
    estado.citasDelDia = [];
    estado.bloqueosDelDia = [];
    
    // Limpiamos los campos del formulario de registro para nueva reserva
    document.getElementById('input-nombre').value = '';
    document.getElementById('input-telefono').value = '';
    document.getElementById('bloqueo-aviso').classList.add('hidden');
    document.getElementById('btn-continuar-registro').classList.remove('hidden');
    
  } catch (error) {
    console.error('Error al confirmar reserva:', error);
    alert('No pudimos guardar tu cita. Inténtalo de nuevo.');
    btn.textContent = '✓ Confirmar reserva';
    btn.disabled = false;
  }
}


/* ═══════════════════════════════════════════════
   FLUJO DEL BARBERO (PANEL ADMIN)
   ═══════════════════════════════════════════════ */


/* ─── LOGIN DEL BARBERO ──────────────────────────*/
function loginBarbero(evento) {
  evento.preventDefault();
  
  const pin = document.getElementById('input-pin').value;
  const errorEl = document.getElementById('login-error');
  
  if (pin === CONFIG.PIN_BARBERO) {
    // PIN correcto → acceso al panel
    errorEl.classList.add('hidden');
    document.getElementById('input-pin').value = ''; // Limpia el campo
    mostrarPantalla('screen-panel');
    cargarPanelBarbero();
  } else {
    // PIN incorrecto → mostramos error
    errorEl.classList.remove('hidden');
    document.getElementById('input-pin').value = '';
  }
}

function cerrarSesion() {
  mostrarPantalla('screen-home');
}


/* ─── PANEL PRINCIPAL DEL BARBERO ───────────────
   
   Carga la agenda de hoy y las estadísticas.
*/
async function cargarPanelBarbero() {
  // Mostramos la fecha de hoy en el header
  const hoy = new Date();
  document.getElementById('panel-fecha-hoy').textContent = hoy.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  
  const contenedor = document.getElementById('lista-citas-hoy');
  contenedor.innerHTML = '<div class="loading-spinner">Cargando agenda...</div>';
  
  try {
    const citas = await obtenerCitasHoy();
    
    // Calculamos estadísticas
    // Estado puede ser string o array desde Airtable
    const getEstado = (c) => {
      const e = c.fields.Estado;
      return Array.isArray(e) ? e[0] : (e || 'Pendiente');
    };
    const pendientes  = citas.filter(c => getEstado(c) === 'Pendiente').length;
    const completadas = citas.filter(c => getEstado(c) === 'Completada').length;
    
    // Ingresos del día (solo citas completadas)
    // Nota: necesitamos el precio del servicio, que viene del lookup de Airtable
    // Usamos el campo calculado si existe, o 0 si no
    const ingresos = citas
      .filter(c => getEstado(c) === 'Completada')
      .reduce((sum, c) => {
        // Servicio_Precio es un Lookup → viene como array, tomamos el primer elemento
        const precioRaw = c.fields['Servicio_Precio'];
        const precio = Array.isArray(precioRaw) 
          ? Number(precioRaw[0]) || 0 
          : Number(precioRaw) || 0;
        return sum + precio;
      }, 0);
    
    // Actualizar stats en pantalla
    document.getElementById('stat-pendientes').textContent  = pendientes;
    document.getElementById('stat-completadas').textContent = completadas;
    document.getElementById('stat-ingresos').textContent    = new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(ingresos);
    
    // Renderizar lista de citas
    if (citas.length === 0) {
      contenedor.innerHTML = '<div class="mensaje-vacio">No hay citas agendadas<br>para hoy 🎉</div>';
      return;
    }
    
    contenedor.innerHTML = '';
    citas.forEach(cita => renderizarCitaBarbero(cita, contenedor));
    
  } catch (error) {
    console.error('Error al cargar panel:', error);
    contenedor.innerHTML = '<div class="mensaje-vacio">Error al cargar. Intenta de nuevo.</div>';
  }
}

/*
  Renderiza una tarjeta de cita en el panel del barbero
  con los botones de acción rápida.
*/
function renderizarCitaBarbero(cita, contenedor) {
  const estado_cita = cita.fields.Estado || 'Pendiente';
  const clasesEstado = {
    'Pendiente': '',
    'Completada': 'completada',
    'No Asistió': 'no-asistio',
    'Cancelada': 'cancelada',
  };
  
  const card = document.createElement('div');
  card.className = `cita-card ${clasesEstado[estado_cita] || ''}`;
  card.id = `cita-${cita.id}`;
  
  // Nombre del cliente (puede venir del lookup de Airtable)
  // Airtable Lookup fields come as arrays - get first element
  // Also try alternate field names that Airtable auto-generates
  const rawCliente = cita.fields['Cliente_Nombre'] 
    || cita.fields['Nombre (from Cliente)']
    || cita.fields['Nombre'];
  const rawServicio = cita.fields['Servicio_Nombre'] 
    || cita.fields['Servicio (from Servicio)']
    || cita.fields['Nombre_Servicio'];
  
  const nombreCliente = Array.isArray(rawCliente) ? rawCliente[0] : (rawCliente || 'Cliente');
  const nombreServicio = Array.isArray(rawServicio) ? rawServicio[0] : (rawServicio || 'Servicio');
  
  // Mostrar botones de acción solo si la cita sigue pendiente
  const accionesHTML = estado_cita === 'Pendiente' ? `
    <div class="cita-acciones">
      <button class="btn-accion btn-completar" onclick="marcarCita('${cita.id}', 'Completada', '${cita.fields.Cliente?.[0] || ''}', ${cita.fields.Faltas_Acumuladas || 0})">
        ✓ Completada
      </button>
      <button class="btn-accion btn-no-asistio" onclick="marcarCita('${cita.id}', 'No Asistió', '${cita.fields.Cliente?.[0] || ''}', ${cita.fields.Faltas_Acumuladas || 0})">
        ✗ No asistió
      </button>
    </div>
  ` : `<div style="margin-top:8px"><span class="estado-badge badge-${clasesEstado[estado_cita]}">${estado_cita}</span></div>`;
  
  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
      <span class="cita-hora">${cita.fields.Hora_Inicio}</span>
    </div>
    <div class="cita-nombre">${nombreCliente}</div>
    <div class="cita-servicio">${nombreServicio}</div>
    ${accionesHTML}
  `;
  
  contenedor.appendChild(card);
}

/*
  Marca una cita como Completada o No Asistió.
  Si es "No Asistió", suma +1 falta al cliente.
*/
async function marcarCita(citaId, nuevoEstado, clienteId, faltasActuales) {
  try {
    // 1. Actualizar el estado de la cita en Airtable
    await actualizarEstadoCita(citaId, nuevoEstado);
    
    // 2. Si no asistió, sumarle una falta al cliente
    if (nuevoEstado === 'No Asistió' && clienteId) {
      await sumarFalta(clienteId, faltasActuales);
    }
    
    // 3. Recargar el panel para reflejar los cambios
    await cargarPanelBarbero();
    
  } catch (error) {
    console.error('Error al marcar cita:', error);
    alert('No se pudo actualizar la cita. Intenta de nuevo.');
  }
}


/* ─── MODAL DE BLOQUEO ──────────────────────────*/
function mostrarModalBloqueo() {
  // Pre-llenar la fecha con hoy
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('bloqueo-fecha').value = hoy;
  document.getElementById('modal-bloqueo').classList.remove('hidden');
}

/*
  Cierra el modal si el usuario toca fuera de la tarjeta.
*/
function cerrarModalBloqueo(evento) {
  // Si no se pasa evento (click en botón Cancelar), cerramos directamente
  if (!evento || evento.target === document.getElementById('modal-bloqueo')) {
    document.getElementById('modal-bloqueo').classList.add('hidden');
  }
}

/*
  Guarda el bloqueo de horario en Airtable.
*/
async function guardarBloqueo() {
  const motivo = document.getElementById('bloqueo-motivo').value.trim();
  const fecha  = document.getElementById('bloqueo-fecha').value;
  const inicio = document.getElementById('bloqueo-inicio').value;
  const fin    = document.getElementById('bloqueo-fin').value;
  
  if (!motivo || !fecha || !inicio || !fin) {
    alert('Por favor completa todos los campos.');
    return;
  }
  
  if (inicio >= fin) {
    alert('La hora de fin debe ser después de la hora de inicio.');
    return;
  }
  
  try {
    await crearBloqueo(motivo, fecha, inicio, fin);
    cerrarModalBloqueo();
    alert('Bloqueo guardado correctamente.');
  } catch (error) {
    console.error('Error al guardar bloqueo:', error);
    alert('No se pudo guardar el bloqueo. Intenta de nuevo.');
  }
}


/* ─── SERVICE WORKER: INSTALACIÓN PWA ───────────
   
   El Service Worker es lo que convierte la web
   en una app instalable. Se registra automáticamente
   al cargar la página.
*/
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('✅ PWA: Service Worker registrado'))
      .catch(err => console.log('❌ PWA: Error en Service Worker:', err));
  });
}
