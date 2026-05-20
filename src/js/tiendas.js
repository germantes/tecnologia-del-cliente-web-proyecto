document.addEventListener('DOMContentLoaded', async () => {
    // 1. Recuperar sesión usando el sistema exacto de tus compañeros
    const perfil = sessionStorage.getItem('perfil');
    const token = sessionStorage.getItem('token');

    // Si no hay sesión, al login
    if (!perfil || !token) {
        window.location.href = 'index.html';
        return;
    }

    const usuarioRol = perfil.toUpperCase();
    const API_BASE = window.API_URL || 'http://localhost:3000';

    const tiendasContainer = document.getElementById('tiendasContainer');
    const adminFilters = document.getElementById('adminFilters');
    const selectZona = document.getElementById('selectZona');
    const selectParticipa = document.getElementById('selectParticipa');

    // 2. Lógica de UI para Administradores
    if (usuarioRol === 'ADMIN') {
        adminFilters.style.display = 'flex';
        await cargarFiltrosZona();

        // Escuchar cambios en los desplegables
        selectZona.addEventListener('change', cargarTiendas);
        selectParticipa.addEventListener('change', cargarTiendas);
    }

    // 3. Carga inicial
    await cargarTiendas();

    async function cargarTiendas() {
        // Animación de carga con los estilos de tus compañeros
        tiendasContainer.innerHTML = '<div class="loading" style="grid-column: 1/-1; justify-content:center;"><div class="spinner"></div> Cargando tiendas...</div>';

        try {
            let url = '/api/tiendas';
            if (usuarioRol === 'ADMIN') {
                const zonaId = selectZona.value;
                const participa = selectParticipa.value;
                url += `?idZona=${zonaId}&participa=${participa}`;
            }

            const response = await fetch(`${API_BASE}${url}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Error al obtener los datos del servidor.');
            const tiendas = await response.json();

            tiendasContainer.innerHTML = '';

            if (tiendas.length === 0) {
                tiendasContainer.innerHTML = '<div class="alert alert-info" style="grid-column: 1/-1; text-align:center;">No hay tiendas para mostrar con los filtros actuales.</div>';
                return;
            }

            // Inyectar tarjetas calcando tu diseño CSS
            tiendas.forEach(tienda => {
                const card = document.createElement('div');
                card.className = 'tienda-card';

                const establecimiento = tienda.cadena ? tienda.cadena.establecimiento : 'Sin cadena';
                const localidad = tienda.cp ? tienda.cp.localidad : 'N/A';
                const cpCod = tienda.cp ? tienda.cp.cp : 'N/A';
                const zonaGeo = (tienda.cp && tienda.cp.zona) ? tienda.cp.zona.zona_geografica : 'N/A';

                // Determinar si participa según el rol o la tabla intermedia
                let participaTexto = "No";
                if (usuarioRol !== 'ADMIN') {
                    participaTexto = "Sí"; // Si no eres admin, solo ves las que participan
                } else if (tienda.tienda_campania && tienda.tienda_campania.length > 0) {
                    participaTexto = tienda.tienda_campania[0].participa ? "Sí" : "No";
                }

                card.innerHTML = `
                    <h3 class="titulo-tienda">Tienda ${tienda.id_tienda} - ${establecimiento}</h3>
                    <p><strong>Cadena: </strong>${establecimiento}</p>
                    <p><strong>Localidad: </strong>${localidad}</p>
                    <p><strong>Domicilio: </strong>${tienda.domicilio || 'N/A'}</p>
                    <p><strong>Participa: </strong>${participaTexto}</p>
                    
                    <div class="botones-card">
                        ${usuarioRol === 'ADMIN' ? `<button class="btn-editar" onclick="window.location.href='edit.html?type=tiendas&id=${tienda.id_tienda}'">editar</button>` : ''}
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