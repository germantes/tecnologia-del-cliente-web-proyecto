let voluntariosCache = [];
let entidadesCache = [];

async function cargarVoluntarios() {
  const urlParams = new URLSearchParams(window.location.search);
  const idCampaniaParam = urlParams.get('idCampania');

  const rolUsuario = getPerfil();

  console.log('Cargando vista Voluntarios. Rol del usuario:', rolUsuario); // Log de trazabilidad

  const idEntidadParam = urlParams.get('idEntidad');

  // Roles que pueden acceder sin idCampania (el backend filtra según el rol)
  const rolesSinParam = ['ADMINISTRADOR', 'COORDINADOR', 'RESPONSABLE-ENTIDAD'];
  if (!rolesSinParam.includes(rolUsuario) && !idCampaniaParam) {
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
  if (idEntidadParam) {
    queryParams.idEntidad = idEntidadParam;
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

  if (!voluntarios || voluntarios.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No hay voluntarios disponibles</p>';
    return;
  }

  grid.innerHTML = voluntarios.map(voluntario => {
    const nombre = voluntario.nombre || '';
    const apellidos = `${voluntario.apellido_1 || ''} ${voluntario.apellido_2 || ''}`.trim();
    const nombreCompleto = voluntario.nombre_completo || `${nombre} ${apellidos}`.trim() || 'Sin nombre';
    const idVoluntario = voluntario.id_voluntario || voluntario.id;
    const email = voluntario.email || 'Sin email';
    const idEntidad = voluntario.id_entidad;
    const nombreEntidad = obtenerNombreEntidad(idEntidad);

    return `
      <div class="card">
        <div class="brand">
          <h2>${nombreCompleto}</h2>
        </div>
        <div class="values">
          <div class="value">
            <p>Entidad:</p>
            <p>${nombreEntidad}</p>
          </div>
          <div class="value">
            <p>Email:</p>
            <p>${email}</p>
          </div>
        </div>
        <div class="card-buttons">
          <button type="button" onclick="abrirInfoVoluntario(${idVoluntario})">+info</button>
          <button type="button" onclick="window.location.href='edit.html?type=voluntarios&id=${idVoluntario}'">Editar</button>
        </div>
      </div>
    `;
  }).join('');
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

  const rolUsuario = getPerfil();
  const btnNuevo = document.getElementById('btn-nuevo');
  if (btnNuevo) {
    const canCreate = rolUsuario === 'ADMINISTRADOR';
    if (!canCreate) {
      btnNuevo.style.display = 'none'; // Ocultamos el botón si no tiene permisos
    }
  }
});