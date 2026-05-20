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
        contenedor.innerHTML = '<div class="detalle-body"><p>Error: No se ha especificado ninguna tienda.</p></div>';
        return;
    }

    try {
        // Pedimos los datos al nuevo endpoint del servidor
        const response = await fetch(`${API_BASE}/api/tiendas/${tiendaId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Error al obtener la tienda.');
        const tienda = await response.json();

        // Variables seguras
        const establecimiento = tienda.cadena ? tienda.cadena.establecimiento : 'Sin cadena';
        const localidad = tienda.cp ? tienda.cp.localidad : 'N/A';
        const cpCod = tienda.cp ? tienda.cp.cp : 'N/A';
        const domicilio = tienda.domicilio || 'N/A';

        // Datos de campaña
        let participa = "No";
        let capitan = "No asignado";
        let coordinador = "No asignado";

        if (tienda.tienda_campania && tienda.tienda_campania.length > 0) {
            const campania = tienda.tienda_campania[0];
            participa = campania.participa ? "Sí" : "No";
            // Por ahora mostramos los IDs (haría falta otra consulta para traer los nombres reales)
            capitan = campania.id_capitan || "No asignado";
            coordinador = campania.id_coordinador || "No asignado";
        }

        const puedeEditar = (perfil.toUpperCase() === 'ADMIN' || perfil.toUpperCase() === 'MANAGER');

        // Construir la vista igual que el JSP
        contenedor.innerHTML = `
            <div class="detalle-header">
                <h2>Detalle de la Tienda #${tienda.id_tienda}</h2>
            </div>
            
            <div class="detalle-body">
                <div class="detalle-section">
                    <h3>Información General</h3>
                    <p><strong>Cadena:</strong> ${establecimiento}</p>
                    <p><strong>Domicilio:</strong> ${domicilio}</p>
                    <p><strong>Localidad:</strong> ${localidad} (${cpCod})</p>
                </div>

                <div class="detalle-section">
                    <h3>Campaña Actual</h3>
                    <p><strong>Participa:</strong> ${participa}</p>
                    <p><strong>Coordinador Asignado:</strong> ${coordinador}</p>
                    <p><strong>Capitán Asignado:</strong> ${capitan}</p>
                </div>

                <div style="margin-top: 20px; display: flex; gap: 15px;">
                    <a href="tiendas.html" class="btn-volver">Volver a Tiendas</a>
                    ${puedeEditar ? `<a href="edit.html?type=tiendas&id=${tienda.id_tienda}" class="btn-editar">Editar Tienda</a>` : ''}
                </div>
            </div>
        `;

    } catch (error) {
        contenedor.innerHTML = `<div class="detalle-body"><p style="color:red;">Error: ${error.message}</p></div>`;
    }
});