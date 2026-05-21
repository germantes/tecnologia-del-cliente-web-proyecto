document.addEventListener('DOMContentLoaded', async () => {
    const perfil = sessionStorage.getItem('perfil');
    const token = sessionStorage.getItem('token');

    if (!perfil || !token) {
        window.location.href = 'index.html';
        return;
    }

    const usuarioRol = perfil.toUpperCase();
    const API_BASE = window.API_URL || 'http://localhost:3000';

    const tiendasContainer = document.getElementById('tiendasContainer');
    const adminFilters = document.getElementById('adminFilters');
    const selectZona = document.getElementById('selectZona');
    const selectCampania = document.getElementById('selectCampania');
    const selectParticipa = document.getElementById('selectParticipa');
    const tituloVista = document.getElementById('tituloVista');

    let campaniasGlobal = [];
    let idCampaniaActiva = null;

    // 1. Cargar las campañas antes que nada para saber las fechas
    await cargarCampanias();

    // 2. Configurar Interfaz según el Rol
    if (usuarioRol === 'ADMIN') {
        adminFilters.style.display = 'flex';
        await cargarFiltrosZona();
        const btnAplicar = document.getElementById('btnAplicar');
        if (btnAplicar) btnAplicar.addEventListener('click', cargarTiendas);
        tituloVista.textContent = 'Tiendas por Zona';
    } else {
        // UI Especial para Coordinadores y Capitanes
        tituloVista.style.fontSize = "1.8rem";
        if (idCampaniaActiva) {
            const activa = campaniasGlobal.find(c => c.id_campania === idCampaniaActiva);
            tituloVista.textContent = `Mis Tiendas Asignadas | ${activa.nombre} (Activa)`;
        } else {
            tituloVista.textContent = `Mis Tiendas Asignadas | Sin campaña activa`;
        }
    }

    // 3. Cargar tarjetas
    await cargarTiendas();

    async function cargarCampanias() {
        try {
            // AQUÍ ESTABA EL ERROR: Era /campanias, no /api/campanias
            const res = await fetch(`${API_BASE}/api/campanias`, { headers: { 'Authorization': `Bearer ${token}` }});
            if(res.ok) {
                campaniasGlobal = await res.json();
                const hoy = new Date();

                // Calculamos cuál está activa hoy
                campaniasGlobal.forEach(c => {
                    if (c.fecha_inicio && c.fecha_fin) {
                        const inicio = new Date(c.fecha_inicio);
                        const fin = new Date(c.fecha_fin);
                        fin.setHours(23, 59, 59, 999);
                        if (hoy >= inicio && hoy <= fin) idCampaniaActiva = c.id_campania;
                    }
                });

                // Si es Admin, rellenamos el desplegable
                if (usuarioRol === 'ADMIN' && selectCampania) {
                    campaniasGlobal.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c.id_campania;
                        opt.textContent = c.id_campania === idCampaniaActiva ? `${c.nombre} (Activa)` : c.nombre;
                        selectCampania.appendChild(opt);
                    });
                }
            }
        } catch (e) { console.error("Error cargando campañas:", e); }
    }

    async function cargarTiendas() {
        tiendasContainer.innerHTML = '<div class="loading" style="grid-column: 1/-1; justify-content:center;"><div class="spinner"></div> Cargando tiendas...</div>';

        try {
            let url = '/api/tiendas';
            let idCampaniaBuscada = null;

            if (usuarioRol === 'ADMIN') {
                const zonaId = selectZona.value;
                const participa = selectParticipa.value;
                const campaniaId = selectCampania.value;
                url += `?idZona=${zonaId}&participa=${participa}&idCampania=${campaniaId}`;
                idCampaniaBuscada = parseInt(campaniaId);
            }

            const response = await fetch(`${API_BASE}${url}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error al obtener los datos del servidor.');
            const tiendas = await response.json();
            tiendasContainer.innerHTML = '';

            if (tiendas.length === 0) {
                tiendasContainer.innerHTML = '<div class="alert alert-info" style="grid-column: 1/-1; text-align:center;">No hay tiendas para mostrar con los filtros actuales.</div>';
                return;
            }

            tiendas.forEach(tienda => {
                const card = document.createElement('div');
                card.className = 'tienda-card';

                const establecimiento = tienda.cadena ? tienda.cadena.establecimiento : 'Sin cadena';
                const localidad = tienda.cp ? tienda.cp.localidad : 'N/A';

                let participaTexto = "No";
                let idCampaniaPintar = null;

                // Extraemos los datos de la campaña que estamos visualizando
                if (tienda.tienda_campania && tienda.tienda_campania.length > 0) {
                    let relacion = null;
                    if (idCampaniaBuscada && idCampaniaBuscada > 0) {
                        relacion = tienda.tienda_campania.find(tc => tc.id_campania === idCampaniaBuscada);
                    } else if (idCampaniaActiva) {
                        relacion = tienda.tienda_campania.find(tc => tc.id_campania === idCampaniaActiva);
                    }
                    if (!relacion) relacion = tienda.tienda_campania[0];

                    if (relacion) {
                        participaTexto = relacion.participa ? "Sí" : "No";
                        idCampaniaPintar = relacion.id_campania;
                    }
                }

                card.innerHTML = `
                    <h3 class="titulo-tienda">Tienda ${tienda.id_tienda} - ${establecimiento}</h3>
                    <p><strong>Cadena: </strong>${establecimiento}</p>
                    <p><strong>Localidad: </strong>${localidad}</p>
                    <p><strong>Domicilio: </strong>${tienda.domicilio || 'N/A'}</p>
                    <p><strong>Participa: </strong>${participaTexto}</p>
                    
                    <div class="botones-card">
                        ${usuarioRol === 'ADMIN' ? `<button class="btn-editar" type="button" onclick="window.location.href='editar_tienda.html?id=${tienda.id_tienda}'">editar</button>` : ''}
                        ${participaTexto === 'Sí' && idCampaniaPintar ? `<button class="btn-turnos" onclick="window.location.href='tienda_turnos.html?id=${tienda.id_tienda}&idCampania=${idCampaniaPintar}'">turnos</button>` : ''}
                        <button class="btn-info" onclick="window.location.href='info_tienda.html?id=${tienda.id_tienda}'">+ info</button>
                    </div>
                `;
                tiendasContainer.appendChild(card);
            });

        } catch (error) {
            tiendasContainer.innerHTML = `<div class="alert alert-error" style="grid-column: 1/-1; text-align:center;">${error.message}</div>`;
        }
    }

    async function cargarFiltrosZona() {
        try {
            const response = await fetch(`${API_BASE}/api/zonas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const zonas = await response.json();
                zonas.forEach(zona => {
                    const opt = document.createElement('option');
                    opt.value = zona.id_zona;
                    opt.textContent = zona.zona_geografica;
                    selectZona.appendChild(opt);
                });
            }
        } catch (e) {
            console.error("Error al cargar las zonas:", e);
        }
    }
});