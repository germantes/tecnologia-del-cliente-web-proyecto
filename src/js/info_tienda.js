document.addEventListener('DOMContentLoaded', async () => {
    const perfil = sessionStorage.getItem('perfil');
    const token = sessionStorage.getItem('token');

    if (!perfil || !token) {
        window.location.href = 'index.html';
        return;
    }

    const API_BASE = window.API_URL || 'http://localhost:3000';
    const contenedor = document.getElementById('detalleContenedor');
    const params = new URLSearchParams(window.location.search);
    const tiendaId = params.get('id');

    if (!tiendaId) {
        contenedor.innerHTML = '<div class="total" style="padding: 40px; text-align: center;"><h2>Error: No se ha especificado ninguna tienda.</h2></div>';
        return;
    }

    try {
        // Pedimos la tienda, los usuarios Y las campañas al mismo tiempo
        const [response, usuariosRes, campaniasRes] = await Promise.all([
            fetch(`${API_BASE}/api/tiendas/${tiendaId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/usuarios`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/campanias`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (!response.ok) throw new Error('Error al obtener la tienda.');
        const tienda = await response.json();
        const listaUsuarios = usuariosRes.ok ? await usuariosRes.json() : [];
        const listaCampanias = campaniasRes.ok ? await campaniasRes.json() : [];

        // 1. Calculamos cuál es la campaña activa hoy (igual que en tiendas.js)
        let idCampaniaActiva = null;
        const hoy = new Date();
        listaCampanias.forEach(c => {
            if (c.fecha_inicio && c.fecha_fin) {
                const inicio = new Date(c.fecha_inicio);
                const fin = new Date(c.fecha_fin);
                fin.setHours(23, 59, 59, 999);
                if (hoy >= inicio && hoy <= fin) idCampaniaActiva = c.id_campania;
            }
        });

        // Función para convertir ID a Nombre Real de usuario
        const getNombreUsuario = (id) => {
            if (!id) return 'N/A';
            const usuario = listaUsuarios.find(u => u.id_usuario == id || u.idUsuario == id);
            return usuario ? (usuario.nombre_completo || usuario.nombreCompleto || id) : id;
        };

        // Variables de localización e información de la tienda
        const establecimiento = tienda.cadena ? tienda.cadena.establecimiento : 'Sin cadena';
        const localidad = tienda.cp ? tienda.cp.localidad : 'N/A';
        const cpCod = tienda.cp ? tienda.cp.cp : 'N/A';
        const municipio = tienda.cp ? tienda.cp.municipio : 'N/A';
        const zonaGeografica = (tienda.cp && tienda.cp.zona) ? tienda.cp.zona.zona_geografica : 'N/A';
        const distrito = (tienda.cp && tienda.cp.distrito) ? (tienda.cp.distrito.nombre_distrito || 'N/A') : 'N/A';
        const domicilio = tienda.domicilio || 'N/A';

        // Valores por defecto para la campaña
        let participa = "No";
        let capitan = "N/A";
        let coordinador = "N/A";
        let responsable = "N/A";
        let numCajas = 0;

        // 2. Buscamos los datos específicos de la campaña activa
        if (tienda.tienda_campania && tienda.tienda_campania.length > 0) {
            let campaniaInfo = null;

            if (idCampaniaActiva) {
                // Buscamos la fila correspondiente a la campaña que está activa hoy
                campaniaInfo = tienda.tienda_campania.find(tc => tc.id_campania === idCampaniaActiva);
            }

            // Si la tienda no tiene registros de la campaña de hoy, usamos el primero disponible como plan B
            if (!campaniaInfo) campaniaInfo = tienda.tienda_campania[0];

            if (campaniaInfo) {
                participa = campaniaInfo.participa ? "Sí" : "No";
                capitan = getNombreUsuario(campaniaInfo.id_capitan);
                coordinador = getNombreUsuario(campaniaInfo.id_coordinador);
                responsable = getNombreUsuario(campaniaInfo.id_responsable_tienda);
                numCajas = campaniaInfo.num_cajas || campaniaInfo.numCajas || 0;
            }
        }

        const puedeEditar = (perfil.toUpperCase() === 'ADMIN');

        // Pintamos el contenedor HTML
        contenedor.innerHTML = `
            <div class="total">
                <header>
                    <h1>Tienda ${tienda.id_tienda} - ${establecimiento}</h1>
                </header>

                <div class="tablas">
                    <table class="tabla-1">
                        <tr><td>Domicilio</td><td>${domicilio}</td></tr>
                        <tr><td>Localidad</td><td>${localidad}</td></tr>
                        <tr><td>Código Postal (CP)</td><td>${cpCod}</td></tr>
                        <tr><td>Zona Geográfica</td><td>${zonaGeografica}</td></tr>
                        <tr><td>Distrito</td><td>${distrito}</td></tr>
                        <tr><td>Municipio</td><td>${municipio}</td></tr>
                    </table>

                    <table class="tabla-2">
                        <tr><td>Cadena</td><td>${establecimiento}</td></tr>
                        <tr><td>Responsable de Tienda</td><td>${responsable}</td></tr>
                        <tr><td>Coordinador Asignado</td><td>${coordinador}</td></tr>
                        <tr><td>Capitán</td><td>${capitan}</td></tr>
                        <tr><td>Número de cajas</td><td>${numCajas}</td></tr>
                        <tr><td>Participa</td><td>${participa}</td></tr>
                    </table>
                </div>

                <div class="botones-card">
                    <button class="btn-cerrar" type="button" onclick="window.location.href='tiendas.html'">cerrar</button>
                    ${puedeEditar ? `<button class="btn-editar" type="button" onclick="window.location.href='editar_tienda.html?id=${tienda.id_tienda}'">editar</button>` : ''}
                </div>
            </div>
        `;

    } catch (error) {
        contenedor.innerHTML = `<div class="total" style="padding: 40px; text-align: center;"><p style="color:red; font-weight: bold;">Error: ${error.message}</p></div>`;
    }
});