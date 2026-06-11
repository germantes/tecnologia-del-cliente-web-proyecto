let entidadesCache = [];
let usuariosCache = [];

async function cargarEntidades() {
    const urlParams = new URLSearchParams(window.location.search);
    const idCampaniaParam = urlParams.get('idCampania');
    
    // REQUISITO: Reemplazamos la lectura directa del sessionStorage por la nueva función centralizada.
    // Usamos la utilidad global si existe, si no, caemos al fallback legacy.
    const rolUsuario = (typeof window.obtenerRolDeToken === 'function')
        ? window.obtenerRolDeToken()
        : (function(){ const p = sessionStorage.getItem('perfil') || sessionStorage.getItem('rol'); return p ? p.toUpperCase() : null; })();
    console.log('Cargando vista Entidades. Rol del usuario:', rolUsuario); // Log de trazabilidad

    if (rolUsuario !== 'ADMINISTRADOR' && !idCampaniaParam) {
        const grid = document.getElementById('entidadesGrid');
        if (grid) {
            grid.textContent = '';
            const errorDiv = document.createElement('div');
            errorDiv.className = 'turnos-vacio';
            const h3 = document.createElement('h3'); h3.textContent = 'Acceso denegado';
            const p = document.createElement('p'); p.textContent = 'No tienes permiso para ver todas las entidades. Por favor, accede mediante una campaña específica.';
            errorDiv.append(h3, p);
            grid.appendChild(errorDiv);
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
        grid.textContent = '';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'turnos-vacio';
        const h3 = document.createElement('h3'); h3.textContent = 'Error al cargar entidades';
        const p = document.createElement('p'); p.textContent = error.message;
        errorDiv.append(h3, p);
        grid.appendChild(errorDiv);
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

    // Limpiamos el select antes de inyectar las opciones
    selectVinculado.textContent = '';

    // Configuración de los filtros
    const opcionTodos = document.createElement("option");
    opcionTodos.value = "";
    opcionTodos.textContent = "Todos los tipos";

    const opcionTrue = document.createElement("option");
    opcionTrue.value = "true";
    opcionTrue.textContent = "Vinculadas";

    const opcionFalse = document.createElement("option");
    opcionFalse.value = "false";
    opcionFalse.textContent = "No vinculadas";

    selectVinculado.append(opcionTodos, opcionTrue, opcionFalse);

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
}


function renderizarEntidades(entidades) {
    const grid = document.getElementById('entidadesGrid');
    if (!grid) return;
    grid.textContent = ''; // Limpiar el contenido de forma segura

    if (!entidades || entidades.length === 0) {
        const divVacio = document.createElement('div');
        divVacio.className = 'entidades-vacio';
        const h3 = document.createElement('h3'); h3.textContent = 'No hay entidades disponibles';
        const p = document.createElement('p'); p.textContent = 'No se han encontrado entidades.';
        divVacio.append(h3, p);
        grid.appendChild(divVacio);
        return;
    }

    entidades.forEach(entidad => {
        const nombre = entidad.nombre || 'Sin nombre';
        const codigo = entidad.codigo_bancosol || 'N/A';
        const idEntidad = entidad.id_entidad;

        const esVinculado = (entidad.vinculado_bancosol === true || String(entidad.vinculado_bancosol).toLowerCase() === 'true');

        const diaCard = document.createElement('div');
        diaCard.className = 'dia-card';

        const turnoCard = document.createElement('div');
        turnoCard.className = 'turno-card';

        const bloqueTurno = document.createElement('div');
        bloqueTurno.className = 'bloque-turno';

        const h3 = document.createElement('h3');
        h3.className = 'titulo-turno';
        h3.textContent = nombre;

        const filaVinculado = document.createElement('div');
        filaVinculado.className = 'fila-voluntario';
        const spanVincLabel = document.createElement('span'); spanVincLabel.textContent = 'Vinculado Bancosol';
        const spanVincValor = document.createElement('span'); spanVincValor.textContent = esVinculado ? 'Sí' : 'No';
        filaVinculado.append(spanVincLabel, spanVincValor);

        const filaCodigo = document.createElement('div');
        filaCodigo.className = 'fila-voluntario';
        const spanCodLabel = document.createElement('span'); spanCodLabel.textContent = 'Código Bancosol';
        const spanCodValor = document.createElement('span'); spanCodValor.textContent = codigo;
        filaCodigo.append(spanCodLabel, spanCodValor);

        const botonesDiv = document.createElement('div');
        botonesDiv.className = 'boton-editar-turno';

        const btnInfo = document.createElement('a');
        btnInfo.className = 'btn btn-outline js-entidad-info';
        btnInfo.href = '#';
        btnInfo.textContent = '+info';
        btnInfo.addEventListener('click', (e) => {
            e.preventDefault();
            abrirInfoEntidad(idEntidad);
        });

        const btnEditar = document.createElement('a');
        btnEditar.className = 'btn btn-primary';
        btnEditar.href = `/html/edit.html?type=entidades&id=${idEntidad}`;
        btnEditar.textContent = 'Editar';

        botonesDiv.append(btnInfo, btnEditar);
        bloqueTurno.append(h3, filaVinculado, filaCodigo, botonesDiv);
        turnoCard.appendChild(bloqueTurno);
        diaCard.appendChild(turnoCard);

        grid.appendChild(diaCard);
    });
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
        const divError = document.createElement('div');
        divError.className = 'popup-voluntario-error';
        divError.textContent = 'No se encontró la entidad.';
        contenido.appendChild(divError);
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
    tabla.className = 'popup-voluntario-tabla';
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

    // REQUISITO: Usamos la nueva función para controlar la visibilidad del botón.
    // Comprobación segura en tiempo de ejecución para evitar ReferenceError si la utilidad
    // aún no se ha cargado en el orden de scripts.
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