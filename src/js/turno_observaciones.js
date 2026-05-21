var datosObservaciones = {
    idTienda: "",
    idCampania: "",
    idTurno: ""
};

document.addEventListener("DOMContentLoaded", iniciarPaginaObservaciones);

async function iniciarPaginaObservaciones() {
    leerParametrosObservaciones();
    prepararEnlacesObservaciones();

    if (!datosObservaciones.idTienda || !datosObservaciones.idCampania || !datosObservaciones.idTurno) {
        pintarMensajeObservaciones("Faltan parámetros para cargar las observaciones.");
        return;
    }

    await cargarObservaciones();
}

function leerParametrosObservaciones() {
    var parametros = new URLSearchParams(window.location.search);

    datosObservaciones.idTienda = parametros.get("idTienda") || "";
    datosObservaciones.idCampania = parametros.get("idCampania") || "";
    datosObservaciones.idTurno = parametros.get("idTurno") || "";
}

function prepararEnlacesObservaciones() {
    document.getElementById("enlaceEditarObservaciones").href = "/turno_observaciones_editar?idTienda="
        + encodeURIComponent(datosObservaciones.idTienda)
        + "&idCampania=" + encodeURIComponent(datosObservaciones.idCampania)
        + "&idTurno=" + encodeURIComponent(datosObservaciones.idTurno);

    document.getElementById("enlaceCerrarObservaciones").href = "/tienda_turnos?idTienda="
        + encodeURIComponent(datosObservaciones.idTienda)
        + "&idCampania=" + encodeURIComponent(datosObservaciones.idCampania);
}

async function cargarObservaciones() {
    try {
        var datos = await fetchDatosObservaciones(
            datosObservaciones.idTienda,
            datosObservaciones.idCampania,
            datosObservaciones.idTurno
        );
        var tienda = await fetchTiendaObservaciones(datosObservaciones.idTienda);

        pintarCabeceraObservaciones(tienda, datos);
        pintarTextoObservaciones(datos.turno.observaciones || "");
    } catch (error) {
        pintarMensajeObservaciones(error.message);
    }
}

function pintarCabeceraObservaciones(tienda, datos) {
    var cadena = tienda.cadena || {};

    document.getElementById("nombreTienda").textContent = obtenerNombreTiendaObservaciones(cadena);
    document.getElementById("fechaTurno").textContent = formatearFechaObservaciones(datos.fecha);
    document.getElementById("textoTurno").textContent = "Turno: " + textoTurnoObservaciones(datos.turno.turno);
}

function pintarTextoObservaciones(observaciones) {
    var panel = document.getElementById("observacionesPanel");
    panel.textContent = "";

    if (!observaciones) {
        pintarMensajeObservaciones("No hay observaciones registradas para este turno.");
        return;
    }

    var texto = document.createElement("div");
    texto.className = "observaciones-texto";
    texto.textContent = observaciones;

    panel.appendChild(texto);
}

function pintarMensajeObservaciones(mensaje) {
    var panel = document.getElementById("observacionesPanel");
    var parrafo = document.createElement("p");

    panel.textContent = "";
    parrafo.className = "observaciones-vacio";
    parrafo.textContent = mensaje;
    panel.appendChild(parrafo);
}

function obtenerNombreTiendaObservaciones(cadena) {
    var establecimiento = cadena.establecimiento || "";
    var nombreParticular = cadena.nombre_particular || "";

    return establecimiento + " - " + nombreParticular;
}

function formatearFechaObservaciones(fecha) {
    var partes = String(fecha || "").split("-");

    if (partes.length !== 3) {
        return fecha || "dd/mm/aaaa";
    }

    return partes[2] + "/" + partes[1] + "/" + partes[0];
}

function textoTurnoObservaciones(turno) {
    var texto = String(turno || "").toLowerCase();

    if (texto === "manana") {
        return "mañana";
    }

    if (texto === "tarde") {
        return "tarde";
    }

    return turno || "";
}
