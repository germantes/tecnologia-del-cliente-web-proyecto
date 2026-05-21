document.addEventListener('DOMContentLoaded', async () => {
    const perfil = sessionStorage.getItem('perfil');
    const token = sessionStorage.getItem('token');

    // Validación estricta del perfil de administrador
    if (!perfil || !token || perfil.toUpperCase() !== 'ADMINISTRADOR') {
        window.location.href = '/html/tiendas.html';
        return;
    }

    const API_BASE = window.API_URL || 'http://localhost:3000';
    const contenedor = document.getElementById('editarContenedor');
    const params = new URLSearchParams(window.location.search);
    const tiendaId = params.get('id');

    if (!tiendaId) {
        mostrarErrorGlobal('Error: No se ha especificado ninguna tienda.');
        return;
    }

    try {
        // Ejecución en paralelo de llamadas a la API
        const [tiendaRes, cpsRes, cadenasRes, usuariosRes] = await Promise.all([
            fetch(`${API_BASE}/api/tiendas/${tiendaId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/cps`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/cadenas`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/usuarios`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (!tiendaRes.ok) {
            throw new Error('Tienda no encontrada');
        }

        const tienda = await tiendaRes.json();
        const listaCPs = cpsRes.ok ? await cpsRes.json() : [];
        const listaCadenas = cadenasRes.ok ? await cadenasRes.json() : [];
        const listaUsuarios = usuariosRes.ok ? await usuariosRes.json() : [];

        // Limpieza de cadenas duplicadas usando un Map
        const cadenasUnicas = Array.from(new Map(listaCadenas.map(cad => [cad.establecimiento, cad])).values())
            .sort((c1, c2) => (c1.establecimiento || '').localeCompare(c2.establecimiento || ''));

        // Obtención de zona y validación de usuarios por demarcación
        const idZonaTienda = (tienda.cp && tienda.cp.zona) ? tienda.cp.zona.id_zona : null;
        const getRol = (u) => (u.rol || u.puesto || '').toUpperCase();

        const isMismaZona = (u) => {
            if (!idZonaTienda) return true;
            const cpMatch = listaCPs.find(c => c.cp == (u.id_cp || u.idCp) || c.id_cp == (u.id_cp || u.idCp));
            const zonaUsuario = cpMatch ? (cpMatch.id_zona || cpMatch.idZona) : null;
            return zonaUsuario == idZonaTienda;
        };

        // Filtramos usuarios según las normas de asignación jerárquica
        const coordinadores = listaUsuarios.filter(u => getRol(u) === 'COORDINADOR');

        const capitanes = listaUsuarios.filter(u =>
            getRol(u) === 'COORDINADOR' ||
            (getRol(u) === 'CAPITAN' && isMismaZona(u))
        );

        const responsables = listaUsuarios.filter(u =>
            getRol(u) === 'COORDINADOR' ||
            (getRol(u) === 'CAPITAN' && isMismaZona(u)) ||
            (getRol(u) === 'RESPONSABLE-ENTIDAD' && isMismaZona(u)) ||
            (getRol(u) === 'RESPONSABLE-TIENDA' && isMismaZona(u))
        );

        // Variables actuales para preseleccionar opciones en el formulario
        let idRespActual = "", idCoordActual = "", idCapActual = "", cajasActuales = 0, participaActual = false;

        if (tienda.tienda_campania && tienda.tienda_campania.length > 0) {
            const campania = tienda.tienda_campania[0];
            idRespActual = campania.id_responsable_tienda || "";
            idCoordActual = campania.id_coordinador || "";
            idCapActual = campania.id_capitan || "";
            cajasActuales = campania.num_cajas || campania.numCajas || 0;
            participaActual = campania.participa || false;
        }

        // Construcción del formulario mediante el DOM
        const form = document.createElement('form');
        form.id = 'formEditarTienda';
        form.style.width = '100%';
        form.style.maxWidth = '900px';
        form.style.margin = '0 auto';

        const inputHidden = document.createElement('input');
        inputHidden.type = 'hidden';
        inputHidden.name = 'idTienda';
        inputHidden.value = tienda.id_tienda;
        form.appendChild(inputHidden);

        const divTotal = document.createElement('div');
        divTotal.classList.add('total');

        const header = document.createElement('header');
        const h1 = document.createElement('h1');
        const nombreCadena = tienda.cadena ? tienda.cadena.establecimiento : "";
        h1.textContent = `Editando Tienda ${tienda.id_tienda} ${nombreCadena}`;
        header.appendChild(h1);
        divTotal.appendChild(header);

        const divTablas = document.createElement('div');
        divTablas.classList.add('tablas');

        // Construcción de la tabla de localización
        const tabla1 = document.createElement('table');
        tabla1.classList.add('tabla-1');

        tabla1.appendChild(crearFilaTextarea('Domicilio', 'domicilio', tienda.domicilio || ""));

        const opcionesCP = listaCPs.map(cp => ({
            valor: cp.cp,
            texto: `${cp.cp} - ${cp.localidad}`,
            seleccionado: (tienda.cp && tienda.cp.cp === cp.cp)
        }));
        tabla1.appendChild(crearFilaSelect('Cód. Postal / Localidad', 'idCp', opcionesCP, false));
        divTablas.appendChild(tabla1);

        // Construcción de la tabla de asignación
        const tabla2 = document.createElement('table');
        tabla2.classList.add('tabla-2');

        const opcionesCadena = cadenasUnicas.map(cad => ({
            valor: cad.id_cadena || cad.idCadena,
            texto: cad.establecimiento,
            seleccionado: (tienda.cadena && cad.establecimiento === tienda.cadena.establecimiento)
        }));
        tabla2.appendChild(crearFilaSelect('Cadena', 'idCadena', opcionesCadena, false));

        const mapearUsuario = (u, comparador) => ({
            valor: u.id_usuario || u.idUsuario,
            texto: u.rol ? `${u.nombre_completo || u.nombreCompleto} (${u.rol})` : (u.nombre_completo || u.nombreCompleto),
            seleccionado: (u.id_usuario || u.idUsuario) == comparador
        });

        tabla2.appendChild(crearFilaSelect('Responsable de Tienda', 'idResponsable', responsables.map(u => mapearUsuario(u, idRespActual)), true));
        tabla2.appendChild(crearFilaSelect('Coordinador', 'idCoordinador', coordinadores.map(u => mapearUsuario(u, idCoordActual)), true));
        tabla2.appendChild(crearFilaSelect('Capitán', 'idCapitan', capitanes.map(u => mapearUsuario(u, idCapActual)), true));

        tabla2.appendChild(crearFilaInputNumber('Número de cajas', 'numCajas', cajasActuales));

        const opcionesParticipa = [
            { valor: 'true', texto: 'Sí', seleccionado: participaActual },
            { valor: 'false', texto: 'No', seleccionado: !participaActual }
        ];
        tabla2.appendChild(crearFilaSelect('Participa', 'participa', opcionesParticipa, false));

        divTablas.appendChild(tabla2);
        divTotal.appendChild(divTablas);

        // Contenedor de botones
        const divBotones = document.createElement('div');
        divBotones.classList.add('botones');

        const btnCancelar = document.createElement('button');
        btnCancelar.type = 'button';
        btnCancelar.classList.add('btn-cerrar');
        btnCancelar.textContent = 'cancelar';
        btnCancelar.addEventListener('click', () => {
            window.location.href = `/html/info_tienda.html?id=${tienda.id_tienda}`;
        });
        divBotones.appendChild(btnCancelar);

        const btnGuardar = document.createElement('button');
        btnGuardar.type = 'submit';
        btnGuardar.classList.add('btn-guardar');
        btnGuardar.textContent = 'guardar';
        divBotones.appendChild(btnGuardar);

        divTotal.appendChild(divBotones);
        form.appendChild(divTotal);
        contenedor.appendChild(form);

        // Intercepción del envío para API Fetch asíncrono
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            data.numCajas = parseInt(data.numCajas) || 0;
            data.participa = data.participa === 'true';

            try {
                const response = await fetch(`${API_BASE}/api/tiendas/${tienda.id_tienda}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    window.location.href = `/html/info_tienda.html?id=${tienda.id_tienda}`;
                } else {
                    alert('Error al guardar los datos de la tienda');
                }
            } catch (error) {
                console.error('Error de red:', error);
                alert('Error de conexión al guardar.');
            }
        });

    } catch (error) {
        mostrarErrorGlobal(error.message);
    }

    // Funciones creadoras de elementos del DOM
    function crearFilaTextarea(etiqueta, name, value) {
        const tr = document.createElement('tr');
        const tdEtiqueta = document.createElement('td');
        tdEtiqueta.classList.add('etiqueta-campo');
        tdEtiqueta.textContent = etiqueta;

        const tdInput = document.createElement('td');
        const textarea = document.createElement('textarea');
        textarea.name = name;
        textarea.rows = 3;
        textarea.value = value;

        tdInput.appendChild(textarea);
        tr.appendChild(tdEtiqueta);
        tr.appendChild(tdInput);
        return tr;
    }

    function crearFilaSelect(etiqueta, name, opciones, incluirOpcionVacia) {
        const tr = document.createElement('tr');
        const tdEtiqueta = document.createElement('td');
        tdEtiqueta.classList.add('etiqueta-campo');
        tdEtiqueta.textContent = etiqueta;

        const tdInput = document.createElement('td');
        const select = document.createElement('select');
        select.name = name;

        if (incluirOpcionVacia) {
            const optionVacia = document.createElement('option');
            optionVacia.value = "";
            optionVacia.textContent = "-- Sin asignar --";
            select.appendChild(optionVacia);
        }

        opciones.forEach(op => {
            const option = document.createElement('option');
            option.value = op.valor;
            option.textContent = op.texto;
            if (op.seleccionado) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        tdInput.appendChild(select);
        tr.appendChild(tdEtiqueta);
        tr.appendChild(tdInput);
        return tr;
    }

    function crearFilaInputNumber(etiqueta, name, value) {
        const tr = document.createElement('tr');
        const tdEtiqueta = document.createElement('td');
        tdEtiqueta.classList.add('etiqueta-campo');
        tdEtiqueta.textContent = etiqueta;

        const tdInput = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'number';
        input.name = name;
        input.value = value;

        tdInput.appendChild(input);
        tr.appendChild(tdEtiqueta);
        tr.appendChild(tdInput);
        return tr;
    }

    function mostrarErrorGlobal(mensaje) {
        while (contenedor.firstChild) {
            contenedor.removeChild(contenedor.firstChild);
        }
        const tituloError = document.createElement('h2');
        tituloError.classList.add('mensaje-error');
        tituloError.textContent = mensaje;
        contenedor.appendChild(tituloError);
    }
});