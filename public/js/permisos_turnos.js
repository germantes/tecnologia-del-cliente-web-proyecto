var ROL_ADMINISTRADOR = "ADMINISTRADOR";
var ROL_COORDINADOR = "COORDINADOR";
var ROL_CAPITAN = "CAPITAN";
var ROL_RESPONSABLE_ENTIDAD = "RESPONSABLE-ENTIDAD";
var ROL_RESPONSABLE_TIENDA = "RESPONSABLE-TIENDA";

function obtenerPerfilTurnos() {
    var perfil = sessionStorage.getItem("perfil");

    if (!perfil) {
        redirigirLoginTurnos();
        return "";
    }

    return perfil;
}

function obtenerUsuarioTurnos() {
    var textoUsuario = sessionStorage.getItem("usuario");

    if (!textoUsuario) {
        redirigirLoginTurnos();
        return {};
    }

    try {
        return JSON.parse(textoUsuario);
    } catch (error) {
        redirigirLoginTurnos();
        return {};
    }
}

function sonIgualesTurnos(valorA, valorB) {
    if (valorA === undefined || valorA === null || valorB === undefined || valorB === null) {
        return false;
    }

    return String(valorA) === String(valorB);
}

function obtenerIdZonaTiendaTurnos(datos) {
    var tiendaCampania = datos.tiendaCampania || {};
    var tienda = tiendaCampania.tienda || {};
    var cp = tienda.cp || {};
    var zona = cp.zona || {};

    return zona.id_zona || "";
}

function obtenerIdsEntidadesTurnos(datos) {
    var turnos = datos.turnosTienda || [];
    var idsEntidades = [];

    for (var i = 0; i < turnos.length; i++) {
        if (turnos[i].id_entidad && idsEntidades.indexOf(turnos[i].id_entidad) === -1) {
            idsEntidades.push(turnos[i].id_entidad);
        }
    }

    return idsEntidades;
}

async function puedeVerTiendaTurnos(datos) {
    var perfil = obtenerPerfilTurnos();
    var usuario = obtenerUsuarioTurnos();

    var esAdministrador = perfil === ROL_ADMINISTRADOR;
    var esCoordinador = perfil === ROL_COORDINADOR;
    var esResponsableTienda = perfil === ROL_RESPONSABLE_TIENDA;
    var esResponsableEntidad = perfil === ROL_RESPONSABLE_ENTIDAD;

    if (esAdministrador) {
        return true;
    }

    if (esCoordinador) {
        return await tiendaPerteneceZonaCoordinadorTurnos(usuario.id, datos)
            || tiendaPerteneceResponsableTurnos(usuario.id, datos);
    }

    if (esResponsableTienda) {
        return tiendaPerteneceResponsableTurnos(usuario.id, datos);
    }

    if (esResponsableEntidad) {
        return await turnoPerteneceEntidadResponsableTurnos(usuario.id, datos);
    }

    return false;
}

async function tiendaPerteneceZonaCoordinadorTurnos(idUsuario, datos) {
    var usuario = await fetchUsuarioPermisosTurnos(idUsuario);
    var cpUsuario = usuario.cp || usuario.id_cp || "";
    var cp = cpUsuario ? await fetchCpPermisosTurnos(cpUsuario) : null;
    var idZonaUsuario = cp ? cp.id_zona : "";
    var idZonaTienda = obtenerIdZonaTiendaTurnos(datos);

    return sonIgualesTurnos(idZonaUsuario, idZonaTienda);
}

function tiendaPerteneceResponsableTurnos(idUsuario, datos) {
    var tiendaCampania = datos.tiendaCampania || {};

    return sonIgualesTurnos(tiendaCampania.id_responsable_tienda, idUsuario);
}

function usuarioEsResponsableTiendaTurnos(datos) {
    var usuario = obtenerUsuarioTurnos();

    return tiendaPerteneceResponsableTurnos(usuario.id, datos);
}

function puedeEditarVoluntariosEnTiendaTurnos(datos) {
    var perfil = obtenerPerfilTurnos();

    if (perfil === ROL_ADMINISTRADOR) {
        return true;
    }

    if (usuarioEsResponsableTiendaTurnos(datos)) {
        return false;
    }

    return perfil === ROL_COORDINADOR
        || perfil === ROL_RESPONSABLE_ENTIDAD;
}

function puedeEditarObservacionesEnTiendaTurnos(datos) {
    var perfil = obtenerPerfilTurnos();

    if (perfil === ROL_ADMINISTRADOR) {
        return true;
    }

    if (usuarioEsResponsableTiendaTurnos(datos)) {
        return false;
    }

    return perfil === ROL_COORDINADOR
        || perfil === ROL_CAPITAN
        || perfil === ROL_RESPONSABLE_ENTIDAD;
}

async function puedeEditarVoluntariosPaginaTurnos(idTienda, idCampania) {
    var datos = await fetchDatosTiendaPermisosTurnos(idTienda, idCampania);

    if (!await puedeVerTiendaTurnos(datos)) {
        return false;
    }

    return puedeEditarVoluntariosEnTiendaTurnos(datos);
}

async function puedeEditarObservacionesPaginaTurnos(idTienda, idCampania) {
    var datos = await fetchDatosTiendaPermisosTurnos(idTienda, idCampania);

    if (!await puedeVerTiendaTurnos(datos)) {
        return false;
    }

    return puedeEditarObservacionesEnTiendaTurnos(datos);
}

async function turnoPerteneceEntidadResponsableTurnos(idUsuario, datos) {
    var entidades = await fetchEntidadesResponsableTurnos(idUsuario);
    var idsEntidadesTurnos = obtenerIdsEntidadesTurnos(datos);

    for (var i = 0; i < entidades.length; i++) {
        for (var j = 0; j < idsEntidadesTurnos.length; j++) {
            if (sonIgualesTurnos(entidades[i].id_entidad, idsEntidadesTurnos[j])) {
                return true;
            }
        }
    }

    return false;
}

async function fetchUsuarioPermisosTurnos(idUsuario) {
    var usuarios = await fetchJsonPermisosTurnos("/usuarios?id_usuario=" + encodeURIComponent(idUsuario));

    return usuarios[0] || {};
}

async function fetchCpPermisosTurnos(cpUsuario) {
    var cps = await fetchJsonPermisosTurnos("/api/cp?cp=" + encodeURIComponent(cpUsuario));

    return cps[0] || null;
}

async function fetchEntidadesResponsableTurnos(idUsuario) {
    var entidades = await fetchJsonPermisosTurnos("/api/entidades?id_usuario_contacto=" + encodeURIComponent(idUsuario));
    var resultado = [];

    for (var i = 0; i < entidades.length; i++) {
        if (sonIgualesTurnos(entidades[i].id_usuario_contacto, idUsuario)) {
            resultado.push(entidades[i]);
        }
    }

    return resultado;
}

async function fetchDatosTiendaPermisosTurnos(idTienda, idCampania) {
    return await fetchJsonPermisosTurnos(
        "/api/tienda_turnos?idTienda=" + encodeURIComponent(idTienda)
        + "&idCampania=" + encodeURIComponent(idCampania)
    );
}

async function fetchJsonPermisosTurnos(ruta) {
    var respuesta = await fetch(crearUrlPermisosTurnos(ruta), {
        headers: crearHeadersAutorizacionTurnos()
    });
    var datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(datos.message || "No se pudieron comprobar los permisos.");
    }

    return datos;
}

function crearUrlPermisosTurnos(ruta) {
    var apiUrl = window.API_URL || "http://localhost:3000";

    if (apiUrl.endsWith("/") && ruta.charAt(0) === "/") {
        return apiUrl.substring(0, apiUrl.length - 1) + ruta;
    }

    return apiUrl + ruta;
}

function puedeEditarVoluntariosTurnos() {
    var perfil = obtenerPerfilTurnos();

    return perfil === ROL_ADMINISTRADOR
        || perfil === ROL_COORDINADOR
        || perfil === ROL_RESPONSABLE_ENTIDAD;
}

function puedeEditarObservacionesTurnos() {
    var perfil = obtenerPerfilTurnos();

    return perfil === ROL_ADMINISTRADOR
        || perfil === ROL_COORDINADOR
        || perfil === ROL_CAPITAN
        || perfil === ROL_RESPONSABLE_ENTIDAD;
}

function puedeVerTurnos() {
    return obtenerPerfilTurnos() !== "";
}

function redirigirLoginTurnos() {
    window.location.href = "/index.html";
}

function crearHeadersAutorizacionTurnos(headers) {
    var resultado = headers || {};
    var token = sessionStorage.getItem("token");

    if (token) {
        resultado.Authorization = "Bearer " + token;
    }

    return resultado;
}

function obtenerRolTokenTurnos() {
    var token = sessionStorage.getItem("token");

    if (!token) {
        return "";
    }

    try {
        var payload = JSON.parse(atob(token));
        return String(payload.puesto || "").toUpperCase();
    } catch (error) {
        return "";
    }
}
