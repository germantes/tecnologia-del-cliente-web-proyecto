/**
 * Renderizado de la pantalla informativa de Solo-Lectura de una tienda.
 * Analiza el cruce de datos Históricos para mostrar el personal responsable de la campaña.
 */
document.addEventListener('DOMContentLoaded', async () => {

    // 1. Verificación de Seguridad y Sesión
    const rolUsuario = (typeof window.obtenerRolDeToken === 'function')
        ? window.obtenerRolDeToken()
        : (function(){ const p = sessionStorage.getItem('perfil') || sessionStorage.getItem('rol'); return p ? p.toUpperCase() : null; })();
    const token = sessionStorage.getItem('token');

    if (!rolUsuario || !token) {
        window.location.href = 'index.html';
        return;
    }

    const API_BASE = window.API_URL || "http://localhost:3000";
    const contenedor = document.getElementById('detalleContenedor');

    // Extracción de contexto HTTP GET para saber qué tienda abrir
    const params = new URLSearchParams(window.location.search);
    const tiendaId = params.get('id');
    const urlIdCampania = params.get('idCampania');

    if (!tiendaId) {
        mostrarErrorDOM('Error: No se ha especificado ninguna tienda en la URL.');
        return;
    }

    try {
        // 2. Extracción Paralela (Tienda actual, Catálogo Usuarios, Catálogo Campañas)
        const [response, usuariosRes, campaniasRes] = await Promise.all([
            fetch(`${API_BASE}/api/tiendas/${tiendaId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/usuarios`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/campanias`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (!response.ok) throw new Error('El ID de tienda solicitado no existe.');

        const tienda = await response.json();
        const listaUsuarios = usuariosRes.ok ? await usuariosRes.json() : [];
        const listaCampanias = campaniasRes.ok ? await campaniasRes.json() : [];

        // 3. Resolución de la Campaña Actual
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

        /** Mapea un ID de Usuario al Nombre Completo consultando el JSON de todos los usuarios */
        const getNombreUsuario = (id) => {
            if (!id) return 'N/A';
            const usuario = listaUsuarios.find(u => u.id_usuario == id || u.idUsuario == id);
            return usuario ? (usuario.nombre_completo || usuario.nombreCompleto || id) : id;
        };

        // 4. Preparación Visual de Variables Estáticas Físicas
        const establecimiento = tienda.cadena ? tienda.cadena.establecimiento : 'Sin cadena';
        const localidad = tienda.cp ? tienda.cp.localidad : 'N/A';
        const cpCod = tienda.cp ? tienda.cp.cp : 'N/A';
        const municipio = tienda.cp ? tienda.cp.municipio : 'N/A';
        const zonaGeografica = (tienda.cp && tienda.cp.zona) ? tienda.cp.zona.zona_geografica : 'N/A';
        const distrito = (tienda.cp && tienda.cp.distrito) ? (tienda.cp.distrito.nombre_distrito || 'N/A') : 'N/A';
        const domicilio = tienda.domicilio || 'N/A';

        // Valores por defecto Organizacionales
        let participa = "No";
        let capitan = "N/A";
        let coordinador = "N/A";
        let responsable = "N/A";
        let numCajas = 0;
        let idCampaniaPintar = null;
        let nombreCampania = "Sin campaña";

        // 5. Análisis del Historial Relacional (Asignaciones según Campaña)
        if (tienda.tienda_campania && tienda.tienda_campania.length > 0) {
            let campaniaInfo = null;

            // Priorizamos la campaña que el usuario trae filtrada desde la pantalla anterior
            if (urlIdCampania) {
                campaniaInfo = tienda.tienda_campania.find(tc => tc.id_campania == urlIdCampania);
            } else if (idCampaniaActiva) {
                campaniaInfo = tienda.tienda_campania.find(tc => tc.id_campania === idCampaniaActiva);
            }
            if (!campaniaInfo) campaniaInfo = tienda.tienda_campania[0]; // Fallback

            if (campaniaInfo) {
                participa = campaniaInfo.participa ? "Sí" : "No";
                idCampaniaPintar = campaniaInfo.id_campania;
                capitan = getNombreUsuario(campaniaInfo.id_capitan);
                coordinador = getNombreUsuario(campaniaInfo.id_coordinador);
                responsable = getNombreUsuario(campaniaInfo.id_responsable_tienda);
                numCajas = campaniaInfo.num_cajas || campaniaInfo.numCajas || 0;

                const cmpData = listaCampanias.find(c => c.id_campania == idCampaniaPintar);
                if (cmpData) nombreCampania = cmpData.nombre;
            }
        }

        // Lógica de Permisos de Interfaz
        const puedeEditar = (rolUsuario.toUpperCase() === 'ADMINISTRADOR');
        const mostrarDatosCampania = (rolUsuario.toUpperCase() !== 'ADMINISTRADOR') || urlIdCampania;

        // ====================================================================
        // 6. RENDERIZADO DEL DOM MEDIANTE JAVASCRIPT
        // ====================================================================
        const divTotal = document.createElement('div');
        divTotal.classList.add('total');

        const header = document.createElement('header');
        const h1 = document.createElement('h1');
        header.classList.add('info-header');
        h1.textContent = `Tienda ${tienda.id_tienda} - ${establecimiento}`;
        header.appendChild(h1);
        divTotal.appendChild(header);

        const divTablas = document.createElement('div');
        divTablas.classList.add('tablas');

        // Tabla 1: Datos Fijos
        const tabla1 = document.createElement('table');
        tabla1.classList.add('tabla-1');
        tabla1.appendChild(crearFilaTabla('Domicilio', domicilio));
        tabla1.appendChild(crearFilaTabla('Localidad', localidad));
        tabla1.appendChild(crearFilaTabla('Código Postal (CP)', cpCod));
        tabla1.appendChild(crearFilaTabla('Zona Geográfica', zonaGeografica));
        tabla1.appendChild(crearFilaTabla('Distrito', distrito));
        tabla1.appendChild(crearFilaTabla('Municipio', municipio));
        divTablas.appendChild(tabla1);

        // Tabla 2: Datos Dinámicos (Roles)
        const tabla2 = document.createElement('table');
        tabla2.classList.add('tabla-2');
        tabla2.appendChild(crearFilaTabla('Cadena', establecimiento));

        if (mostrarDatosCampania) {
            tabla2.appendChild(crearFilaTabla('Responsable de Tienda', responsable));
            tabla2.appendChild(crearFilaTabla('Coordinador Asignado', coordinador));
            tabla2.appendChild(crearFilaTabla('Capitán', capitan));
            tabla2.appendChild(crearFilaTabla('Número de cajas', numCajas));
            tabla2.appendChild(crearFilaTabla(`Participa (${nombreCampania})`, participa));
        } else {
            // Si el admin entró sin pinchar ninguna campaña concreta, se avisa para no confundirlo
            const trInfo = document.createElement('tr');
            const tdInfo = document.createElement('td');
            tdInfo.colSpan = 2;
            tdInfo.className = 'celda-aviso';
            tdInfo.innerHTML = 'Para ver las asignaciones (Responsable, Capitán, Coordinador, ONG) debes <strong>filtrar por una campaña</strong> en la pantalla anterior.';
            trInfo.appendChild(tdInfo);
            tabla2.appendChild(trInfo);
        }

        divTablas.appendChild(tabla2);
        divTotal.appendChild(divTablas);

        // Botonera de Control
        const divBotones = document.createElement('div');
        divBotones.classList.add('botones-card');
        divBotones.appendChild(crearBotonAccion('Cerrar', 'btn-cerrar', () => { window.location.href = 'tiendas.html'; }));

        if (mostrarDatosCampania && participa === 'Sí' && idCampaniaPintar) {
            const btnTurnos = crearBotonAccion('Turnos', 'btn-turnos', () => {
                window.location.href = `tienda_turnos.html?idTienda=${tienda.id_tienda}&idCampania=${idCampaniaPintar}`;
            });
            divBotones.appendChild(btnTurnos);
        }

        if (puedeEditar) {
            const arrastrarCampania = urlIdCampania ? `&idCampania=${urlIdCampania}` : '';
            divBotones.appendChild(crearBotonAccion('Editar', 'btn-editar', () => {
                window.location.href = `editar_tienda.html?id=${tienda.id_tienda}${arrastrarCampania}`;
            }));
        }

        divTotal.appendChild(divBotones);

        // Vaciamos el spinner y plasmamos el diseño en pantalla
        contenedor.innerHTML = '';
        contenedor.appendChild(divTotal);

    } catch (error) {
        mostrarErrorDOM(`Error del sistema: ${error.message}`);
    }

    // --- Helpers de creación del DOM ---
    function crearFilaTabla(etiqueta, valor) {
        const tr = document.createElement('tr');
        const tdEtiqueta = document.createElement('td'); tdEtiqueta.textContent = etiqueta;
        const tdValor = document.createElement('td'); tdValor.textContent = valor;
        tr.appendChild(tdEtiqueta); tr.appendChild(tdValor);
        return tr;
    }

    function crearBotonAccion(texto, clase, callback) {
        const boton = document.createElement('button'); boton.type = 'button'; boton.classList.add(clase); boton.textContent = texto;
        boton.addEventListener('click', callback);
        return boton;
    }

    function mostrarErrorDOM(mensaje) {
        contenedor.innerHTML = '';
        const divError = document.createElement('div');
        divError.classList.add('total', 'error-panel'); // Usa la nueva clase CSS independiente
        const pError = document.createElement('h2');
        pError.classList.add('mensaje-error');
        pError.textContent = mensaje;
        divError.appendChild(pError);
        contenedor.appendChild(divError);
    }
});