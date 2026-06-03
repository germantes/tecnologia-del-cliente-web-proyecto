async function fetchDatosObservaciones(idTienda, idCampania, idTurno) {
    var parametros = new URLSearchParams();

    parametros.set("idTienda", idTienda);
    parametros.set("idCampania", idCampania);
    parametros.set("idTurno", idTurno);

    return await fetchJsonObservaciones("/api/turno_observaciones?" + parametros.toString());
}

async function fetchTiendaObservaciones(idTienda) {
    return await fetchJsonObservaciones("/api/tiendas/" + encodeURIComponent(idTienda));
}

async function guardarObservacionesTurno(idTienda, idCampania, idTurno, observaciones) {
    return await fetchJsonObservaciones("/api/turno_observaciones_guardar", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            idTienda: idTienda,
            idCampania: idCampania,
            idTurno: idTurno,
            observaciones: observaciones
        })
    });
}

async function fetchJsonObservaciones(ruta, opciones) {
    opciones = opciones || {};
    opciones.headers = crearHeadersAutorizacionTurnos(opciones.headers || {});

    var respuesta = await fetch(crearUrlObservaciones(ruta), opciones);
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

function crearUrlObservaciones(ruta) {
    var apiUrl = window.API_URL || "";

    if (apiUrl.endsWith("/") && ruta.charAt(0) === "/") {
        return apiUrl.substring(0, apiUrl.length - 1) + ruta;
    }

    return apiUrl + ruta;
}
