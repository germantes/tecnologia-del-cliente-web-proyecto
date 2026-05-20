async function fetchTurnosTienda(idTienda, idCampania) {
    var apiBase = window.API_URL || "http://localhost:3000";
    var url = apiBase + "/api/tienda_turnos"
        + "?idTienda=" + encodeURIComponent(idTienda)
        + "&idCampania=" + encodeURIComponent(idCampania);

    var respuesta = await fetch(url, {
        headers: {
            "Authorization": "Bearer " + (sessionStorage.getItem("token") || "")
        }
    });

    var datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(datos.message || "No se pudieron cargar los turnos.");
    }

    return datos;
}
