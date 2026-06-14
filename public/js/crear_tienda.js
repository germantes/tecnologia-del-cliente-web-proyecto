/**
 * Lógica asíncrona de construcción del formulario de CREACIÓN de tienda.
 * Lee endpoints simultáneos, cruza datos y renderiza inputs dependientes.
 */
document.addEventListener('DOMContentLoaded', async () => {

    const perfil = typeof getPerfil === 'function' ? getPerfil() : sessionStorage.getItem('perfil');
    const token = sessionStorage.getItem('token');

    if (!perfil || !token || perfil.toUpperCase() !== 'ADMINISTRADOR') {
        window.location.href = '/html/tiendas.html';
        return;
    }

    const API_BASE = window.API_URL || "http://localhost:3000";
    const contenedor = document.getElementById('contenedorFormulario');

    try {
        const [cpsRes, cadenasRes, usuariosRes, campaniasRes, entidadesRes, asigZonaRes] = await Promise.all([
            fetch(`${API_BASE}/api/cps`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/cadenas`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/usuarios`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/campanias`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/entidades`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/asignacion_zona`, { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => ({ok: false}))
        ]);

        let listaCPs = cpsRes.ok ? await cpsRes.json() : [];
        const listaCadenas = cadenasRes.ok ? await cadenasRes.json() : [];
        const listaUsuarios = usuariosRes.ok ? await usuariosRes.json() : [];
        const listaCampanias = campaniasRes.ok ? await campaniasRes.json() : [];
        const listaEntidades = entidadesRes.ok ? await entidadesRes.json() : [];
        const listaAsignacionesZona = asigZonaRes.ok ? await asigZonaRes.json() : [];

        listaCPs.sort((c1, c2) => (c1.cp || '').localeCompare(c2.cp || ''));

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

        const cadenasUnicas = Array.from(new Map(listaCadenas.map(cad => [cad.establecimiento, cad])).values())
            .sort((c1, c2) => (c1.establecimiento || '').localeCompare(c2.establecimiento || ''));

        const form = document.createElement('form');
        form.id = 'formCrearTienda';
        form.classList.add('form-container');

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
        tabla1.classList.add('tabla-1');
        tabla1.appendChild(crearFilaTextarea('Domicilio', 'domicilio', ""));

        const opcionesCP = listaCPs.map(cp => ({
            valor: cp.cp, texto: `${cp.cp} - ${cp.localidad}`, seleccionado: false
        }));
        const filaCp = crearFilaSelect('Cód. Postal / Localidad', 'idCp', opcionesCP, true);
        const selectCp = filaCp.querySelector('select');
        tabla1.appendChild(filaCp);

        // Entidad en Creación
        const opcionesEntidad = listaEntidades.map(ent => ({
            valor: ent.id_entidad || ent.idEntidad, texto: ent.nombre, seleccionado: false
        }));
        const filaEnt = crearFilaSelect('Entidad (ONG)', 'idEntidad', opcionesEntidad, true);
        const selectEntidad = filaEnt.querySelector('select');
        tabla1.appendChild(filaEnt);

        divTablas.appendChild(tabla1);

        // TABLA DERECHA: Cadena y Asignaciones Personales
        const tabla2 = document.createElement('table');
        tabla2.classList.add('tabla-2');

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

        contenedor.innerHTML = '';
        contenedor.appendChild(form);

        // ====================================================================
        // LÓGICA REACTIVA DE FORMULARIO
        // ====================================================================

        const getRol = (u) => {
            let r = (u.rol || u.puesto || '').toUpperCase();
            return r.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        };

        const mapearUsuario = (u, comparadorId) => ({
            valor: u.id_usuario || u.idUsuario,
            texto: u.rol ? `${u.nombre_completo || u.nombreCompleto} (${u.rol})` : (u.nombre_completo || u.nombreCompleto),
            seleccionado: (u.id_usuario || u.idUsuario) == comparadorId
        });

        const actualizarAsignaciones = () => {
            const participa = selectParticipa.value === 'true';
            const cpSeleccionado = selectCp.value;

            const prevResp = selectResp.value;
            const prevCoord = selectCoord.value;
            const prevCap = selectCap.value;

            if (!participa || !cpSeleccionado || !idCampaniaActiva) {
                selectResp.disabled = true; selectCoord.disabled = true; selectCap.disabled = true;
                if (selectEntidad) selectEntidad.disabled = true;
                rellenarOpciones(selectResp, []); rellenarOpciones(selectCoord, []); rellenarOpciones(selectCap, []);
                return;
            }

            const cpMatch = listaCPs.find(c => c.cp == cpSeleccionado);
            const idZonaSeleccionada = cpMatch ? (cpMatch.id_zona || cpMatch.idZona) : null;

            // Validación de Asignaciones Zonal en Creación
            const isAsignacionZonaValida = (u) => {
                if (!idZonaSeleccionada) return true;
                const asignacionesUsuario = listaAsignacionesZona.filter(az =>
                    (az.id_usuario == (u.id_usuario || u.idUsuario)) &&
                    (az.id_campania == idCampaniaActiva)
                );
                if (asignacionesUsuario.length === 0) return true;
                return asignacionesUsuario.some(az => az.id_zona == idZonaSeleccionada);
            };

            const coordinadores = listaUsuarios.filter(u => getRol(u) === 'COORDINADOR');

            const capitanes = listaUsuarios.filter(u =>
                getRol(u) === 'COORDINADOR' ||
                getRol(u) === 'CAPITAN' && isAsignacionZonaValida(u)
            );

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

        selectCp.addEventListener('change', actualizarAsignaciones);
        selectParticipa.addEventListener('change', actualizarAsignaciones);
        actualizarAsignaciones();

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                domicilio: form.querySelector('[name="domicilio"]').value,
                idCp: selectCp.value,
                idCadena: form.querySelector('[name="idCadena"]').value,
            };

            // Solo enviamos bloque extra si la tienda participa en la activa
            if (idCampaniaActiva) {
                data.idCampania = idCampaniaActiva;
                data.participa = selectParticipa.value === 'true';
                data.numCajas = parseInt(form.querySelector('[name="numCajas"]').value) || 0;

                data.idResponsable = selectResp.value || null;
                data.idCoordinador = selectCoord.value || null;
                data.idCapitan = selectCap.value || null;
                if (selectEntidad) data.idEntidad = selectEntidad.value || null;
            }

            try {
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
                alert('Error de conexión al crear.');
            }
        });

    } catch (error) {
        mostrarErrorGlobal(error.message);
    }

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