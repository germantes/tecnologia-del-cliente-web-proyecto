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
        // Pedimos los datos al nuevo endpoint del servidor
        const response = await fetch(`${API_BASE}/api/tiendas/${tiendaId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Error al obtener la tienda.');
        const tienda = await response.json();

        // Variables seguras de la tienda
        const establecimiento = tienda.cadena ? tienda.cadena.establecimiento : 'Sin cadena';
        const localidad = tienda.cp ? tienda.cp.localidad : 'N/A';
        const cpCod = tienda.cp ? tienda.cp.cp : 'N/A';
        const municipio = tienda.cp ? tienda.cp.municipio : 'N/A';
        const zonaGeografica = (tienda.cp && tienda.cp.zona) ? tienda.cp.zona.zona_geografica : 'N/A';
        const domicilio = tienda.domicilio || 'N/A';

        // Datos de campaña
        let participa = "No";
        let capitan = "N/A";
        let coordinador = "N/A";
        let responsable = "N/A";

        if (tienda.tienda_campania && tienda.tienda_campania.length > 0) {
            const campania = tienda.tienda_campania[0];
            participa = campania.participa ? "Sí" : "No";

            // Si en el futuro el endpoint devuelve los nombres, puedes cambiar esto por campania.capitan.nombreCompleto
            capitan = campania.id_capitan || "N/A";
            coordinador = campania.id_coordinador || "N/A";
            responsable = campania.id_responsable_tienda || "N/A";
        }

        const puedeEditar = (perfil.toUpperCase() === 'ADMIN' || perfil.toUpperCase() === 'MANAGER');

        // Construir la vista EXACTAMENTE igual que el JSP para que el CSS la reconozca
        contenedor.innerHTML = `
            <div class="total">
                <header>
                    <h1>Tienda ${tienda.id_tienda} - ${establecimiento}</h1>
                </header>

                <div class="tablas">
                    <table class="tabla-1">
                        <tr>
                            <td>Domicilio</td>
                            <td>${domicilio}</td>
                        </tr>
                        <tr>
                            <td>Localidad</td>
                            <td>${localidad}</td>
                        </tr>
                        <tr>
                            <td>Código Postal (CP)</td>
                            <td>${cpCod}</td>
                        </tr>
                        <tr>
                            <td>Zona Geográfica</td>
                            <td>${zonaGeografica}</td>
                        </tr>
                        <tr>
                            <td>Municipio</td>
                            <td>${municipio}</td>
                        </tr>
                    </table>

                    <table class="tabla-2">
                        <tr>
                            <td>Cadena</td>
                            <td>${establecimiento}</td>
                        </tr>
                        <tr>
                            <td>Responsable de Tienda</td>
                            <td>${responsable}</td>
                        </tr>
                        <tr>
                            <td>Coordinador Asignado</td>
                            <td>${coordinador}</td>
                        </tr>
                        <tr>
                            <td>Capitán</td>
                            <td>${capitan}</td>
                        </tr>
                        <tr>
                            <td>Participa</td>
                            <td>${participa}</td>
                        </tr>
                    </table>
                </div>

                <div class="botones-card">
                    <button class="btn-cerrar" type="button" onclick="window.location.href='tiendas.html'">cerrar</button>
                    ${puedeEditar ? `<button class="btn-editar" type="button" onclick="window.location.href='edit.html?type=tiendas&id=${tienda.id_tienda}'">editar</button>` : ''}
                </div>
            </div>
        `;

    } catch (error) {
        contenedor.innerHTML = `<div class="total" style="padding: 40px; text-align: center;"><p style="color:red; font-weight: bold;">Error: ${error.message}</p></div>`;
    }
});