document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar el componente de Header/Footer
    if (typeof includeHTML === 'function') {
        includeHTML();
    }

    // Recuperar sesión
    const token = localStorage.getItem('token');
    const usuarioRol = localStorage.getItem('role')?.toUpperCase(); // Asegurar mayúsculas

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const tiendasContainer = document.getElementById('tiendasContainer');
    const adminFilters = document.getElementById('adminFilters');
    const selectZona = document.getElementById('selectZona');
    const selectParticipa = document.getElementById('selectParticipa');

    // Mostrar filtros adicionales si el usuario es ADMINISTRADOR
    if (usuarioRol === 'ADMIN') {
        adminFilters.style.display = 'flex';
        await cargarFiltrosZona();

        // Escuchar cambios en los filtros para recargar las tiendas
        selectZona.addEventListener('change', cargarTiendas);
        selectParticipa.addEventListener('change', cargarTiendas);
    }

    // Cargar las tiendas inicialmente
    await cargarTiendas();

    async function cargarTiendas() {
        tiendasContainer.innerHTML = '<p style="text-align:center; color:#323266; width:100%;">Cargando tiendas...</p>';

        try {
            // Construir URL con query params si es Admin
            let url = '/api/tiendas';
            if (usuarioRol === 'ADMIN') {
                const zonaId = selectZona.value;
                const participa = selectParticipa.value;
                url += `?idZona=${zonaId}&participa=${participa}`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error al obtener tiendas');
            const tiendas = await response.json();

            if (tiendas.length === 0) {
                tiendasContainer.innerHTML = '<h3 style="text-align:center; width: 100%; color: #323266;">No tienes tiendas asignadas o ninguna cumple los filtros.</h3>';
                return;
            }

            // Limpiar contenedor e inyectar tarjetas
            tiendasContainer.innerHTML = '';
            tiendas.forEach(tienda => {
                const card = document.createElement('div');
                card.className = 'tienda-card';

                const establecimiento = tienda.cadena ? tienda.cadena.establecimiento : 'Sin cadena';
                const localidad = tienda.cp ? tienda.cp.localidad : 'N/A';
                const cpCod = tienda.cp ? tienda.cp.cp : 'N/A';
                const zonaGeo = (tienda.cp && tienda.cp.zona) ? tienda.cp.zona.zona_geografica : 'N/A';
                const distrito = (tienda.cp && tienda.cp.distrito) ? tienda.cp.distrito.nombre_distrito : 'N/A';
                const municipio = tienda.cp ? tienda.cp.municipio : 'N/A';

                card.innerHTML = `
                    <h3 class="titulo-tienda">
                        Tienda ${tienda.id_tienda} ${establecimiento}
                    </h3>
                    <p><strong>Domicilio: </strong>${tienda.domicilio || 'N/A'}</p>
                    <p><strong>Localidad: </strong>${localidad}</p>
                    <p><strong>C.P.: </strong>${cpCod}</p>
                    <p><strong>Zona: </strong>${zonaGeo}</p>
                    <p><strong>Distrito: </strong>${distrito}</p>
                    <p><strong>Municipio: </strong>${municipio}</p>
                    <div class="botones-card" style="justify-content: center;">
                        <button class="btn-editar" onclick="window.location.href='edit.html?idTienda=${tienda.id_tienda}'">+ info</button>
                    </div>
                `;
                tiendasContainer.appendChild(card);
            });

        } catch (error) {
            tiendasContainer.innerHTML = `<p style="text-align:center; color:red; width:100%;">Error: ${error.message}</p>`;
        }
    }

    async function cargarFiltrosZona() {
        try {
            const response = await fetch('/api/zonas', {
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
            console.error("Error cargando zonas para el filtro:", e);
        }
    }
});