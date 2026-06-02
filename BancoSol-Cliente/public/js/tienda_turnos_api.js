function obtenerApiBaseTurnos() {
    return window.API_URL || "https://cliente-backend.onrender.com";
}

async function fetchTurnosTienda(idTienda, idCampania) {
    var apiBase = obtenerApiBaseTurnos();
    var url = apiBase + "/api/tienda_turnos"
        + "?idTienda=" + encodeURIComponent(idTienda)
        + "&idCampania=" + encodeURIComponent(idCampania);

    var respuesta = await fetch(url, {
        headers: crearHeadersAutorizacionTurnos()
    });

    var datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(datos.message || "No se pudieron cargar los turnos.");
    }

    return datos;
}

async function fetchInfoVoluntario(idVoluntario) {
    var apiBase = obtenerApiBaseTurnos();
    var url = apiBase + "/api/info_voluntario?idVoluntario=" + encodeURIComponent(idVoluntario);

    var respuesta = await fetch(url, {
        headers: crearHeadersAutorizacionTurnos()
    });

    var datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(datos.message || "No se pudo cargar la informacion del voluntario.");
    }

    var voluntario = datos.voluntario || null;
    var entidad = null;

    if (voluntario && voluntario.id_entidad) {
        entidad = await fetchEntidadPorId(voluntario.id_entidad).catch(function () {
            return null;
        });
    }

    return { voluntario: voluntario, entidad: entidad };
}

async function fetchEntidadPorId(idEntidad) {
    var apiBase = obtenerApiBaseTurnos();
    var url = apiBase + "/entidades/" + encodeURIComponent(idEntidad);

    var respuesta = await fetch(url, {
        headers: crearHeadersAutorizacionTurnos()
    });

    var datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(datos.message || "No se pudo cargar la entidad.");
    }

    return datos;
}
