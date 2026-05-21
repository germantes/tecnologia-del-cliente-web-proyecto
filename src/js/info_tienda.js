document.addEventListener('DOMContentLoaded', async () => {
    const perfil = sessionStorage.getItem('perfil');
    const token = sessionStorage.getItem('token');

    // Comprobamos sesión activa
    if (!perfil || !token) {
        window.location.href = 'index.html';
        return;
    }

    const API_BASE = window.API_URL || 'http://localhost:3000';
    const contenedor = document.getElementById('detalleContenedor');
    const params = new URLSearchParams(window.location.search);
    const tiendaId = params.get('id');

    // Validación del parámetro de la URL
    if (!tiendaId) {
        mostrarErrorDOM('Error: No se ha especificado ninguna tienda.');
        return;
    }

    try {
        // Peticiones paralelas para optimizar tiempos de carga
        const [response, usuariosRes, campaniasRes] = await Promise.all([
            fetch(`${API_BASE}/api/tiendas/${tiendaId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/usuarios`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_BASE}/api/campanias`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (!response.ok) {
            throw new Error('Error al obtener la tienda.');
        }

        const tienda = await response.json();
        const listaUsuarios = usuariosRes.ok ? await usuariosRes.json() : [];
        const listaCampanias = campaniasRes.ok ? await campaniasRes.json() : [];

        // Identificamos la campaña activa actualmente
        let idCampaniaActiva = null;
        const hoy = new Date();
        listaCampanias.forEach(c => {
            if (c.fecha_inicio && c.fecha_fin) {
                const inicio = new Date(c.fecha_inicio);
                const fin = new Date(c.fecha_fin);
                fin.setHours(23, 59, 59, 999);
                if (hoy >= inicio && hoy <= fin) {
                    idCampaniaActiva = c.id_campania;
                }
            }
        });

        // Función de utilidad para extraer el nombre real de un usuario
        const getNombreUsuario = (id) => {
            if (!id) return 'N/A';
            const usuario = listaUsuarios.find(u => u.id_usuario == id || u.idUsuario == id);
            return usuario ? (usuario.nombre_completo || usuario.nombreCompleto || id) : id;
        };

        // Variables de localización
        const establecimiento = tienda.cadena ? tienda.cadena.establecimiento : 'Sin cadena';
        const localidad = tienda.cp ? tienda.cp.localidad : 'N/A';
        const cpCod = tienda.cp ? tienda.cp.cp : 'N/A';
        const municipio = tienda.cp ? tienda.cp.municipio : 'N/A';
        const zonaGeografica = (tienda.cp && tienda.cp.zona) ? tienda.cp.zona.zona_geografica : 'N/A';
        const distrito = (tienda.cp && tienda.cp.distrito) ? (tienda.cp.distrito.nombre_distrito || 'N/A') : 'N/A';
        const domicilio = tienda.domicilio || 'N/A';

        // Variables de campaña
        let participa = "No";
        let capitan = "N/A";
        let coordinador = "N/A";
        let responsable = "N/A";
        let numCajas = 0;
        let idCampaniaPintar = null;

        // Buscamos los datos específicos de la campaña activa o la primera disponible
        if (tienda.tienda_campania && tienda.tienda_campania.length > 0) {
            let campaniaInfo = null;

            if (idCampaniaActiva) {
                campaniaInfo = tienda.tienda_campania.find(tc => tc.id_campania === idCampaniaActiva);
            }

            if (!campaniaInfo) {
                campaniaInfo = tienda.tienda_campania[0];
            }

            if (campaniaInfo) {
                participa = campaniaInfo.participa ? "Sí" : "No";
                idCampaniaPintar = campaniaInfo.id_campania;
                capitan = getNombreUsuario(campaniaInfo.id_capitan);
                coordinador = getNombreUsuario(campaniaInfo.id_coordinador);
                responsable = getNombreUsuario(campaniaInfo.id_responsable_tienda);
                numCajas = campaniaInfo.num_cajas || campaniaInfo.numCajas || 0;
            }
        }

        const puedeEditar = (perfil.toUpperCase() === 'ADMINISTRADOR');

        // Construcción del DOM principal
        const divTotal = document.createElement('div');
        divTotal.classList.add('total');

        const header = document.createElement('header');
        const h1 = document.createElement('h1');
        h1.textContent = `Tienda ${tienda.id_tienda} - ${establecimiento}`;
        header.appendChild(h1);
        divTotal.appendChild(header);

        const divTablas = document.createElement('div');
        divTablas.classList.add('tablas');

        // Construcción de la primera tabla (Localización)
        const tabla1 = document.createElement('table');
        tabla1.classList.add('tabla-1');
        tabla1.appendChild(crearFilaTabla('Domicilio', domicilio));
        tabla1.appendChild(crearFilaTabla('Localidad', localidad));
        tabla1.appendChild(crearFilaTabla('Código Postal (CP)', cpCod));
        tabla1.appendChild(crearFilaTabla('Zona Geográfica', zonaGeografica));
        tabla1.appendChild(crearFilaTabla('Distrito', distrito));
        tabla1.appendChild(crearFilaTabla('Municipio', municipio));
        divTablas.appendChild(tabla1);

        // Construcción de la segunda tabla (Participación)
        const tabla2 = document.createElement('table');
        tabla2.classList.add('tabla-2');
        tabla2.appendChild(crearFilaTabla('Cadena', establecimiento));
        tabla2.appendChild(crearFilaTabla('Responsable de Tienda', responsable));
        tabla2.appendChild(crearFilaTabla('Coordinador Asignado', coordinador));
        tabla2.appendChild(crearFilaTabla('Capitán', capitan));
        tabla2.appendChild(crearFilaTabla('Número de cajas', numCajas));
        tabla2.appendChild(crearFilaTabla('Participa', participa));
        divTablas.appendChild(tabla2);

        divTotal.appendChild(divTablas);

        // Construcción de la botonera
        const divBotones = document.createElement('div');
        divBotones.classList.add('botones-card');

        divBotones.appendChild(crearBotonAccion('cerrar', 'btn-cerrar', () => {
            window.location.href = 'tiendas.html';
        }));

        if (participa === 'Sí' && idCampaniaPintar) {
            const btnTurnos = crearBotonAccion('turnos', 'btn-editar', () => {
                window.location.href = `tienda_turnos.html?idTienda=${tienda.id_tienda}&idCampania=${idCampaniaPintar}`;
            });
            btnTurnos.style.backgroundColor = '#17a2b8';
            divBotones.appendChild(btnTurnos);
        }

        if (puedeEditar) {
            divBotones.appendChild(crearBotonAccion('editar', 'btn-editar', () => {
                window.location.href = `editar_tienda.html?id=${tienda.id_tienda}`;
            }));
        }

        divTotal.appendChild(divBotones);
        contenedor.appendChild(divTotal);

    } catch (error) {
        mostrarErrorDOM(`Error: ${error.message}`);
    }

    // Funciones de utilidad para manipular el DOM nodo a nodo
    function crearFilaTabla(etiqueta, valor) {
        const tr = document.createElement('tr');
        const tdEtiqueta = document.createElement('td');
        tdEtiqueta.textContent = etiqueta;
        const tdValor = document.createElement('td');
        tdValor.textContent = valor;
        tr.appendChild(tdEtiqueta);
        tr.appendChild(tdValor);
        return tr;
    }

    function crearBotonAccion(texto, clase, callback) {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.classList.add(clase);
        boton.textContent = texto;
        boton.addEventListener('click', callback);
        return boton;
    }

    function mostrarErrorDOM(mensaje) {
        while (contenedor.firstChild) {
            contenedor.removeChild(contenedor.firstChild);
        }
        const divError = document.createElement('div');
        divError.classList.add('total');
        divError.style.padding = '40px';
        divError.style.textAlign = 'center';

        const pError = document.createElement('p');
        pError.style.color = 'red';
        pError.style.fontWeight = 'bold';
        pError.textContent = mensaje;

        divError.appendChild(pError);
        contenedor.appendChild(divError);
    }
});