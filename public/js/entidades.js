let entidadesCache = [];
let usuariosCache = [];

async function cargarEntidades() {
    const urlParams = new URLSearchParams(window.location.search);
    const idCampaniaParam = urlParams.get('idCampania');

    const rolUsuario = getPerfil();

    if (rolUsuario !== 'ADMINISTRADOR' && rolUsuario !== 'COORDINADOR' && !idCampaniaParam) {
        const grid = document.getElementById('entidadesGrid');
        if (grid) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Acceso denegado. No tienes permiso para ver todas las entidades.</p>';
        }
        return;
    }

    const queryParams = {};
    if (idCampaniaParam) {
        queryParams.idCampania = idCampaniaParam;
    }

    try {
        // Cargamos las entidades y los usuarios en paralelo usando api.js
        const [entidades, usuarios] = await Promise.all([
            getEntidades(queryParams),
            getUsuarios().catch(() => []) // Evita que falle la carga si el usuario no tiene permisos para ver usuarios
        ]);

        entidadesCache = entidades || [];
        usuariosCache = usuarios || [];

        configurarFiltros();
        renderizarEntidades(entidadesCache);
    } catch (error) {
        console.error('Error cargando entidades:', error);
        const grid = document.getElementById('entidadesGrid');
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Error al cargar entidades: ' + error.message + '</p>';
    }
}

function obtenerNombreContacto(idContacto) {
    if (!idContacto) return 'Sin contacto';
    // Buscamos el usuario por su ID
    const usuario = usuariosCache.find(u => u.id_usuario == idContacto || u.idUsuario == idContacto || u.id == idContacto);
    return usuario ? (usuario.nombre_completo || usuario.nombre || usuario.nombreUsuario || 'Sin nombre') : 'Usuario desconocido';
}

function configurarFiltros() {
    const inputBusqueda = document.getElementById('buscadorEntidades');
    const selectVinculado = document.getElementById('filtroVinculado');

    if (!inputBusqueda || !selectVinculado) return;

    const aplicarFiltros = () => {
        const texto = inputBusqueda.value.toLowerCase().trim();
        const filtroVinculado = selectVinculado.value;

        const filtrados = entidadesCache.filter(entidad => {
            const esVinculado = (entidad.vinculado_bancosol === true || String(entidad.vinculado_bancosol).toLowerCase() === 'true');

            let coincideVinculado = true;
            if (filtroVinculado === 'true') coincideVinculado = esVinculado;
            else if (filtroVinculado === 'false') coincideVinculado = !esVinculado;

            const nombre = (entidad.nombre || '').toLowerCase();
            const codigo = (entidad.codigo_bancosol || '').toLowerCase();
            const cp = (entidad.cp || '');
            const coincideTexto = !texto || nombre.includes(texto) || cp.includes(texto) || codigo.includes(texto);

            return coincideVinculado && coincideTexto;
        });

        renderizarEntidades(filtrados);
    };

    inputBusqueda.addEventListener('input', aplicarFiltros);
    selectVinculado.addEventListener('change', aplicarFiltros);

    const form = document.querySelector('.filter-form');
    if (form) {
        form.addEventListener('reset', () => {
            setTimeout(aplicarFiltros, 0);
        });
    }
}


function renderizarEntidades(entidades) {
    const grid = document.getElementById('entidadesGrid');
    if (!grid) return;

    if (!entidades || entidades.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No hay entidades disponibles</p>';
        return;
    }

    grid.innerHTML = entidades.map(entidad => {
        const nombre = entidad.nombre || 'Sin nombre';
        const codigo = entidad.codigo_bancosol || 'N/A';
        const idEntidad = entidad.id_entidad;
        const cp = entidad.cp || 'N/A';
        const esVinculado = (entidad.vinculado_bancosol === true || String(entidad.vinculado_bancosol).toLowerCase() === 'true');

        return `
            <div class="card">
                <div class="brand">
                    <h2>${nombre}</h2>
                </div>
                <div class="values">
                    <div class="value">
                        <p>Vinculado Bancosol:</p>
                        <p>${esVinculado ? 'Sí' : 'No'}</p>
                    </div>
                    <div class="value">
                        <p>Código Bancosol:</p>
                        <p>${codigo}</p>
                    </div>
                    <div class="value">
                        <p>CP:</p>
                        <p>${cp}</p>
                    </div>
                </div>
                <div class="card-buttons">
                    <button type="button" onclick="abrirInfoEntidad(${idEntidad})">+info</button>
                    <button type="button" onclick="window.location.href='/html/edit.html?type=entidades&id=${idEntidad}'">Editar</button>
                </div>
            </div>
        `;
    }).join('');
}

function abrirPopupEntidad() {
    const popup = document.getElementById("popupEntidad");
    if (popup) {
        popup.classList.add("abierto");
        popup.style.display = "flex";
        popup.setAttribute("aria-hidden", "false");
    }
}

function abrirInfoEntidad(idEntidad) {
    const entidad = entidadesCache.find(item => item.id_entidad == idEntidad);
    const contenido = document.getElementById("popupEntidadContenido");

    if (!contenido) return;
    contenido.textContent = ''; // Limpiamos seguro

    if (!entidad) {
        contenido.innerHTML = '<p style="padding: 20px; text-align: center;">No se encontró la entidad.</p>';
        abrirPopupEntidad();
        return;
    }

    const nombre = entidad.nombre || 'Sin nombre';
    const esVinculado = (entidad.vinculado_bancosol === true || String(entidad.vinculado_bancosol).toLowerCase() === 'true' || entidad.vinculado_bancosol === 1);
    const codigo = entidad.codigo_bancosol || 'N/A';
    const domicilio = entidad.domicilio || 'Sin domicilio';
    const cp = entidad.cp || 'N/A';
    const nombreContacto = obtenerNombreContacto(entidad.id_usuario_contacto);

    const tabla = document.createElement('table');
    tabla.className = 'popup-entidad-tabla';
    const tbody = document.createElement('tbody');

    const agregarFila = (etiqueta, valor) => {
        const tr = document.createElement('tr');
        const th = document.createElement('th'); th.textContent = etiqueta;
        const td = document.createElement('td'); td.textContent = valor;
        tr.append(th, td);
        tbody.appendChild(tr);
    };

    agregarFila('Nombre', nombre);
    agregarFila('Código Bancosol', codigo);
    agregarFila('Vinculado Bancosol', esVinculado ? 'Sí' : 'No');
    agregarFila('Domicilio', domicilio);
    agregarFila('CP', cp);
    agregarFila('Contacto', nombreContacto);

    tabla.appendChild(tbody);
    contenido.appendChild(tabla);

    abrirPopupEntidad();
}

function cerrarInfoEntidad() {
    const popup = document.getElementById("popupEntidad");
    if (popup) {
        popup.classList.remove("abierto");
        popup.style.display = "none";
        popup.setAttribute("aria-hidden", "true");
    }
}

window.abrirInfoEntidad = abrirInfoEntidad;
window.cerrarInfoEntidad = cerrarInfoEntidad;

document.addEventListener("DOMContentLoaded", function () {
    cargarEntidades();
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") cerrarInfoEntidad();
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