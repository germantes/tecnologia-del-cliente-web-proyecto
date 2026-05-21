document.addEventListener('DOMContentLoaded', async () => {
    const perfil = sessionStorage.getItem('perfil');
    const token = sessionStorage.getItem('token');

    // Solo el ADMIN puede entrar a esta pantalla
    if (!perfil || !token || perfil.toUpperCase() !== 'ADMIN') {
        window.location.href = '/html/tiendas.html';
        return;
    }

    const API_BASE = window.API_URL || 'http://localhost:3000';
    const contenedor = document.getElementById('editarContenedor');
    const params = new URLSearchParams(window.location.search);
    const tiendaId = params.get('id');

    if (!tiendaId) {
        contenedor.innerHTML = '<h2 class="mensaje-error">Error: No se ha especificado ninguna tienda.</h2>';
        return;
    }

    try {
        // Hacemos las peticiones al backend en paralelo (sustituye al controlador de Java)
        const [tiendaRes, cpsRes, cadenasRes, usuariosRes] = await Promise.all([
            fetch(`${API_BASE}/api/tiendas/${tiendaId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/cps`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/cadenas`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/usuarios`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (!tiendaRes.ok) throw new Error('Tienda no encontrada');

        const tienda = await tiendaRes.json();
        const listaCPs = cpsRes.ok ? await cpsRes.json() : [];
        const listaCadenas = cadenasRes.ok ? await cadenasRes.json() : [];
        const listaUsuarios = usuariosRes.ok ? await usuariosRes.json() : [];

        const cadenasUnicas = Array.from(new Map(listaCadenas.map(cad => [cad.establecimiento, cad])).values())
            .sort((c1, c2) => (c1.establecimiento || '').localeCompare(c2.establecimiento || ''));

        const idZonaTienda = (tienda.cp && tienda.cp.zona) ? tienda.cp.zona.id_zona : null;

        const getRol = (u) => (u.rol || u.puesto || '').toUpperCase();
        const isMismaZona = (u) => {
            if (!idZonaTienda) return true; // Si la tienda no tiene zona, permitimos todos
            const zonaUsuario = u.id_zona || u.idZona;
            return zonaUsuario == idZonaTienda;
        };

        const coordinadores = listaUsuarios.filter(u => getRol(u) === 'COORDINADOR');

        const capitanes = listaUsuarios.filter(u =>
            getRol(u) === 'COORDINADOR' ||
            (getRol(u) === 'CAPITAN' && isMismaZona(u))
        );

        const responsables = listaUsuarios.filter(u =>
            getRol(u) === 'COORDINADOR' ||
            (getRol(u) === 'CAPITAN' && isMismaZona(u)) ||
            ((getRol(u) === 'RESPONSABLE-ENTIDAD' || getRol(u) === 'RESPONSABLE_ENTIDAD' || getRol(u) === 'RESPONSABLETIENDA') && isMismaZona(u))
        );

        // Valores actuales de la campaña
        let idRespActual = "", idCoordActual = "", idCapActual = "", cajasActuales = 0, participaActual = false;
        if (tienda.tienda_campania && tienda.tienda_campania.length > 0) {
            const campania = tienda.tienda_campania[0];
            idRespActual = campania.id_responsable_tienda || "";
            idCoordActual = campania.id_coordinador || "";
            idCapActual = campania.id_capitan || "";

            // Aquí estaba el fallo: le añadimos el num_cajas de Supabase
            cajasActuales = campania.num_cajas || campania.numCajas || 0;

            participaActual = campania.participa || false;
        }

        // Pintamos el formulario calcado al JSP
        contenedor.innerHTML = `
            <form id="formEditarTienda" style="width: 100%; max-width: 900px; margin: 0 auto;">
                <input type="hidden" name="idTienda" value="${tienda.id_tienda}">
                
                <div class="total">
                    <header>
                        <h1>Editando Tienda ${tienda.id_tienda} ${tienda.cadena ? tienda.cadena.establecimiento : ""}</h1>
                    </header>

                    <div class="tablas">
                        <table class="tabla-1">
                            <tr>
                                <td class="etiqueta-campo">Domicilio</td>
                                <td><textarea name="domicilio" rows="3">${tienda.domicilio || ""}</textarea></td>
                            </tr>
                            <tr>
                                <td class="etiqueta-campo">Cód. Postal / Localidad</td>
                                <td>
                                    <select name="idCp">
                                        ${listaCPs.map(cp => `
                                            <option value="${cp.cp}" ${(tienda.cp && tienda.cp.cp === cp.cp) ? "selected" : ""}>
                                                ${cp.cp} - ${cp.localidad}
                                            </option>
                                        `).join('')}
                                    </select>
                                </td>
                            </tr>
                        </table>

                        <table class="tabla-2">
                            <tr>
                                <td class="etiqueta-campo">Cadena</td>
                                <td>
                                    <select name="idCadena">
                                        ${cadenasUnicas.map(cad => {
                                            const idCad = cad.id_cadena || cad.idCadena;
                                            // Comparamos por NOMBRE en lugar de por ID para evadir el problema de los duplicados
                                            const nombreCadenaOpcion = cad.establecimiento;
                                            const nombreCadenaTienda = tienda.cadena ? tienda.cadena.establecimiento : null;
                                
                                            const isSelected = (nombreCadenaOpcion === nombreCadenaTienda) ? "selected" : "";
                                
                                            return `
                                                <option value="${idCad}" ${isSelected}>
                                                    ${cad.establecimiento}
                                                </option>
                                            `;
                                        }).join('')}
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <td class="etiqueta-campo">Responsable de Tienda</td>
                                <td>
                                    <select name="idResponsable">
                                        <option value="">-- Sin asignar --</option>
                                        ${responsables.map(u => `<option value="${u.idUsuario}" ${u.idUsuario == idRespActual ? "selected" : ""}>${u.nombreCompleto} (${u.rol})</option>`).join('')}
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <td class="etiqueta-campo">Coordinador</td>
                                <td>
                                    <select name="idCoordinador">
                                        <option value="">-- Sin asignar --</option>
                                        ${coordinadores.map(u => `<option value="${u.idUsuario}" ${u.idUsuario == idCoordActual ? "selected" : ""}>${u.nombreCompleto}</option>`).join('')}
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <td class="etiqueta-campo">Capitán</td>
                                <td>
                                    <select name="idCapitan">
                                        <option value="">-- Sin asignar --</option>
                                        ${capitanes.map(u => `<option value="${u.idUsuario}" ${u.idUsuario == idCapActual ? "selected" : ""}>${u.nombreCompleto}</option>`).join('')}
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <td class="etiqueta-campo">Número de cajas</td>
                                <td><input type="number" name="numCajas" value="${cajasActuales}"></td>
                            </tr>
                            <tr>
                                <td class="etiqueta-campo">Participa</td>
                                <td>
                                    <select name="participa">
                                        <option value="true" ${participaActual ? "selected" : ""}>Sí</option>
                                        <option value="false" ${!participaActual ? "selected" : ""}>No</option>
                                    </select>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <div class="botones">
                        <button type="button" class="btn-cerrar" onclick="window.location.href='/html/info_tienda.html?id=${tienda.id_tienda}'">cancelar</button>
                        <button type="submit" class="btn-guardar">guardar</button>
                    </div>
                </div>
            </form>
        `;

        // Interceptamos el submit para enviar los datos por API en lugar de recargar la página
        document.getElementById('formEditarTienda').addEventListener('submit', async (e) => {
            e.preventDefault();

            // Recogemos todos los datos del formulario
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            // Convertimos la caja y el booleano a sus tipos correctos
            data.numCajas = parseInt(data.numCajas) || 0;
            data.participa = data.participa === 'true';

            try {
                // En el JSP hacías un POST a /tienda_guardar, aquí hacemos un PUT al API de la tienda
                const response = await fetch(`${API_BASE}/api/tiendas/${tienda.id_tienda}`, {
                    method: 'PUT', // o 'POST' dependiendo de tu backend
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
                console.error('Error:', error);
                alert('Error de conexión al guardar.');
            }
        });

    } catch (error) {
        contenedor.innerHTML = `<h2 class="mensaje-error">Error: ${error.message}</h2>`;
    }
});