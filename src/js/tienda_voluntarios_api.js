async function fetchVoluntariosEntidad(idTienda, idCampania, idTurno, busqueda) {
    var apiBase = window.API_URL || "http://localhost:3000";
    var url = apiBase + "/api/tienda_voluntarios"
        + "?idTienda=" + encodeURIComponent(idTienda)
        + "&idCampania=" + encodeURIComponent(idCampania)
        + "&idTurno=" + encodeURIComponent(idTurno)
        + "&busqueda=" + encodeURIComponent(busqueda || "");

    return fetchJsonTurno(url);
}

async function fetchVoluntariosDeEntidad(idEntidad, busqueda) {
    var apiBase = window.API_URL || "http://localhost:3000";
    var url = apiBase + "/api/voluntarios_entidad"
        + "?idEntidad=" + encodeURIComponent(idEntidad)
        + "&busqueda=" + encodeURIComponent(busqueda || "");

    var respuesta = await fetch(url);
    var datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(datos.message || "Error al cargar voluntarios.");
    }

    return datos;
}

async function fetchTurnosTiendaParaEditar(idTienda, idCampania) {
    var apiBase = window.API_URL || "http://localhost:3000";
    var url = apiBase + "/api/tienda_turnos"
        + "?idTienda=" + encodeURIComponent(idTienda)
        + "&idCampania=" + encodeURIComponent(idCampania);

    return fetchJsonTurno(url);
}

async function fetchVoluntariosTurno(idTienda, idCampania, idTurno) {
    var apiBase = window.API_URL || "http://localhost:3000";
    var url = apiBase + "/api/turno_voluntarios"
        + "?idTienda=" + encodeURIComponent(idTienda)
        + "&idCampania=" + encodeURIComponent(idCampania)
        + "&idTurno=" + encodeURIComponent(idTurno);

    return fetchJsonTurno(url);
}

async function guardarVoluntariosTurno(idTienda, idCampania, idTurno, idsVoluntarios) {
    var apiBase = window.API_URL || "http://localhost:3000";
    var url = apiBase + "/api/turno_guardar_voluntarios";

    var respuesta = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + (sessionStorage.getItem("token") || "")
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
    var respuesta = await fetch(url, {
        headers: {
            "Authorization": "Bearer " + (sessionStorage.getItem("token") || "")
        }
    });

    var datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(datos.message || "Error al cargar datos.");
    }

    return datos;
}
