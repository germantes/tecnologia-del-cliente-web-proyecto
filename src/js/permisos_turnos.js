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
