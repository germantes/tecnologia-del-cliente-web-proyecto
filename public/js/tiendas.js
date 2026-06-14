/**
 * Lógica principal del Dashboard de Tiendas (Vanilla JS).
 * Se encarga de evaluar el rol del usuario, adaptar la interfaz y llamar
 * a la API REST para pintar el grid de tiendas.
 */
document.addEventListener('DOMContentLoaded', async () => {

    const rolUsuario = typeof getPerfil === 'function' ? getPerfil() : sessionStorage.getItem('perfil');
    const token = sessionStorage.getItem('token');

    if (!rolUsuario || !token) {
        window.location.href = '/html/index.html';
        return;
    }

    const API_BASE = window.API_URL || "http://localhost:3000";

    const tiendasContainer = document.getElementById('tiendasContainer');
    const adminFilters = document.getElementById('adminFilters');
    const selectZona = document.getElementById('selectZona');
    const selectCampania = document.getElementById('selectCampania');
    const tituloVista = document.getElementById('tituloVista');

    let campaniasGlobal = [];
    let idCampaniaActiva = null;

    await cargarCampanias();
    configurarInterfazPorRol();
    await cargarTiendas();

    async function configurarInterfazPorRol() {
        if (rolUsuario === 'ADMINISTRADOR') {
            adminFilters.style.display = 'flex';
            document.getElementById('adminAcciones').style.display = 'block';

            document.getElementById('btnCrearTienda').addEventListener('click', () => {
                window.location.href = '/html/crear_tienda.html';
            });

            await cargarFiltrosZona();

            selectCampania.addEventListener('change', cargarTiendas);
            selectZona.addEventListener('change', cargarTiendas);

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

    async function cargarCampanias() {
        try {
            const res = await fetch(`${API_BASE}/api/campanias`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                campaniasGlobal = await res.json();
                const hoy = new Date();

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

                if (rolUsuario === 'ADMINISTRADOR' && selectCampania) {
                    limpiarContenedor(selectCampania);
                    const optVacia = document.createElement('option');
                    optVacia.value = "0";
                    optVacia.textContent = "Todas las campañas";
                    selectCampania.appendChild(optVacia);

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

    async function cargarTiendas() {
        mostrarMensajeCarga();

        try {
            let url = '/api/tiendas';
            let idCampaniaBuscada = null;

            if (rolUsuario === 'ADMINISTRADOR') {
                const zonaId = selectZona.value;
                const campaniaId = selectCampania.value;
                url += `?idZona=${zonaId}&idCampania=${campaniaId}`;
                idCampaniaBuscada = (campaniaId && campaniaId !== "0") ? parseInt(campaniaId) : null;
            }

            const response = await fetch(`${API_BASE}${url}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error al obtener los datos del servidor.');

            const tiendas = await response.json();
            limpiarContenedor(tiendasContainer);

            if (tiendas.length === 0) {
                mostrarMensaje('No hay tiendas para mostrar con los filtros actuales.', 'alert-info');
                return;
            }

            tiendas.sort((a, b) => a.id_tienda - b.id_tienda);

            tiendas.forEach(tienda => {
                construirTarjetaTienda(tienda, idCampaniaBuscada);
            });

        } catch (error) {
            limpiarContenedor(tiendasContainer);
            mostrarMensaje(error.message, 'alert-error');
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
        } catch (error) {
            console.error("Error al cargar las zonas:", error);
        }
    }

    function construirTarjetaTienda(tienda, idCampaniaBuscada) {
        const card = document.createElement('div');
        card.classList.add('tienda-card');

        const establecimiento = tienda.cadena ? tienda.cadena.establecimiento : 'Sin cadena';
        const localidad = tienda.cp ? tienda.cp.localidad : 'N/A';

        let participaTexto = "No";
        let idCampaniaPintar = null;

        if (tienda.tienda_campania && tienda.tienda_campania.length > 0) {
            let relacion = null;
            if (idCampaniaBuscada && idCampaniaBuscada > 0) {
                relacion = tienda.tienda_campania.find(tc => tc.id_campania === parseInt(idCampaniaBuscada));
            } else if (idCampaniaActiva) {
                relacion = tienda.tienda_campania.find(tc => tc.id_campania === idCampaniaActiva);
            }
            if (!relacion) relacion = tienda.tienda_campania[0];

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

        const mostrarContextoCampania = (rolUsuario !== 'ADMINISTRADOR') || (idCampaniaBuscada && idCampaniaBuscada > 0);

        if (mostrarContextoCampania) {
            card.appendChild(crearParrafoDato('Participa: ', participaTexto));
        }

        const divBotones = document.createElement('div');
        divBotones.classList.add('botones-card');

        let contextoURL = idCampaniaBuscada ? `&idCampania=${idCampaniaBuscada}` : '';

        if (rolUsuario === 'ADMINISTRADOR') {
            divBotones.appendChild(crearBoton('Editar', 'btn-editar', `/html/editar_tienda.html?id=${tienda.id_tienda}${contextoURL}`));
        }

        let verificarBotonTurnos = false;
        if (rolUsuario === 'ADMINISTRADOR') {
            verificarBotonTurnos = (participaTexto === 'Sí' && idCampaniaBuscada !== null && parseInt(idCampaniaBuscada) === idCampaniaActiva);
        } else {
            verificarBotonTurnos = (participaTexto === 'Sí' && idCampaniaPintar === idCampaniaActiva);
        }

        if (verificarBotonTurnos) {
            const btnTurnos = document.createElement('button');
            btnTurnos.textContent = 'Turnos';
            btnTurnos.className = 'btn-turnos';
            btnTurnos.onclick = () => {
                window.location.href = `/html/tienda_turnos.html?idTienda=${tienda.id_tienda}&idCampania=${idCampaniaActiva}`;
            };
            divBotones.appendChild(btnTurnos);
        }

        divBotones.appendChild(crearBoton('+Info', 'btn-info', `/html/info_tienda.html?id=${tienda.id_tienda}${contextoURL}`));

        card.appendChild(divBotones);
        tiendasContainer.appendChild(card);
    }

    function crearParrafoDato(etiqueta, valor) {
        const p = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = etiqueta;
        p.appendChild(strong);
        p.appendChild(document.createTextNode(valor));
        return p;
    }

    // Al crear el botón, la URL que entra ya trae el "/html/" absoluto
    function crearBoton(texto, clase, url) {
        const boton = document.createElement('button');
        boton.textContent = texto;
        boton.classList.add(clase);
        boton.addEventListener('click', () => { window.location.href = url; });
        return boton;
    }

    function limpiarContenedor(contenedor) {
        while (contenedor.firstChild) contenedor.removeChild(contenedor.firstChild);
    }

    function mostrarMensajeCarga() {
        limpiarContenedor(tiendasContainer);
        const loadingDiv = document.createElement('div');
        loadingDiv.classList.add('loading-placeholder');
        loadingDiv.style.gridColumn = '1/-1';
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
        divMsj.textContent = mensaje;
        tiendasContainer.appendChild(divMsj);
    }
});