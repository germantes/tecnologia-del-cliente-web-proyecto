/**
 * Lógica asíncrona para la edición de tiendas.
 * Extrae la ID de la tienda desde la URL, baja sus datos y pre-rellena el formulario.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Obtener rol/perfil usando la utilidad central (si existe) o fallback legacy.
    const perfil = getPerfil();
    const token = sessionStorage.getItem('token');

    // Expulsión si no es Administrador
    if (!perfil || !token || perfil.toUpperCase() !== 'ADMINISTRADOR') {
        window.location.href = '/html/tiendas.html';
        return;
    }

    const API_BASE = window.API_URL || "http://localhost:3000";
    const contenedor = document.getElementById('editarContenedor');

    // ========================================================================
    // 2. EXTRACCIÓN DE PARÁMETROS URL (Saber qué tienda y campaña editamos)
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
        // 3. DESCARGA MASIVA PARALELA (Tienda + Catálogos maestros)
        // ========================================================================
        const [tiendaRes, cpsRes, cadenasRes, usuariosRes, campaniasRes, entidadesRes] = await Promise.all([
            fetch(`${API_BASE}/api/tiendas/${tiendaId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/cps`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/cadenas`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/usuarios`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/campanias`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/entidades`, { headers: { 'Authorization': `Bearer ${token}` } }) // <-- Añadido para el select de ONG
        ]);

        if (!tiendaRes.ok) throw new Error('Tienda no encontrada en la base de datos.');

        const tienda = await tiendaRes.json();
        let listaCPs = cpsRes.ok ? await cpsRes.json() : [];
        const listaCadenas = cadenasRes.ok ? await cadenasRes.json() : [];
        const listaUsuarios = usuariosRes.ok ? await usuariosRes.json() : [];
        const listaCampanias = campaniasRes.ok ? await campaniasRes.json() : [];
        const listaEntidades = entidadesRes.ok ? await entidadesRes.json() : [];

        // Ordenamos las listas para los desplegables
        listaCPs.sort((c1, c2) => (c1.cp || '').localeCompare(c2.cp || ''));
        const cadenasUnicas = Array.from(new Map(listaCadenas.map(cad => [cad.establecimiento, cad])).values())
            .sort((c1, c2) => (c1.establecimiento || '').localeCompare(c2.establecimiento || ''));

        // ========================================================================
        // 4. BÚSQUEDA DEL CONTEXTO (Historial de la campaña actual)
        // ========================================================================
        let idRespActual = "", idCoordActual = "", idCapActual = "", idEntidadActual = "";
        let cajasActuales = 0, participaActual = false;
        let nombreCampania = "Sin campaña";

        if (tienda.tienda_campania && tienda.tienda_campania.length > 0) {
            let campania = tienda.tienda_campania[0]; // Fallback por defecto

            // Si la URL pide editar una campaña concreta, buscamos ese registro en el historial
            if (urlIdCampania) {
                const cmpAsignada = tienda.tienda_campania.find(tc => tc.id_campania == urlIdCampania);
                if (cmpAsignada) campania = cmpAsignada;
            }

            // Volcamos los datos históricos a variables locales
            idRespActual = campania.id_responsable_tienda || "";
            idCoordActual = campania.id_coordinador || "";
            idCapActual = campania.id_capitan || "";
            idEntidadActual = campania.id_entidad || "";
            cajasActuales = campania.num_cajas || campania.numCajas || 0;
            participaActual = campania.participa || false;

            const cmpData = listaCampanias.find(c => c.id_campania == campania.id_campania);
            if (cmpData) nombreCampania = cmpData.nombre;
        }

        const mostrarCamposCampania = urlIdCampania != null;

        // ========================================================================
        // 5. CONSTRUCCIÓN DINÁMICA DEL FORMULARIO DOM
        // ========================================================================
        const form = document.createElement('form');
        form.id = 'formEditarTienda';
        form.classList.add('form-container');

        // Inputs ocultos clave para el UPDATE
        const inputHidden = document.createElement('input');
        inputHidden.type = 'hidden';
        inputHidden.name = 'idTienda';
        inputHidden.value = tienda.id_tienda;
        form.appendChild(inputHidden);

        if (mostrarCamposCampania) {
            const inputCamp = document.createElement('input');
            inputCamp.type = 'hidden';
            inputCamp.name = 'idCampania';
            inputCamp.value = urlIdCampania;
            form.appendChild(inputCamp);
        }

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

        // --- TABLA 1: DATOS FÍSICOS ---
        const tabla1 = document.createElement('table');
        tabla1.classList.add('tabla-1');

        tabla1.appendChild(crearFilaTextarea('Domicilio', 'domicilio', tienda.domicilio || ""));

        // Código Postal
        const opcionesCP = listaCPs.map(cp => ({
            valor: cp.cp,
            texto: `${cp.cp} - ${cp.localidad}`,
            seleccionado: (tienda.cp && tienda.cp.cp === cp.cp)
        }));
        const filaCp = crearFilaSelect('Cód. Postal / Localidad', 'idCp', opcionesCP, false);
        const selectCp = filaCp.querySelector('select');
        tabla1.appendChild(filaCp);

        // Entidad (ONG) - Ahora se inyecta en la tabla 1
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

        // --- TABLA 2: ASIGNACIONES ORGANIZATIVAS ---
        const tabla2 = document.createElement('table');
        tabla2.classList.add('tabla-2');

        const opcionesCadena = cadenasUnicas.map(cad => ({
            valor: cad.id_cadena || cad.idCadena,
            texto: cad.establecimiento,
            seleccionado: (tienda.cadena && cad.establecimiento === tienda.cadena.establecimiento)
        }));
        tabla2.appendChild(crearFilaSelect('Cadena', 'idCadena', opcionesCadena, false));

        let selectResp, selectCoord, selectCap, selectParticipa;

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

        // --- BOTONERA DE ACCIÓN ---
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
                        alert(`Error al eliminar: ${err.message || 'Ya tiene Turnos o relaciones activas'}`);
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

        // Navegación hacia atrás controlada (arrastra el ID de campaña si existe)
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

        // Renderiza en pantalla sustituyendo el spinner
        contenedor.innerHTML = '';
        contenedor.appendChild(form);

        // ========================================================================
        // 6. LÓGICA DE INTERFAZ REACTIVA (Eventos OnChange)
        // ========================================================================

        const mapearUsuario = (u, comparador) => ({
            valor: u.id_usuario || u.idUsuario,
            texto: u.rol ? `${u.nombre_completo || u.nombreCompleto} (${u.rol})` : (u.nombre_completo || u.nombreCompleto),
            seleccionado: (u.id_usuario || u.idUsuario) == comparador
        });

        const actualizarAsignaciones = () => {
            if (!mostrarCamposCampania) return;

            const participa = selectParticipa.value === 'true';
            const cpSeleccionado = selectCp.value;

            // Salvamos las selecciones previas o actuales para no borrarlas al recalcular
            const prevResp = selectResp.value || idRespActual;
            const prevCoord = selectCoord.value || idCoordActual;
            const prevCap = selectCap.value || idCapActual;

            // Bloqueo dinámico si la tienda no participa
            if (!participa || !cpSeleccionado) {
                selectResp.disabled = true; selectCoord.disabled = true; selectCap.disabled = true;
                if (selectEntidad) selectEntidad.disabled = true;

                rellenarOpciones(selectResp, []); rellenarOpciones(selectCoord, []); rellenarOpciones(selectCap, []);
                return;
            }

            // Identificación de la Zona para filtrado
            const cpMatch = listaCPs.find(c => c.cp == cpSeleccionado);
            const idZonaSeleccionada = cpMatch ? (cpMatch.id_zona || cpMatch.idZona) : null;
            const getRol = (u) => (u.rol || u.puesto || '').toUpperCase();

            const isMismaZona = (u) => {
                if (!idZonaSeleccionada) return true;
                const matchU = listaCPs.find(c => c.cp == (u.id_cp || u.idCp) || c.id_cp == (u.id_cp || u.idCp));
                const zonaU = matchU ? (matchU.id_zona || matchU.idZona) : null;
                return zonaU == idZonaSeleccionada;
            };

            // Filtrado Jerárquico de Usuarios
            const coordinadores = listaUsuarios.filter(u => getRol(u) === 'COORDINADOR');
            const capitanes = listaUsuarios.filter(u => getRol(u) === 'COORDINADOR' || (getRol(u) === 'CAPITAN' && isMismaZona(u)));
            const responsables = listaUsuarios.filter(u => getRol(u) === 'COORDINADOR' || (getRol(u) === 'CAPITAN' && isMismaZona(u)) || (getRol(u) === 'RESPONSABLE-ENTIDAD' && isMismaZona(u)) || (getRol(u) === 'RESPONSABLE-TIENDA' && isMismaZona(u)));

            // Re-renderizado de desplegables
            rellenarOpciones(selectResp, responsables.map(u => mapearUsuario(u, prevResp)));
            rellenarOpciones(selectCoord, coordinadores.map(u => mapearUsuario(u, prevCoord)));
            rellenarOpciones(selectCap, capitanes.map(u => mapearUsuario(u, prevCap)));

            // Desbloqueo de controles
            selectResp.disabled = false; selectCoord.disabled = false; selectCap.disabled = false;
            if (selectEntidad) selectEntidad.disabled = false;
        };

        // Activamos los Event Listeners
        if (mostrarCamposCampania) {
            selectCp.addEventListener('change', actualizarAsignaciones);
            selectParticipa.addEventListener('change', actualizarAsignaciones);
            actualizarAsignaciones(); // Ejecución inicial
        }

        // ========================================================================
        // 7. ENVÍO DE DATOS A LA API (Submit)
        // ========================================================================
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            // Normalización de tipos
            if (data.numCajas) data.numCajas = parseInt(data.numCajas) || 0;
            if (data.participa) data.participa = data.participa === 'true';

            try {
                // Petición PUT para actualizar el registro completo
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
        mostrarErrorGlobal(error.message); // Atrapa errores del Promise.all
    }

    // --- Helpers de creación del DOM ---

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

        rellenarOpciones(select, opciones, incluirOpcionVacia);
        tdInput.appendChild(select);
        tr.appendChild(tdEtiqueta);
        tr.appendChild(tdInput);
        return tr;
    }

    function rellenarOpciones(selectElement, opciones, incluirOpcionVacia = true) {
        selectElement.innerHTML = '';
        if (incluirOpcionVacia) {
            const optionVacia = document.createElement('option');
            optionVacia.value = "";
            optionVacia.textContent = "-- Sin asignar --";
            selectElement.appendChild(optionVacia);
        }
        opciones.forEach(op => {
            const option = document.createElement('option');
            option.value = op.valor;
            option.textContent = op.texto;
            if (op.seleccionado) option.selected = true;
            selectElement.appendChild(option);
        });
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
        input.min = 0;

        tdInput.appendChild(input);
        tr.appendChild(tdEtiqueta);
        tr.appendChild(tdInput);
        return tr;
    }

    function mostrarErrorGlobal(mensaje) {
        contenedor.innerHTML = '';
        const divError = document.createElement('div');
        divError.classList.add('total', 'error-panel'); // Usa clase CSS
        const pError = document.createElement('h2');
        pError.classList.add('mensaje-error');
        pError.textContent = mensaje;
        divError.appendChild(pError);
        contenedor.appendChild(divError);
    }
});