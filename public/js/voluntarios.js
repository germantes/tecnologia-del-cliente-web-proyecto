let voluntariosCache = [];
let entidadesCache = [];

async function cargarVoluntarios() {
  const urlParams = new URLSearchParams(window.location.search);
  const idCampaniaParam = urlParams.get('idCampania');
  
  // REQUISITO: Reemplazamos la lectura directa del sessionStorage por la nueva función centralizada.
  // Comprobación segura para evitar ReferenceError si la utilidad no está disponible.
  const rolUsuario = (typeof window.obtenerRolDeToken === 'function')
      ? window.obtenerRolDeToken()
      : (function(){ const p = sessionStorage.getItem('perfil') || sessionStorage.getItem('rol'); return p ? p.toUpperCase() : null; })();
  console.log('Cargando vista Voluntarios. Rol del usuario:', rolUsuario); // Log de trazabilidad

  if (rolUsuario !== 'ADMINISTRADOR' && !idCampaniaParam) {
    const grid = document.getElementById('voluntariosGrid');
    if (grid) {
      grid.textContent = '';
      const divError = document.createElement('div');
      divError.className = 'turnos-vacio';
      const titulo = document.createElement('h3');
      titulo.textContent = 'Acceso denegado';
      const mensaje = document.createElement('p');
      mensaje.textContent = 'No tienes permiso para ver todos los voluntarios. Por favor, accede mediante una campaña específica.';
      divError.append(titulo, mensaje);
      grid.appendChild(divError);
    }
    return;
  }

  const queryParams = {};
  if (idCampaniaParam) {
    queryParams.idCampania = idCampaniaParam;
  }

  try {
    const [voluntarios, entidades] = await Promise.all([
      getVoluntarios(queryParams),
      getEntidades().catch(() => [])
    ]);
    voluntariosCache = voluntarios || [];
    entidadesCache = entidades || [];
    configurarFiltros();
    renderizarVoluntarios(voluntariosCache);
  } catch (error) {
    console.error('Error cargando voluntarios:', error);
    const grid = document.getElementById('voluntariosGrid');
    if (grid) {
      grid.textContent = '';
      const divError = document.createElement('div');
      divError.className = 'turnos-vacio';
      const titulo = document.createElement('h3');
      titulo.textContent = 'Error al cargar voluntarios';
      const mensaje = document.createElement('p');
      mensaje.textContent = error.message;
      divError.append(titulo, mensaje);
      grid.appendChild(divError);
    }
  }
}

function configurarFiltros() {
  const inputBusqueda = document.getElementById('buscadorVoluntarios');
  const selectEntidad = document.getElementById('filtroEntidad');

  if (!inputBusqueda || !selectEntidad) return;

  // Mantenemos la opción por defecto e inyectamos las demás
  selectEntidad.innerHTML = '<option value="">Todas las entidades</option>';

  const entidadesOrdenadas = [...entidadesCache].sort((a, b) =>
    (a.nombre || '').localeCompare(b.nombre || '')
  );

  entidadesOrdenadas.forEach(entidad => {
    const option = document.createElement('option');
    option.value = entidad.id_entidad;
    option.textContent = entidad.nombre || 'Entidad sin nombre';
    selectEntidad.appendChild(option);
  });

  const aplicarFiltros = () => {
    const texto = inputBusqueda.value.toLowerCase().trim();
    const idEntidad = selectEntidad.value;

    const filtrados = voluntariosCache.filter(v => {
      const coincideEntidad = !idEntidad || String(v.id_entidad) === String(idEntidad);

      const nombreCompleto = (v.nombre_completo || `${v.nombre || ''} ${v.apellido_1 || ''} ${v.apellido_2 || ''}`).toLowerCase();
      const email = (v.email || '').toLowerCase();
      const coincideTexto = !texto || nombreCompleto.includes(texto) || email.includes(texto);

      return coincideEntidad && coincideTexto;
    });

    renderizarVoluntarios(filtrados);
  };

  inputBusqueda.addEventListener('input', aplicarFiltros);
  selectEntidad.addEventListener('change', aplicarFiltros);
}

function obtenerNombreEntidad(idEntidad) {
  if (!idEntidad) return 'Sin entidad';
  const entidad = entidadesCache.find(e => e.id_entidad == idEntidad);
  return entidad ? (entidad.nombre || 'Entidad sin nombre') : 'Entidad desconocida';
}

function renderizarVoluntarios(voluntarios) {
  const grid = document.getElementById('voluntariosGrid');
  if (!grid) return;

  grid.textContent = ''; // Limpiar el contenedor de forma segura

  if (!voluntarios || voluntarios.length === 0) {
    const divVacio = document.createElement('div');
    divVacio.className = 'turnos-vacio';
    const h3 = document.createElement('h3');
    h3.textContent = 'No hay voluntarios disponibles';
    const p = document.createElement('p');
    p.textContent = 'No se han encontrado voluntarios.';
    divVacio.append(h3, p);
    grid.appendChild(divVacio);
    return;
  }

  voluntarios.forEach(voluntario => {
    const nombre = voluntario.nombre || '';
    const apellidos = `${voluntario.apellido_1 || ''} ${voluntario.apellido_2 || ''}`.trim();
    const nombreCompleto = voluntario.nombre_completo || `${nombre} ${apellidos}`.trim() || 'Sin nombre';
    const idVoluntario = voluntario.id_voluntario || voluntario.id;
    const email = voluntario.email || 'Sin email';
    const idEntidad = voluntario.id_entidad;
    const nombreEntidad = obtenerNombreEntidad(idEntidad);

    const diaCard = document.createElement('div');
    diaCard.className = 'dia-card';

    const turnoCard = document.createElement('div');
    turnoCard.className = 'turno-card';

    const bloqueTurno = document.createElement('div');
    bloqueTurno.className = 'bloque-turno';

    const h3 = document.createElement('h3');
    h3.className = 'titulo-turno';
    h3.textContent = nombreCompleto;

    const filaEntidad = document.createElement('div');
    filaEntidad.className = 'fila-voluntario';
    const spanEntidadEtiqueta = document.createElement('span');
    spanEntidadEtiqueta.textContent = 'Entidad';
    const spanEntidadValor = document.createElement('span');
    spanEntidadValor.textContent = nombreEntidad;
    filaEntidad.append(spanEntidadEtiqueta, spanEntidadValor);

    const filaEmail = document.createElement('div');
    filaEmail.className = 'fila-voluntario';
    const spanEmailEtiqueta = document.createElement('span');
    spanEmailEtiqueta.textContent = 'Email';
    const spanEmailValor = document.createElement('span');
    spanEmailValor.textContent = email;
    filaEmail.append(spanEmailEtiqueta, spanEmailValor);

    const botonesDiv = document.createElement('div');
    botonesDiv.className = 'boton-editar-turno';

    const btnInfo = document.createElement('a');
    btnInfo.className = 'btn btn-outline js-voluntario-info';
    btnInfo.href = '#';
    btnInfo.textContent = '+info';
    // Ya no hace falta buscar los enlaces después, le ponemos el evento directamente:
    btnInfo.addEventListener('click', (e) => {
      e.preventDefault();
      abrirInfoVoluntario(idVoluntario);
    });

    const btnEditar = document.createElement('a');
    btnEditar.className = 'btn btn-primary';
    btnEditar.href = `/edit.html?type=voluntarios&id=${idVoluntario}`;
    btnEditar.textContent = 'Editar';

    botonesDiv.append(btnInfo, btnEditar);
    bloqueTurno.append(h3, filaEntidad, filaEmail, botonesDiv);
    turnoCard.appendChild(bloqueTurno);
    diaCard.appendChild(turnoCard);

    grid.appendChild(diaCard);
  });
}

function abrirPopupVoluntario() {
  const popup = document.getElementById("popupVoluntario");
  if (popup) {
    popup.classList.add("abierto");
    popup.style.display = "flex";
    popup.setAttribute("aria-hidden", "false");
  }
}

function abrirInfoVoluntario(idVoluntario) {
  const voluntario = voluntariosCache.find(item => (item.id_voluntario == idVoluntario));
  const contenido = document.getElementById("popupVoluntarioContenido");

  if (!contenido) return;
  contenido.textContent = ''; // Limpiar el contenido previo de forma segura

  if (!voluntario) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'popup-voluntario-error';
    errorDiv.textContent = 'No se encontró el voluntario.';
    contenido.appendChild(errorDiv);
    abrirPopupVoluntario();
    return;
  }

  const nombre = voluntario.nombre || '';
  const apellidos = `${voluntario.apellido_1 || ''} ${voluntario.apellido_2 || ''}`.trim();
  const idEntidad = voluntario.id_entidad;
  const nombreEntidad = obtenerNombreEntidad(idEntidad);
  const email = voluntario.email || 'N/A';

  const tabla = document.createElement('table');
  tabla.className = 'popup-voluntario-tabla';
  const tbody = document.createElement('tbody');

  // Función de ayuda para crear cada fila y simplificar el código
  const agregarFila = (etiqueta, valor) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = etiqueta;
    const td = document.createElement('td');
    td.textContent = valor;
    tr.append(th, td);
    tbody.appendChild(tr);
  };

  agregarFila('Nombre', nombre);
  agregarFila('Apellidos', apellidos);
  agregarFila('Entidad', nombreEntidad);
  agregarFila('Email', email);

  tabla.appendChild(tbody);
  contenido.appendChild(tabla);

  abrirPopupVoluntario();
}

function cerrarInfoVoluntario() {
  const popup = document.getElementById("popupVoluntario");
  if (popup) {
    popup.classList.remove("abierto");
    popup.style.display = "none";
    popup.setAttribute("aria-hidden", "true");
  }
}

window.abrirInfoVoluntario = abrirInfoVoluntario;
window.cerrarInfoVoluntario = cerrarInfoVoluntario;

document.addEventListener("DOMContentLoaded", function () {
  cargarVoluntarios();
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") cerrarInfoVoluntario();
  });

  // REQUISITO: Usamos la nueva función para controlar la visibilidad del botón.
  // Comprobación segura en tiempo de ejecución.
  const rolUsuario = (typeof window.obtenerRolDeToken === 'function')
      ? window.obtenerRolDeToken()
      : (function(){ const p = sessionStorage.getItem('perfil') || sessionStorage.getItem('rol'); return p ? p.toUpperCase() : null; })();
  const btnNuevo = document.getElementById('btn-nuevo');
  if (btnNuevo) {
    const canCreate = rolUsuario === 'ADMINISTRADOR' || rolUsuario === 'COORDINADOR';
    if (!canCreate) {
      btnNuevo.style.display = 'none'; // Ocultamos el botón si no tiene permisos
    }
  }
});