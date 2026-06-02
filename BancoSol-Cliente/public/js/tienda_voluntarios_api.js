function obtenerApiBaseVoluntarios() {
    return window.API_URL || "https://cliente-backend.onrender.com";
}

async function fetchVoluntariosDeEntidad(idEntidad, busqueda) {
    var apiBase = obtenerApiBaseVoluntarios();
    var url = apiBase + "/api/voluntarios_entidad"
        + "?idEntidad=" + encodeURIComponent(idEntidad);

    if (busqueda) {
        url = url + "&busqueda=" + encodeURIComponent(busqueda);
    }

    var respuesta = await fetch(url);
    var datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(datos.message || "Error al cargar voluntarios.");
    }

    return datos;
}

async function fetchTurnoPorId(idTurno) {
    var apiBase = obtenerApiBaseVoluntarios();
    var url = apiBase + "/api/turnos/" + encodeURIComponent(idTurno);

    return fetchJsonTurno(url);
}

async function fetchTiendaPorId(idTienda) {
    var apiBase = obtenerApiBaseVoluntarios();
    var url = apiBase + "/api/tiendas/" + encodeURIComponent(idTienda);

    return fetchJsonTurno(url);
}

async function guardarVoluntariosTurno(idTienda, idCampania, idTurno, idsVoluntarios) {
    var apiBase = obtenerApiBaseVoluntarios();
    var url = apiBase + "/api/turno_guardar_voluntarios";

    var respuesta = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            idTienda: idTienda,
            idCampania: idCampania,
            idTurno: idTurno,
            voluntariosSeleccionados: idsVoluntarios
        })
    });

    var datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(datos.message || "No se pudieron guardar los voluntarios.");
    }

    return datos;
}

async function fetchJsonTurno(url) {
    var respuesta = await fetch(url);

    var datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(datos.message || "Error al cargar datos.");
    }

    return datos;
}
