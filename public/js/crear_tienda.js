/**
 * Lógica asíncrona de construcción del formulario de CREACIÓN de tienda.
 * Lee 4 endpoints simultáneos, cruza datos y renderiza inputs dependientes.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Obtener rol/perfil usando la utilidad central (si está disponible) o fallback legacy.
    const perfil = getPerfil();
    const token = sessionStorage.getItem('token');

    if (!perfil || !token || perfil.toUpperCase() !== 'ADMINISTRADOR') {
        window.location.href = '/html/tiendas.html';
        return;
    }

    const API_BASE = window.API_URL || "http://localhost:3000";
    const contenedor = document.getElementById('contenedorFormulario'); // Referencia al div vacío en HTML

    try {
        // 2. Fetch Paralelo: Trae todas las listas maestras de la API de golpe para no bloquear la pantalla
        const [cpsRes, cadenasRes, usuariosRes, campaniasRes] = await Promise.all([
            fetch(`${API_BASE}/api/cps`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/cadenas`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/usuarios`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/campanias`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        let listaCPs = cpsRes.ok ? await cpsRes.json() : [];
        const listaCadenas = cadenasRes.ok ? await cadenasRes.json() : [];
        const listaUsuarios = usuariosRes.ok ? await usuariosRes.json() : [];
        const listaCampanias = campaniasRes.ok ? await campaniasRes.json() : [];

        // Ordenamos la lista de Códigos Postales
        listaCPs.sort((c1, c2) => (c1.cp || '').localeCompare(c2.cp || ''));

        // 3. Resolución de la Campaña en curso
        let idCampaniaActiva = null;
        let nombreCampaniaActiva = 'Sin campaña';
        const hoy = new Date();
        listaCampanias.forEach(c => {
            if (c.fecha_inicio && c.fecha_fin) {
                const inicio = new Date(c.fecha_inicio);
                const fin = new Date(c.fecha_fin);
                fin.setHours(23, 59, 59, 999);
                if (hoy >= inicio && hoy <= fin) {
                    idCampaniaActiva = c.id_campania;
                    nombreCampaniaActiva = c.nombre;
                }
            }
        });

        // Depuración de Cadenas duplicadas
        const cadenasUnicas = Array.from(new Map(listaCadenas.map(cad => [cad.establecimiento, cad])).values())
            .sort((c1, c2) => (c1.establecimiento || '').localeCompare(c2.establecimiento || ''));

        // 4. CREACIÓN DEL ÁRBOL DOM (Inyección limpia de HTML)
        const form = document.createElement('form');
        form.id = 'formCrearTienda';

        if (idCampaniaActiva) {
            const inputCamp = document.createElement('input');
            inputCamp.type = 'hidden';
            inputCamp.name = 'idCampania';
            inputCamp.value = idCampaniaActiva;
            form.appendChild(inputCamp);
        }

        const divTotal = document.createElement('div');
        divTotal.classList.add('total');

        const header = document.createElement('header');
        const h1 = document.createElement('h1');
        h1.textContent = `Crear Nueva Tienda`;
        header.appendChild(h1);
        divTotal.appendChild(header);

        const divTablas = document.createElement('div');
        divTablas.classList.add('tablas');

        // TABLA IZQUIERDA: Domicilio y CP
        const tabla1 = document.createElement('table');
        tabla1.appendChild(crearFilaTextarea('Domicilio', 'domicilio', ""));

        const opcionesCP = listaCPs.map(cp => ({
            valor: cp.cp, texto: `${cp.cp} - ${cp.localidad}`, seleccionado: false
        }));
        const filaCp = crearFilaSelect('Cód. Postal / Localidad', 'idCp', opcionesCP, true);
        const selectCp = filaCp.querySelector('select');
        tabla1.appendChild(filaCp);
        divTablas.appendChild(tabla1);

        // TABLA DERECHA: Cadena y Asignaciones Personales
        const tabla2 = document.createElement('table');

        const opcionesCadena = cadenasUnicas.map(cad => ({
            valor: cad.id_cadena || cad.idCadena, texto: cad.establecimiento, seleccionado: false
        }));
        tabla2.appendChild(crearFilaSelect('Cadena', 'idCadena', opcionesCadena, true));

        const opcionesParticipa = [
            { valor: 'false', texto: 'No', seleccionado: true },
            { valor: 'true', texto: 'Sí', seleccionado: false }
        ];
        const filaParticipa = crearFilaSelect(`Participa (${nombreCampaniaActiva})`, 'participa', opcionesParticipa, false);
        const selectParticipa = filaParticipa.querySelector('select');
        tabla2.appendChild(filaParticipa);

        tabla2.appendChild(crearFilaInputNumber('Número de cajas', 'numCajas', 0));

        // Nodos Select de Personal (Nacen bloqueados hasta que el usuario decida que la tienda SÍ participa)
        const filaResp = crearFilaSelect('Responsable de Tienda', 'idResponsable', [], true);
        const filaCoord = crearFilaSelect('Coordinador', 'idCoordinador', [], true);
        const filaCap = crearFilaSelect('Capitán', 'idCapitan', [], true);

        const selectResp = filaResp.querySelector('select');
        const selectCoord = filaCoord.querySelector('select');
        const selectCap = filaCap.querySelector('select');

        tabla2.appendChild(filaResp);
        tabla2.appendChild(filaCoord);
        tabla2.appendChild(filaCap);
        divTablas.appendChild(tabla2);
        divTotal.appendChild(divTablas);

        // BOTONERA INFERIOR
        const divBotones = document.createElement('div');
        divBotones.classList.add('botones');

        const btnCancelar = document.createElement('button');
        btnCancelar.type = 'button';
        btnCancelar.classList.add('btn-cerrar');
        btnCancelar.textContent = 'Cancelar';
        btnCancelar.addEventListener('click', () => { window.location.href = `/html/tiendas.html`; });
        divBotones.appendChild(btnCancelar);

        const btnGuardar = document.createElement('button');
        btnGuardar.type = 'submit';
        btnGuardar.classList.add('btn-guardar');
        btnGuardar.textContent = 'Crear';
        divBotones.appendChild(btnGuardar);

        divTotal.appendChild(divBotones);
        form.appendChild(divTotal);

        // Vuelca la estructura final a la página, borrando el spinner de carga
        contenedor.innerHTML = '';
        contenedor.appendChild(form);

        // ====================================================================
        // 5. LÓGICA REACTIVA DE FORMULARIO (Manejo de estados sin recarga web)
        // ====================================================================

        const getRol = (u) => (u.rol || u.puesto || '').toUpperCase();
        const mapearUsuario = (u, comparadorId) => ({
            valor: u.id_usuario || u.idUsuario,
            texto: u.rol ? `${u.nombre_completo || u.nombreCompleto} (${u.rol})` : (u.nombre_completo || u.nombreCompleto),
            seleccionado: (u.id_usuario || u.idUsuario) == comparadorId
        });

        /** Evalúa qué usuarios están disponibles en base al Código Postal elegido */
        const actualizarAsignaciones = () => {
            const participa = selectParticipa.value === 'true';
            const cpSeleccionado = selectCp.value;

            // Salva la selección previa para no frustrar al usuario al re-dibujar
            const prevResp = selectResp.value;
            const prevCoord = selectCoord.value;
            const prevCap = selectCap.value;

            // Regla de Negocio: Sin CP o si no participa, se bloquean los usuarios
            if (!participa || !cpSeleccionado) {
                selectResp.disabled = true; selectCoord.disabled = true; selectCap.disabled = true;
                rellenarOpciones(selectResp, []); rellenarOpciones(selectCoord, []); rellenarOpciones(selectCap, []);
                return;
            }

            const cpMatch = listaCPs.find(c => c.cp == cpSeleccionado);
            const idZonaSeleccionada = cpMatch ? (cpMatch.id_zona || cpMatch.idZona) : null;

            const isMismaZona = (u) => {
                if (!idZonaSeleccionada) return true;
                const matchU = listaCPs.find(c => c.cp == (u.id_cp || u.idCp) || c.id_cp == (u.id_cp || u.idCp));
                const zonaU = matchU ? (matchU.id_zona || matchU.idZona) : null;
                return zonaU == idZonaSeleccionada;
            };

            const coordinadores = listaUsuarios.filter(u => getRol(u) === 'COORDINADOR');
            const capitanes = listaUsuarios.filter(u => getRol(u) === 'COORDINADOR' || (getRol(u) === 'CAPITAN' && isMismaZona(u)));
            const responsables = listaUsuarios.filter(u => getRol(u) === 'COORDINADOR' || (getRol(u) === 'CAPITAN' && isMismaZona(u)) || (getRol(u) === 'RESPONSABLE-ENTIDAD' && isMismaZona(u)) || (getRol(u) === 'RESPONSABLE-TIENDA' && isMismaZona(u)));

            rellenarOpciones(selectResp, responsables.map(u => mapearUsuario(u, prevResp)));
            rellenarOpciones(selectCoord, coordinadores.map(u => mapearUsuario(u, prevCoord)));
            rellenarOpciones(selectCap, capitanes.map(u => mapearUsuario(u, prevCap)));

            selectResp.disabled = false; selectCoord.disabled = false; selectCap.disabled = false;
        };

        // Listeners: Recalcular dependencias al vuelo
        selectCp.addEventListener('change', actualizarAsignaciones);
        selectParticipa.addEventListener('change', actualizarAsignaciones);
        actualizarAsignaciones();

        // 6. Enviar Datos (Submit)
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            if (data.numCajas) data.numCajas = parseInt(data.numCajas) || 0;
            if (data.participa) data.participa = data.participa === 'true';

            try {
                // Post genérico a la API de Node
                const response = await fetch(`${API_BASE}/api/tiendas`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    window.location.href = `/html/tiendas.html`;
                } else {
                    const errInfo = await response.json();
                    alert(`Error al crear la tienda: ${errInfo.message || 'Verifica los campos'}`);
                }
            } catch (error) {
                alert('Error de conexión al intentar crear el registro en servidor.');
            }
        });

    } catch (error) {
        mostrarErrorGlobal(error.message);
    }

    // --- Helpers de creación del DOM ---
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
            const optionVacia = document.createElement('option'); optionVacia.value = ""; optionVacia.textContent = "-- Seleccione una opción --"; selectElement.appendChild(optionVacia);
        }
        opciones.forEach(op => {
            const option = document.createElement('option'); option.value = op.valor; option.textContent = op.texto;
            if (op.seleccionado) option.selected = true;
            selectElement.appendChild(option);
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
        const tituloError = document.createElement('h2'); tituloError.classList.add('mensaje-error'); tituloError.textContent = mensaje;
        contenedor.appendChild(tituloError);
    }
});