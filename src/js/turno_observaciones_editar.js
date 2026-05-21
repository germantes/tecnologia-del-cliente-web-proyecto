var datosEditarObservaciones = {
    idTienda: "",
    idCampania: "",
    idTurno: ""
};

document.addEventListener("DOMContentLoaded", iniciarPaginaEditarObservaciones);

async function iniciarPaginaEditarObservaciones() {
    leerParametrosEditarObservaciones();
    rellenarCamposOcultosObservaciones();
    prepararEventosEditarObservaciones();

    var puedeEditarObservaciones = await puedeEditarObservacionesPaginaTurnos(
        datosEditarObservaciones.idTienda,
        datosEditarObservaciones.idCampania
    );

    if (!puedeEditarObservaciones) {
        window.location.href = "/html/turno_observaciones.html?idTienda="
            + encodeURIComponent(datosEditarObservaciones.idTienda)
            + "&idCampania=" + encodeURIComponent(datosEditarObservaciones.idCampania)
            + "&idTurno=" + encodeURIComponent(datosEditarObservaciones.idTurno);
        return;
    }

    if (!datosEditarObservaciones.idTienda || !datosEditarObservaciones.idCampania || !datosEditarObservaciones.idTurno) {
        mostrarMensajeEditarObservaciones("Faltan parámetros para editar las observaciones.");
        return;
    }

    await cargarDatosEditarObservaciones();
}

function leerParametrosEditarObservaciones() {
    var parametros = new URLSearchParams(window.location.search);

    datosEditarObservaciones.idTienda = parametros.get("idTienda") || "";
    datosEditarObservaciones.idCampania = parametros.get("idCampania") || "";
    datosEditarObservaciones.idTurno = parametros.get("idTurno") || "";
}

function rellenarCamposOcultosObservaciones() {
    document.getElementById("campoIdTienda").value = datosEditarObservaciones.idTienda;
    document.getElementById("campoIdCampania").value = datosEditarObservaciones.idCampania;
    document.getElementById("campoIdTurno").value = datosEditarObservaciones.idTurno;
}

function prepararEventosEditarObservaciones() {
    document.getElementById("formObservaciones").addEventListener("submit", guardarFormularioObservaciones);

    document.getElementById("enlaceCancelarObservaciones").href = "/html/turno_observaciones.html?idTienda="
        + encodeURIComponent(datosEditarObservaciones.idTienda)
        + "&idCampania=" + encodeURIComponent(datosEditarObservaciones.idCampania)
        + "&idTurno=" + encodeURIComponent(datosEditarObservaciones.idTurno);
}

async function cargarDatosEditarObservaciones() {
    try {
        var datos = await fetchDatosObservaciones(
            datosEditarObservaciones.idTienda,
            datosEditarObservaciones.idCampania,
            datosEditarObservaciones.idTurno
        );
        var tienda = await fetchTiendaObservaciones(datosEditarObservaciones.idTienda);

        pintarCabeceraEditarObservaciones(tienda, datos);
        document.getElementById("campoObservaciones").value = datos.turno.observaciones || "";
    } catch (error) {
        mostrarMensajeEditarObservaciones(error.message);
    }
}

async function guardarFormularioObservaciones(evento) {
    evento.preventDefault();

    try {
        await guardarObservacionesTurno(
            datosEditarObservaciones.idTienda,
            datosEditarObservaciones.idCampania,
            datosEditarObservaciones.idTurno,
            document.getElementById("campoObservaciones").value
        );

        window.location.href = "/html/turno_observaciones.html?idTienda="
            + encodeURIComponent(datosEditarObservaciones.idTienda)
            + "&idCampania=" + encodeURIComponent(datosEditarObservaciones.idCampania)
            + "&idTurno=" + encodeURIComponent(datosEditarObservaciones.idTurno);
    } catch (error) {
        mostrarMensajeEditarObservaciones(error.message);
    }
}

function pintarCabeceraEditarObservaciones(tienda, datos) {
    var cadena = tienda.cadena || {};

    document.getElementById("nombreTienda").textContent = obtenerNombreTiendaEditarObservaciones(cadena);
    document.getElementById("fechaTurno").textContent = formatearFechaEditarObservaciones(datos.fecha);
    document.getElementById("textoTurno").textContent = "Turno: " + textoTurnoEditarObservaciones(datos.turno.turno);
}

function mostrarMensajeEditarObservaciones(mensaje) {
    document.getElementById("mensajeEstado").textContent = mensaje;
}

function obtenerNombreTiendaEditarObservaciones(cadena) {
    var establecimiento = cadena.establecimiento || "";
    var nombreParticular = cadena.nombre_particular || "";

    return establecimiento + " - " + nombreParticular;
}

function formatearFechaEditarObservaciones(fecha) {
    var partes = String(fecha || "").split("-");

    if (partes.length !== 3) {
        return fecha || "dd/mm/aaaa";
    }

    return partes[2] + "/" + partes[1] + "/" + partes[0];
}

function textoTurnoEditarObservaciones(turno) {
    var texto = String(turno || "").toLowerCase();

    if (texto === "manana") {
        return "mañana";
    }

    if (texto === "tarde") {
        return "tarde";
    }

    return turno || "";
}
