var datosPagina = {
    idTienda: "",
    idCampania: "",
    idTurno: "",
    turno: "",
    idEntidad: "",
    voluntariosEntidad: [],
    idsSeleccionados: []
};

document.addEventListener("DOMContentLoaded", iniciarPaginaEditarTurno);

async function iniciarPaginaEditarTurno() {
    leerParametrosUrl();
    rellenarCamposOcultos();
    prepararEventos();

    var puedeEditarVoluntarios = await puedeEditarVoluntariosPaginaTurnos(
        datosPagina.idTienda,
        datosPagina.idCampania
    );

    if (!puedeEditarVoluntarios) {
        window.location.href = "/html/tienda_turnos.html?idTienda="
            + encodeURIComponent(datosPagina.idTienda)
            + "&idCampania=" + encodeURIComponent(datosPagina.idCampania);
        return;
    }

    if (!datosPagina.idTienda || !datosPagina.idCampania || !datosPagina.idTurno) {
        mostrarMensaje("Faltan parámetros para editar el turno.");
        pintarMensajeTabla("No se pueden cargar voluntarios porque faltan parámetros.");
        return;
    }

    pintarMensajeTabla("Cargando voluntarios...");
    await cargarDatosIniciales();
}

function leerParametrosUrl() {
    var parametros = new URLSearchParams(window.location.search);

    datosPagina.idTienda = parametros.get("idTienda") || "";
    datosPagina.idCampania = parametros.get("idCampania") || "";
    datosPagina.idTurno = parametros.get("idTurno") || "";
    datosPagina.turno = parametros.get("turno") || "";
    datosPagina.idEntidad = parametros.get("idEntidad") || "";
}

function prepararEventos() {
    document.getElementById("volverTurnos").href = "/html/tienda_turnos.html?idTienda="
        + encodeURIComponent(datosPagina.idTienda)
        + "&idCampania=" + encodeURIComponent(datosPagina.idCampania);

    document.getElementById("formTurnoVoluntarios").addEventListener("submit", guardarFormulario);
    document.getElementById("botonBuscar").addEventListener("click", cargarListasVoluntarios);

    document.getElementById("busquedaVoluntario").addEventListener("keydown", function (evento) {
        if (evento.key === "Enter") {
            evento.preventDefault();
            cargarListasVoluntarios();
        }
    });
}

async function cargarDatosIniciales() {
    try {
        var turnoActual = await fetchTurnoActual();

        if (!turnoActual) {
            mostrarMensaje("No se encontró el turno seleccionado.");
            pintarMensajeTabla("No se encontró el turno seleccionado.");
            return;
        }

        if (!datosPagina.idEntidad) {
            datosPagina.idEntidad = obtenerIdEntidadResponsable(turnoActual);
            rellenarCamposOcultos();
        }

        var tienda = await fetchTiendaActual();
        pintarCabecera(tienda, turnoActual);

        await cargarListasVoluntarios();
    } catch (error) {
        mostrarMensaje(error.message);
        pintarMensajeTabla("No se pudieron cargar los voluntarios.");
    }
}

async function cargarListasVoluntarios() {
    try {
        if (!datosPagina.idEntidad) {
            mostrarMensaje("No hay entidad responsable para cargar voluntarios.");
            pintarMensajeTabla("No hay entidad responsable para cargar voluntarios.");
            return;
        }

        var respuestaVoluntarios = await fetchVoluntariosEntidad();
        datosPagina.voluntariosEntidad = respuestaVoluntarios.voluntarios || [];

        if (respuestaVoluntarios.nombreEntidad) {
            document.getElementById("nombreEntidad").textContent = respuestaVoluntarios.nombreEntidad;
        }

        var respuestaAsociados = await fetchVoluntariosAsociadosTurno();
        datosPagina.idsSeleccionados = obtenerIdsSeleccionados(respuestaAsociados);

        pintarFilasVoluntarios(datosPagina.voluntariosEntidad);
        mostrarMensaje("");
    } catch (error) {
        mostrarMensaje(error.message);
        pintarMensajeTabla("No se pudieron cargar los voluntarios.");
    }
}

async function guardarFormulario(evento) {
    evento.preventDefault();
    actualizarSeleccionadosDesdeTabla();

    try {
        await guardarVoluntariosSeleccionados();

        window.location.href = "/html/tienda_turnos.html?idTienda="
            + encodeURIComponent(datosPagina.idTienda)
            + "&idCampania=" + encodeURIComponent(datosPagina.idCampania);
    } catch (error) {
        mostrarMensaje(error.message);
    }
}

async function fetchTurnoActual() {
    return await fetchJson("/api/turnos/" + encodeURIComponent(datosPagina.idTurno));
}

async function fetchTiendaActual() {
    return await fetchJson("/api/tiendas/" + encodeURIComponent(datosPagina.idTienda));
}

async function fetchVoluntariosEntidad() {
    var busqueda = document.getElementById("busquedaVoluntario").value || "";
    var parametros = new URLSearchParams();

    parametros.set("idEntidad", datosPagina.idEntidad);

    if (busqueda) {
        parametros.set("busqueda", busqueda);
    }

    return await fetchJson("/api/voluntarios_entidad?" + parametros.toString());
}

async function fetchVoluntariosAsociadosTurno() {
    var parametros = new URLSearchParams();

    parametros.set("idTienda", datosPagina.idTienda);
    parametros.set("idCampania", datosPagina.idCampania);
    parametros.set("idTurno", datosPagina.idTurno);

    if (datosPagina.turno) {
        parametros.set("turno", datosPagina.turno);
    }

    return await fetchJson("/api/turno_voluntarios?" + parametros.toString());
}

async function guardarVoluntariosSeleccionados() {
    return await fetchJson("/api/turno_guardar_voluntarios", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            idTienda: datosPagina.idTienda,
            idCampania: datosPagina.idCampania,
            idTurno: datosPagina.idTurno,
            idEntidad: datosPagina.idEntidad,
            voluntariosSeleccionados: datosPagina.idsSeleccionados
        })
    });
}

function pintarCabecera(tienda, turnoActual) {
    tienda = tienda || {};
    turnoActual = turnoActual || {};

    var cadena = tienda.cadena || {};

    document.getElementById("nombreTienda").textContent = obtenerNombreTienda(cadena);
    document.getElementById("fechaTurno").textContent = formatearFecha(turnoActual.fecha);
    document.getElementById("tituloTurno").textContent = "Turno: " + textoTurno(turnoActual.turno);
}

function pintarFilasVoluntarios(voluntarios) {
    var tabla = document.getElementById("tablaVoluntarios");
    tabla.textContent = "";

    if (!voluntarios || voluntarios.length === 0) {
        pintarMensajeTabla("No hay voluntarios para esta entidad.");
        return;
    }

    for (var i = 0; i < voluntarios.length; i++) {
        tabla.appendChild(crearFilaVoluntario(voluntarios[i]));
    }
}

function pintarMensajeTabla(mensaje) {
    var tabla = document.getElementById("tablaVoluntarios");
    tabla.textContent = "";

    var fila = document.createElement("tr");
    var celda = document.createElement("td");

    celda.colSpan = 2;
    celda.className = "sin-resultados turnos-empty";
    celda.textContent = mensaje;

    fila.appendChild(celda);
    tabla.appendChild(fila);
}

function crearFilaVoluntario(voluntario) {
    var fila = document.createElement("tr");
    var celdaParticipa = document.createElement("td");
    var celdaNombre = document.createElement("td");
    var idVoluntario = obtenerIdVoluntario(voluntario);
    var check = document.createElement("input");

    check.type = "checkbox";
    check.name = "voluntariosSeleccionados";
    check.value = idVoluntario;
    check.checked = estaSeleccionado(idVoluntario);

    celdaParticipa.appendChild(check);
    celdaNombre.textContent = crearNombreCompleto(voluntario);

    fila.appendChild(celdaParticipa);
    fila.appendChild(celdaNombre);

    return fila;
}

function actualizarSeleccionadosDesdeTabla() {
    var checks = document.querySelectorAll("input[name='voluntariosSeleccionados']");
    var ids = [];

    for (var i = 0; i < checks.length; i++) {
        if (checks[i].checked) {
            ids.push(String(checks[i].value));
        }
    }

    datosPagina.idsSeleccionados = ids;
}

function obtenerIdsSeleccionados(respuestaAsociados) {
    var ids = respuestaAsociados.idsVoluntariosSeleccionados || [];

    return convertirIdsAString(ids);
}

function convertirIdsAString(ids) {
    var resultado = [];

    for (var i = 0; i < ids.length; i++) {
        var id = String(ids[i] || "");

        if (id && resultado.indexOf(id) === -1) {
            resultado.push(id);
        }
    }

    return resultado;
}

function estaSeleccionado(idVoluntario) {
    return datosPagina.idsSeleccionados.indexOf(String(idVoluntario || "")) !== -1;
}

function obtenerIdEntidadResponsable(turno) {
    if (!turno) {
        return "";
    }

    return turno.id_entidad || "";
}

function obtenerIdVoluntario(voluntario) {
    return String(voluntario.id_voluntario || "");
}

function crearNombreCompleto(voluntario) {
    var partes = [];

    if (voluntario.nombre) {
        partes.push(voluntario.nombre);
    }

    if (voluntario.apellido_1) {
        partes.push(voluntario.apellido_1);
    }

    if (voluntario.apellido_2) {
        partes.push(voluntario.apellido_2);
    }

    if (partes.length === 0) {
        return "Sin nombre";
    }

    return partes.join(" ");
}

function rellenarCamposOcultos() {
    document.getElementById("campoIdTienda").value = datosPagina.idTienda || "";
    document.getElementById("campoIdCampania").value = datosPagina.idCampania || "";
    document.getElementById("campoIdTurno").value = datosPagina.idTurno || "";
    document.getElementById("campoIdEntidad").value = datosPagina.idEntidad || "";
}

function mostrarMensaje(mensaje) {
    document.getElementById("mensajeEstado").textContent = mensaje;
}

function formatearFecha(fecha) {
    var partes = String(fecha || "").split("-");

    if (partes.length !== 3) {
        return fecha || "Fecha";
    }

    return partes[2] + "/" + partes[1] + "/" + partes[0];
}

function textoTurno(turno) {
    var texto = String(turno || "").toLowerCase();

    if (texto === "manana") {
        return "mañana";
    }

    if (texto === "tarde") {
        return "tarde";
    }

    return turno || "Turno";
}

function obtenerNombreTienda(cadena) {
    cadena = cadena || {};

    var establecimiento = cadena.establecimiento || "";
    var nombreParticular = cadena.nombre_particular || "";

    return establecimiento + " - " + nombreParticular;
}

async function fetchJson(ruta, opciones) {
    opciones = opciones || {};
    opciones.headers = crearHeadersAutorizacionTurnos(opciones.headers || {});

    var respuesta = await fetch(crearUrlApi(ruta), opciones);
    var texto = await respuesta.text();
    var datos = {};

    try {
        datos = texto ? JSON.parse(texto) : {};
    } catch (error) {
        datos = {};
    }

    if (!respuesta.ok) {
        throw new Error(datos.message || datos.error || "Error en la petición al servidor.");
    }

    return datos;
}

function crearUrlApi(ruta) {
    var apiUrl = window.API_URL || "";

    if (apiUrl.endsWith("/") && ruta.charAt(0) === "/") {
        return apiUrl.substring(0, apiUrl.length - 1) + ruta;
    }

    return apiUrl + ruta;
}
