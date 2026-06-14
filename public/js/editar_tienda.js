/**
 * Lógica asíncrona para la edición de tiendas.
 * Respeta la separación de responsabilidades: actualiza 'tienda_campania'
 * únicamente si el usuario ha entrado filtrando por una campaña.
 */
document.addEventListener('DOMContentLoaded', async () => {

    // ========================================================================
    // 1. VERIFICACIÓN DE SEGURIDAD Y PERMISOS
    // ========================================================================
    const perfil = typeof getPerfil === 'function' ? getPerfil() : sessionStorage.getItem('perfil');
    const token = sessionStorage.getItem('token');

    // Expulsión si no es Administrador (Redirección con ruta absoluta segura)
    if (!perfil || !token || perfil.toUpperCase() !== 'ADMINISTRADOR') {
        window.location.href = '/html/tiendas.html';
        return;
    }

    const API_BASE = window.API_URL || "http://localhost:3000";
    const contenedor = document.getElementById('editarContenedor');

    // ========================================================================
    // 2. EXTRACCIÓN DE PARÁMETROS URL (Saber el contexto)
    // ========================================================================
    const params = new URLSearchParams(window.location.search);
    const tiendaId = params.get('id');
    const urlIdCampania = params.get('idCampania');

    if (!tiendaId) {
        mostrarErrorGlobal('Error: No se ha especificado ninguna tienda válida.');
        return;
    }

    try {
        // ========================================================================
        // 3. DESCARGA MASIVA PARALELA (Tienda + 6 Catálogos maestros)
        // ========================================================================
        const [tiendaRes, cpsRes, cadenasRes, usuariosRes, campaniasRes, entidadesRes, asigZonaRes] = await Promise.all([
            fetch(`${API_BASE}/api/tiendas/${tiendaId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/cps`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/cadenas`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/usuarios`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/campanias`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/entidades`, { headers: { 'Authorization': `Bearer ${token}` } }),
            // Extraemos las asignaciones de zona para la validación de capitanes
            fetch(`${API_BASE}/api/asignacion_zona`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => ({ok: false}))
        ]);

        if (!tiendaRes.ok) throw new Error('Tienda no encontrada en la base de datos.');

        const tienda = await tiendaRes.json();
        let listaCPs = cpsRes.ok ? await cpsRes.json() : [];
        const listaCadenas = cadenasRes.ok ? await cadenasRes.json() : [];
        const listaUsuarios = usuariosRes.ok ? await usuariosRes.json() : [];
        const listaCampanias = campaniasRes.ok ? await campaniasRes.json() : [];
        const listaEntidades = entidadesRes.ok ? await entidadesRes.json() : [];
        // Si el endpoint falla o no existe, se inicializa vacío para no romper la app
        const listaAsignacionesZona = asigZonaRes.ok ? await asigZonaRes.json() : [];

        // Ordenamos las listas
        listaCPs.sort((c1, c2) => (c1.cp || '').localeCompare(c2.cp || ''));
        const cadenasUnicas = Array.from(new Map(listaCadenas.map(cad => [cad.establecimiento, cad])).values())
            .sort((c1, c2) => (c1.establecimiento || '').localeCompare(c2.establecimiento || ''));

        // ========================================================================
        // 4. LÓGICA ESTRICTA DE CAMPAÑA
        // ========================================================================
        // REGLA CLAVE: Solo mostramos (y guardamos) datos de campaña si vino filtrada en la URL
        const mostrarCamposCampania = urlIdCampania != null;

        let idRespActual = "", idCoordActual = "", idCapActual = "", idEntidadActual = "";
        let cajasActuales = 0, participaActual = false;
        let nombreCampania = "Sin campaña";

        if (mostrarCamposCampania && tienda.tienda_campania && tienda.tienda_campania.length > 0) {
            // Buscamos específicamente el registro de la campaña seleccionada
            const cmpAsignada = tienda.tienda_campania.find(tc => tc.id_campania == urlIdCampania);

            if (cmpAsignada) {
                idRespActual = cmpAsignada.id_responsable_tienda || "";
                idCoordActual = cmpAsignada.id_coordinador || "";
                idCapActual = cmpAsignada.id_capitan || "";
                idEntidadActual = cmpAsignada.id_entidad || "";
                cajasActuales = cmpAsignada.num_cajas || cmpAsignada.numCajas || 0;
                participaActual = cmpAsignada.participa || false;

                const cmpData = listaCampanias.find(c => c.id_campania == cmpAsignada.id_campania);
                if (cmpData) nombreCampania = cmpData.nombre;
            }
        }

        // ========================================================================
        // 5. CONSTRUCCIÓN DINÁMICA DEL FORMULARIO DOM
        // ========================================================================
        const form = document.createElement('form');
        form.id = 'formEditarTienda';
        form.classList.add('form-container');

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

        // --- TABLA 1: DATOS MAESTROS DE TIENDA ---
        const tabla1 = document.createElement('table');
        tabla1.classList.add('tabla-1');

        tabla1.appendChild(crearFilaTextarea('Domicilio', 'domicilio', tienda.domicilio || ""));

        const opcionesCP = listaCPs.map(cp => ({
            valor: cp.cp,
            texto: `${cp.cp} - ${cp.localidad}`,
            seleccionado: (tienda.cp && tienda.cp.cp === cp.cp)
        }));
        const filaCp = crearFilaSelect('Cód. Postal / Localidad', 'idCp', opcionesCP, false);
        const selectCp = filaCp.querySelector('select');
        tabla1.appendChild(filaCp);

        let selectEntidad;
        if (mostrarCamposCampania) {
            const opcionesEntidad = listaEntidades.map(ent => ({
                valor: ent.id_entidad || ent.idEntidad,
                texto: ent.nombre,
                seleccionado: (ent.id_entidad == idEntidadActual || ent.idEntidad == idEntidadActual)
            }));
            const filaEnt = crearFilaSelect('Entidad (ONG)', 'idEntidad', opcionesEntidad, true);
            selectEntidad = filaEnt.querySelector('select');
            tabla1.appendChild(filaEnt);
        }

        divTablas.appendChild(tabla1);

        // --- TABLA 2: CADENA Y ASIGNACIONES ---
        const tabla2 = document.createElement('table');
        tabla2.classList.add('tabla-2');

        const opcionesCadena = cadenasUnicas.map(cad => ({
            valor: cad.id_cadena || cad.idCadena,
            texto: cad.establecimiento,
            seleccionado: (tienda.cadena && cad.establecimiento === tienda.cadena.establecimiento)
        }));
        tabla2.appendChild(crearFilaSelect('Cadena', 'idCadena', opcionesCadena, false));

        let selectResp, selectCoord, selectCap, selectParticipa;

        // Se inyectan los roles solo si estamos editando en el contexto de una campaña
        if (mostrarCamposCampania) {
            const filaResp = crearFilaSelect('Responsable de Tienda', 'idResponsable', [], true);
            const filaCoord = crearFilaSelect('Coordinador', 'idCoordinador', [], true);
            const filaCap = crearFilaSelect('Capitán', 'idCapitan', [], true);

            selectResp = filaResp.querySelector('select');
            selectCoord = filaCoord.querySelector('select');
            selectCap = filaCap.querySelector('select');

            tabla2.appendChild(filaResp);
            tabla2.appendChild(filaCoord);
            tabla2.appendChild(filaCap);
            tabla2.appendChild(crearFilaInputNumber('Número de cajas', 'numCajas', cajasActuales));

            const opcionesParticipa = [
                { valor: 'true', texto: 'Sí', seleccionado: participaActual },
                { valor: 'false', texto: 'No', seleccionado: !participaActual }
            ];
            const filaParticipa = crearFilaSelect(`Participa (${nombreCampania})`, 'participa', opcionesParticipa, false);
            selectParticipa = filaParticipa.querySelector('select');
            tabla2.appendChild(filaParticipa);
        }

        divTablas.appendChild(tabla2);
        divTotal.appendChild(divTablas);

        // --- BOTONERA ---
        const divBotones = document.createElement('div');
        divBotones.classList.add('botones');

        const btnEliminar = document.createElement('button');
        btnEliminar.type = 'button';
        btnEliminar.classList.add('btn-eliminar');
        btnEliminar.textContent = 'Eliminar';
        btnEliminar.addEventListener('click', async () => {
            if (window.confirm("¿Estás seguro de eliminar esta tienda por completo?")) {
                btnEliminar.disabled = true;
                btnEliminar.textContent = "Borrando...";
                try {
                    const response = await fetch(`${API_BASE}/api/tiendas/${tienda.id_tienda}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        window.location.href = '/html/tiendas.html';
                    } else {
                        const err = await response.json();
                        alert(`Error al eliminar: ${err.message}`);
                        btnEliminar.disabled = false;
                        btnEliminar.textContent = "Eliminar";
                    }
                } catch (error) {
                    alert('Error de conexión.');
                    btnEliminar.disabled = false;
                }
            }
        });
        divBotones.appendChild(btnEliminar);

        const arrastrarURL = urlIdCampania ? `&idCampania=${urlIdCampania}` : '';
        const btnCancelar = document.createElement('button');
        btnCancelar.type = 'button';
        btnCancelar.classList.add('btn-cerrar');
        btnCancelar.textContent = 'Cancelar';
        btnCancelar.addEventListener('click', () => { window.location.href = `/html/info_tienda.html?id=${tienda.id_tienda}${arrastrarURL}`; });
        divBotones.appendChild(btnCancelar);

        const btnGuardar = document.createElement('button');
        btnGuardar.type = 'submit';
        btnGuardar.classList.add('btn-guardar');
        btnGuardar.textContent = 'Guardar';
        divBotones.appendChild(btnGuardar);

        divTotal.appendChild(divBotones);
        form.appendChild(divTotal);

        contenedor.innerHTML = '';
        contenedor.appendChild(form);

        // ========================================================================
        // 6. LÓGICA DE INTERFAZ REACTIVA Y REGLAS DE NEGOCIO (Selects)
        // ========================================================================

        // Limpiador estricto para base de datos ("CAPITÁN" -> "CAPITAN")
        const getRol = (u) => {
            let r = (u.rol || u.puesto || '').toUpperCase();
            return r.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        };

        const mapearUsuario = (u, comparador) => ({
            valor: u.id_usuario || u.idUsuario,
            texto: u.rol ? `${u.nombre_completo || u.nombreCompleto} (${u.rol})` : (u.nombre_completo || u.nombreCompleto),
            seleccionado: (u.id_usuario || u.idUsuario) == comparador
        });

        const actualizarAsignaciones = () => {
            if (!mostrarCamposCampania) return;

            const participa = selectParticipa.value === 'true';
            const cpSeleccionado = selectCp.value;

            const prevResp = selectResp.value || idRespActual;
            const prevCoord = selectCoord.value || idCoordActual;
            const prevCap = selectCap.value || idCapActual;

            if (!participa || !cpSeleccionado) {
                selectResp.disabled = true; selectCoord.disabled = true; selectCap.disabled = true;
                if (selectEntidad) selectEntidad.disabled = true;
                rellenarOpciones(selectResp, []); rellenarOpciones(selectCoord, []); rellenarOpciones(selectCap, []);
                return;
            }

            // Identificación de la Zona de la Tienda
            const cpMatch = listaCPs.find(c => c.cp == cpSeleccionado);
            const idZonaSeleccionada = cpMatch ? (cpMatch.id_zona || cpMatch.idZona) : null;

            // Función evaluadora de validez de Zonas en Asignaciones
            const isAsignacionZonaValida = (u) => {
                if (!idZonaSeleccionada) return true; // Si la tienda no tiene zona, mostramos todos por precaución

                // Filtramos asignaciones de este usuario en esta campaña concreta
                const asignacionesUsuario = listaAsignacionesZona.filter(az =>
                    (az.id_usuario == (u.id_usuario || u.idUsuario)) &&
                    (az.id_campania == urlIdCampania)
                );

                // Si no tiene NINGUNA asignación en esta campaña, ES VÁLIDO (Está libre)
                if (asignacionesUsuario.length === 0) return true;

                // Si SÍ participa, verificamos que su id_zona coincida con la de la tienda
                return asignacionesUsuario.some(az => az.id_zona == idZonaSeleccionada);
            };

            // REGLAS ESTRICTAS DE FILTRADO
            // 1. Coordinadores: Todos los disponibles
            const coordinadores = listaUsuarios.filter(u => getRol(u) === 'COORDINADOR');

            // 2. Capitanes: Solo CAPITAN válido según asignaciones
            const capitanes = listaUsuarios.filter(u =>
                getRol(u) === 'COORDINADOR' ||
                getRol(u) === 'CAPITAN' // Se debería añadir  && isAsignacionZonaValida(u) pero por inconsistencias en la bd se deja así
            );

            // 3. Responsables: Coordinadores + Responsables Tienda + Capitanes válidos (Excluyendo explícitamente Entidades)
            const responsables = listaUsuarios.filter(u => {
                const rol = getRol(u);
                if (rol === 'RESPONSABLE-ENTIDAD') return false;

                if (rol === 'COORDINADOR' || rol === 'RESPONSABLE-TIENDA') return true;
                if (rol === 'CAPITAN') return isAsignacionZonaValida(u);

                return false;
            });

            rellenarOpciones(selectResp, responsables.map(u => mapearUsuario(u, prevResp)));
            rellenarOpciones(selectCoord, coordinadores.map(u => mapearUsuario(u, prevCoord)));
            rellenarOpciones(selectCap, capitanes.map(u => mapearUsuario(u, prevCap)));

            selectResp.disabled = false; selectCoord.disabled = false; selectCap.disabled = false;
            if (selectEntidad) selectEntidad.disabled = false;
        };

        if (mostrarCamposCampania) {
            selectCp.addEventListener('change', actualizarAsignaciones);
            selectParticipa.addEventListener('change', actualizarAsignaciones);
            actualizarAsignaciones();
        }

        // ========================================================================
        // 7. ENVÍO DE DATOS A LA API (Submit Condicionado)
        // ========================================================================
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Bloque Base (Tabla Tienda)
            const data = {
                domicilio: form.querySelector('[name="domicilio"]').value,
                idCp: selectCp.value,
                idCadena: form.querySelector('[name="idCadena"]').value,
            };

            // Bloque Expandido (Tabla Tienda_Campania) - Solo se añade si hubo filtro
            if (mostrarCamposCampania) {
                data.idCampania = urlIdCampania; // Usa el ID de la URL
                data.participa = selectParticipa.value === 'true';
                data.numCajas = parseInt(form.querySelector('[name="numCajas"]').value) || 0;

                // Los datos desactivados se mandan como nulos
                data.idResponsable = selectResp.value || null;
                data.idCoordinador = selectCoord.value || null;
                data.idCapitan = selectCap.value || null;
                if (selectEntidad) data.idEntidad = selectEntidad.value || null;
            }

            try {
                const response = await fetch(`${API_BASE}/api/tiendas/${tienda.id_tienda}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    window.location.href = `/html/info_tienda.html?id=${tienda.id_tienda}${arrastrarURL}`;
                } else {
                    const err = await response.json();
                    alert(`Error al guardar: ${err.message || 'Verifica los campos'}`);
                }
            } catch (error) {
                alert('Error de conexión al intentar guardar.');
            }
        });

    } catch (error) {
        mostrarErrorGlobal(error.message);
    }

    // --- Helpers DOM ---
    function crearFilaTextarea(etiqueta, name, value) {
        const tr = document.createElement('tr');
        const tdEtiqueta = document.createElement('td'); tdEtiqueta.classList.add('etiqueta-campo'); tdEtiqueta.textContent = etiqueta;
        const tdInput = document.createElement('td');
        const textarea = document.createElement('textarea'); textarea.name = name; textarea.rows = 3; textarea.value = value;
        tdInput.appendChild(textarea); tr.appendChild(tdEtiqueta); tr.appendChild(tdInput); return tr;
    }

    function crearFilaSelect(etiqueta, name, opciones, incluirOpcionVacia) {
        const tr = document.createElement('tr');
        const tdEtiqueta = document.createElement('td'); tdEtiqueta.classList.add('etiqueta-campo'); tdEtiqueta.textContent = etiqueta;
        const tdInput = document.createElement('td');
        const select = document.createElement('select'); select.name = name;
        rellenarOpciones(select, opciones, incluirOpcionVacia);
        tdInput.appendChild(select); tr.appendChild(tdEtiqueta); tr.appendChild(tdInput); return tr;
    }

    function rellenarOpciones(selectElement, opciones, incluirOpcionVacia = true) {
        selectElement.innerHTML = '';
        if (incluirOpcionVacia) {
            const optionVacia = document.createElement('option'); optionVacia.value = ""; optionVacia.textContent = "-- Sin asignar --"; selectElement.appendChild(optionVacia);
        }
        opciones.forEach(op => {
            const option = document.createElement('option'); option.value = op.valor; option.textContent = op.texto;
            if (op.seleccionado) option.selected = true; selectElement.appendChild(option);
        });
    }

    function crearFilaInputNumber(etiqueta, name, value) {
        const tr = document.createElement('tr');
        const tdEtiqueta = document.createElement('td'); tdEtiqueta.classList.add('etiqueta-campo'); tdEtiqueta.textContent = etiqueta;
        const tdInput = document.createElement('td');
        const input = document.createElement('input'); input.type = 'number'; input.name = name; input.value = value; input.min = 0;
        tdInput.appendChild(input); tr.appendChild(tdEtiqueta); tr.appendChild(tdInput); return tr;
    }

    function mostrarErrorGlobal(mensaje) {
        contenedor.innerHTML = '';
        const divError = document.createElement('div'); divError.classList.add('total', 'error-panel');
        const pError = document.createElement('h2'); pError.classList.add('mensaje-error'); pError.textContent = mensaje;
        divError.appendChild(pError); contenedor.appendChild(divError);
    }
});