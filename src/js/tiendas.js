document.addEventListener('DOMContentLoaded', async () => {
    const perfil = sessionStorage.getItem('perfil');
    const token = sessionStorage.getItem('token');

    // Redirigimos al inicio si no hay sesión activa
    if (!perfil || !token) {
        window.location.href = 'index.html';
        return;
    }

    const usuarioRol = perfil;
    const API_BASE = window.API_URL || 'http://localhost:3000';

    const tiendasContainer = document.getElementById('tiendasContainer');
    const adminFilters = document.getElementById('adminFilters');
    const selectZona = document.getElementById('selectZona');
    const selectCampania = document.getElementById('selectCampania');
    const selectParticipa = document.getElementById('selectParticipa');
    const tituloVista = document.getElementById('tituloVista');

    let campaniasGlobal = [];
    let idCampaniaActiva = null;

    // Inicializamos la vista cargando campañas y luego las tiendas
    await cargarCampanias();
    configurarInterfazPorRol();
    await cargarTiendas();

    // Adapta los filtros y el título según los permisos del usuario
    async function configurarInterfazPorRol() {
        if (usuarioRol === 'ADMINISTRADOR') {
            adminFilters.style.display = 'flex';
            await cargarFiltrosZona();

            const btnAplicar = document.getElementById('btnAplicar');
            if (btnAplicar) {
                btnAplicar.addEventListener('click', cargarTiendas);
            }

            tituloVista.textContent = 'Tiendas por Zona';
        } else {
            tituloVista.style.fontSize = "1.8rem";
            if (idCampaniaActiva) {
                const activa = campaniasGlobal.find(c => c.id_campania === idCampaniaActiva);
                tituloVista.textContent = `Mis Tiendas Asignadas | ${activa.nombre} (Activa)`;
            } else {
                tituloVista.textContent = `Mis Tiendas Asignadas | Sin campaña activa`;
            }
        }
    }

    // Obtiene las campañas del servidor para determinar cuál está activa
    async function cargarCampanias() {
        try {
            const res = await fetch(`${API_BASE}/api/campanias`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                campaniasGlobal = await res.json();
                const hoy = new Date();

                // Determinamos la campaña activa comparando fechas
                campaniasGlobal.forEach(c => {
                    if (c.fecha_inicio && c.fecha_fin) {
                        const inicio = new Date(c.fecha_inicio);
                        const fin = new Date(c.fecha_fin);
                        fin.setHours(23, 59, 59, 999);
                        if (hoy >= inicio && hoy <= fin) {
                            idCampaniaActiva = c.id_campania;
                        }
                    }
                });

                // Rellenamos el desplegable si el usuario tiene permisos
                if (usuarioRol === 'ADMINISTRADOR' && selectCampania) {
                    campaniasGlobal.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c.id_campania;
                        opt.textContent = c.id_campania === idCampaniaActiva ? `${c.nombre} (Activa)` : c.nombre;
                        selectCampania.appendChild(opt);
                    });
                }
            }
        } catch (error) {
            console.error("Error cargando campañas:", error);
        }
    }

    // Consulta las tiendas al servidor y construye las tarjetas manipulando el DOM
    async function cargarTiendas() {
        mostrarMensajeCarga();

        try {
            let url = '/api/tiendas';
            let idCampaniaBuscada = null;

            // Añadimos parámetros a la URL si es administrador
            if (usuarioRol === 'ADMINISTRADOR') {
                const zonaId = selectZona.value;
                const participa = selectParticipa.value;
                const campaniaId = selectCampania.value;
                url += `?idZona=${zonaId}&participa=${participa}&idCampania=${campaniaId}`;
                idCampaniaBuscada = parseInt(campaniaId);
            }

            const response = await fetch(`${API_BASE}${url}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Error al obtener los datos del servidor.');
            }

            const tiendas = await response.json();
            limpiarContenedor(tiendasContainer);

            if (tiendas.length === 0) {
                mostrarMensaje('No hay tiendas para mostrar con los filtros actuales.', 'alert-info');
                return;
            }

            // Generamos una tarjeta por cada tienda recuperada
            tiendas.forEach(tienda => {
                construirTarjetaTienda(tienda, idCampaniaBuscada);
            });

        } catch (error) {
            limpiarContenedor(tiendasContainer);
            mostrarMensaje(error.message, 'alert-error');
        }
    }

    // Rellena el desplegable de zonas para el administrador
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
        } catch (error) {
            console.error("Error al cargar las zonas:", error);
        }
    }

    // Construye el HTML de una tarjeta de tienda nodo a nodo
    function construirTarjetaTienda(tienda, idCampaniaBuscada) {
        const card = document.createElement('div');
        card.classList.add('tienda-card');

        const establecimiento = tienda.cadena ? tienda.cadena.establecimiento : 'Sin cadena';
        const localidad = tienda.cp ? tienda.cp.localidad : 'N/A';

        let participaTexto = "No";
        let idCampaniaPintar = null;

        // Buscamos la relación de la tienda con la campaña solicitada o activa
        if (tienda.tienda_campania && tienda.tienda_campania.length > 0) {
            let relacion = null;
            if (idCampaniaBuscada && idCampaniaBuscada > 0) {
                relacion = tienda.tienda_campania.find(tc => tc.id_campania === idCampaniaBuscada);
            } else if (idCampaniaActiva) {
                relacion = tienda.tienda_campania.find(tc => tc.id_campania === idCampaniaActiva);
            }

            if (!relacion) {
                relacion = tienda.tienda_campania[0];
            }

            if (relacion) {
                participaTexto = relacion.participa ? "Sí" : "No";
                idCampaniaPintar = relacion.id_campania;
            }
        }

        const titulo = document.createElement('h3');
        titulo.classList.add('titulo-tienda');
        titulo.textContent = `Tienda ${tienda.id_tienda} - ${establecimiento}`;
        card.appendChild(titulo);

        card.appendChild(crearParrafoDato('Cadena: ', establecimiento));
        card.appendChild(crearParrafoDato('Localidad: ', localidad));
        card.appendChild(crearParrafoDato('Domicilio: ', tienda.domicilio || 'N/A'));
        card.appendChild(crearParrafoDato('Participa: ', participaTexto));

        // Construcción de la botonera
        const divBotones = document.createElement('div');
        divBotones.classList.add('botones-card');

        if (usuarioRol === 'ADMINISTRADOR') {
            divBotones.appendChild(crearBoton('editar', 'btn-editar', `editar_tienda.html?id=${tienda.id_tienda}`));
        }

        if (participaTexto === 'Sí' && idCampaniaPintar) {
            divBotones.appendChild(crearBoton('turnos', 'btn-turnos', `tienda_turnos.html?idTienda=${tienda.id_tienda}&idCampania=${idCampaniaPintar}`));
        }

        divBotones.appendChild(crearBoton('+ info', 'btn-info', `info_tienda.html?id=${tienda.id_tienda}`));

        card.appendChild(divBotones);
        tiendasContainer.appendChild(card);
    }

    // Funciones de utilidad para manipulación del DOM
    function crearParrafoDato(etiqueta, valor) {
        const p = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = etiqueta;
        p.appendChild(strong);
        p.appendChild(document.createTextNode(valor));
        return p;
    }

    function crearBoton(texto, clase, url) {
        const boton = document.createElement('button');
        boton.textContent = texto;
        boton.classList.add(clase);
        boton.addEventListener('click', () => {
            window.location.href = url;
        });
        return boton;
    }

    function limpiarContenedor(contenedor) {
        while (contenedor.firstChild) {
            contenedor.removeChild(contenedor.firstChild);
        }
    }

    function mostrarMensajeCarga() {
        limpiarContenedor(tiendasContainer);

        const loadingDiv = document.createElement('div');
        loadingDiv.classList.add('loading');
        loadingDiv.style.gridColumn = '1/-1';
        loadingDiv.style.justifyContent = 'center';

        const spinner = document.createElement('div');
        spinner.classList.add('spinner');

        loadingDiv.appendChild(spinner);
        loadingDiv.appendChild(document.createTextNode(' Cargando tiendas...'));
        tiendasContainer.appendChild(loadingDiv);
    }

    function mostrarMensaje(mensaje, claseAlerta) {
        const divMsj = document.createElement('div');
        divMsj.classList.add('alert', claseAlerta);
        divMsj.style.gridColumn = '1/-1';
        divMsj.style.textAlign = 'center';
        divMsj.textContent = mensaje;
        tiendasContainer.appendChild(divMsj);
    }
});