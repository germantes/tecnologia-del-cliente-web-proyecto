document.addEventListener("DOMContentLoaded", iniciarPaginaTurnos);

var CLASE_POPUP_ABIERTO = "abierto";
var CLASE_BODY_POPUP = "popup-abierto";
var SELECTOR_INFO_VOLUNTARIO = ".js-voluntario-info";
var SELECTOR_CERRAR_POPUP = "[data-cerrar-popup]";

async function iniciarPaginaTurnos() {
    puedeVerTurnos();
    configurarPopupVoluntario();

    var parametros = new URLSearchParams(window.location.search);
    var idTienda = parametros.get("idTienda");
    var idCampania = parametros.get("idCampania");

    if (!idTienda || !idCampania) {
        mostrarError("Faltan los parámetros idTienda e idCampania.");
        return;
    }

    try {
        var datos = await fetchTurnosTienda(idTienda, idCampania);

        if (!await puedeVerTiendaTurnos(datos)) {
            mostrarError("No tienes permiso para ver los turnos de esta tienda.");
            return;
        }

        pintarCabecera(datos);
        configurarBotonAnadirTurno(idTienda, idCampania);
        pintarTurnos(datos);
    } catch (error) {
        mostrarError(error.message);
    }
}

function pintarCabecera(datos) {
    var tiendaCampania = datos.tiendaCampania || {};
    var tienda = tiendaCampania.tienda || {};
    var cadena = tienda.cadena || {};
    var cp = tienda.cp || {};
    var responsable = tiendaCampania.responsableTienda || {};

    var nombreTienda = obtenerNombreTienda(cadena);
    var domicilio = tienda.domicilio || "Domicilio no disponible";
    var localidad = cp.localidad || "Localidad no disponible";
    var codigoPostal = cp.cp || "CP no disponible";
    var nombreResponsable = responsable.nombre_completo || "Nombre del Responsable";

    document.getElementById("nombreTienda").textContent = nombreTienda;
    document.getElementById("direccionTienda").textContent = domicilio + " (" + localidad + ", " + codigoPostal + ")";
    document.getElementById("responsableTienda").textContent = "Responsable: " + nombreResponsable;
}

function pintarTurnos(datos) {
    var contenedor = document.getElementById("turnosGrid");
    var turnos = datos.turnosTienda || [];

    contenedor.textContent = "";

    if (turnos.length === 0) {
        contenedor.appendChild(crearMensajeVacio(
            "No hay turnos disponibles",
            "No se han encontrado turnos asociados a esta tienda y campaña."
        ));
        return;
    }

    var fechas = obtenerFechas(turnos);

    for (var i = 0; i < fechas.length; i++) {
        var fecha = fechas[i];
        var turnosDeLaFecha = obtenerTurnosDeFecha(turnos, fecha);
        var tarjetaDia = crearTarjetaDia(fecha, turnosDeLaFecha, datos);
        contenedor.appendChild(tarjetaDia);
    }
}

function obtenerFechas(turnos) {
    var fechas = [];

    for (var i = 0; i < turnos.length; i++) {
        var fecha = turnos[i].fecha;

        if (fecha && fechas.indexOf(fecha) === -1) {
            fechas.push(fecha);
        }
    }

    fechas.sort();
    return fechas;
}

function obtenerTurnosDeFecha(turnos, fecha) {
    var resultado = [];

    for (var i = 0; i < turnos.length; i++) {
        if (turnos[i].fecha === fecha) {
            resultado.push(turnos[i]);
        }
    }

    return resultado;
}

function crearTarjetaDia(fecha, turnosDeLaFecha, datos) {
    var tarjeta = document.createElement("div");
    tarjeta.className = "dia-card";

    var tituloFecha = document.createElement("h3");
    tituloFecha.className = "fecha-turno";
    tituloFecha.textContent = formatearFecha(fecha);
    tarjeta.appendChild(tituloFecha);

    var tarjetaTurnos = document.createElement("div");
    tarjetaTurnos.className = "turno-card turnos-panel";

    for (var i = 0; i < turnosDeLaFecha.length; i++) {
        var bloque = crearBloqueTurno(turnosDeLaFecha[i], datos);
        tarjetaTurnos.appendChild(bloque);
    }

    tarjeta.appendChild(tarjetaTurnos);
    return tarjeta;
}

function crearBloqueTurno(turno, datos) {
    var bloque = document.createElement("div");
    bloque.className = "bloque-turno";

    var titulo = document.createElement("h3");
    titulo.className = "titulo-turno";
    titulo.textContent = textoTurno(turno.turno);
    bloque.appendChild(titulo);

    var voluntarios = turno.voluntarios || [];

    if (voluntarios.length === 0) {
        bloque.appendChild(crearFilaSinVoluntarios());
    } else {
        for (var i = 0; i < voluntarios.length; i++) {
            bloque.appendChild(crearFilaVoluntario(voluntarios[i]));
        }
    }

    bloque.appendChild(crearAccionesTurno(turno, datos));
    return bloque;
}

function crearFilaVoluntario(voluntario) {
    var fila = document.createElement("div");
    fila.className = "fila-voluntario";

    var nombre = document.createElement("span");
    nombre.textContent = nombreVoluntario(voluntario);

    var enlace = document.createElement("a");
    enlace.className = "link-info js-voluntario-info";
    enlace.href = "/api/info_voluntario?idVoluntario=" + encodeURIComponent(voluntario.id_voluntario || "");
    enlace.textContent = "+info";
    enlace.dataset.idVoluntario = voluntario.id_voluntario || "";

    fila.appendChild(nombre);
    fila.appendChild(enlace);
    return fila;
}

function crearFilaSinVoluntarios() {
    var fila = document.createElement("div");
    fila.className = "fila-voluntario sin-voluntarios";

    var texto = document.createElement("span");
    texto.textContent = "Sin voluntarios";
    fila.appendChild(texto);

    return fila;
}

function crearAccionesTurno(turno, datos) {
    var acciones = document.createElement("div");
    acciones.className = "acciones-turno";

    var tipoTurno = turno.turno || "";
    var idTurno = turno.id_turno || "";
    var idEntidad = turno.id_entidad || "";
    var idTienda = datos.idTienda;
    var idCampania = datos.idCampania;
    var puedeEditarVoluntarios = puedeEditarVoluntariosEnTiendaTurnos(datos);

    if (puedeEditarVoluntarios) {
        var enlaceEditar = document.createElement("a");
        enlaceEditar.className = "turnos-btn turnos-btn--small";
        enlaceEditar.href = "/html/turno_editar.html?idTienda=" + encodeURIComponent(idTienda)
            + "&idCampania=" + encodeURIComponent(idCampania)
            + "&idTurno=" + encodeURIComponent(idTurno)
            + "&turno=" + encodeURIComponent(tipoTurno)
            + "&idEntidad=" + encodeURIComponent(idEntidad);
        enlaceEditar.textContent = "Editar";
        acciones.appendChild(enlaceEditar);
    }

    var enlaceObservaciones = document.createElement("a");
    enlaceObservaciones.className = "turnos-btn turnos-btn--small";
    enlaceObservaciones.href = "/html/turno_observaciones.html?idTienda=" + encodeURIComponent(idTienda)
        + "&idCampania=" + encodeURIComponent(idCampania)
        + "&idTurno=" + encodeURIComponent(turno.id_turno || "");
    enlaceObservaciones.textContent = "Observaciones";

    acciones.appendChild(enlaceObservaciones);

    return acciones;
}

function crearMensajeVacio(titulo, mensaje) {
    var caja = document.createElement("div");
    caja.className = "turnos-vacio turnos-empty turnos-panel";

    var h3 = document.createElement("h3");
    h3.textContent = titulo;

    var p = document.createElement("p");
    p.textContent = mensaje;

    caja.appendChild(h3);
    caja.appendChild(p);

    return caja;
}

function mostrarError(mensaje) {
    var contenedor = document.getElementById("turnosGrid");
    contenedor.textContent = "";
    contenedor.appendChild(crearMensajeVacio("Error al cargar turnos", mensaje));
}

function formatearFecha(fecha) {
    var partes = String(fecha).split("-");

    if (partes.length !== 3) {
        return fecha;
    }

    return partes[2] + "/" + partes[1] + "/" + partes[0];
}

function textoTurno(turno) {
    var texto = String(turno || "").toLowerCase();

    if (texto === "manana") {
        return "Mañana";
    }

    if (texto === "tarde") {
        return "Tarde";
    }

    return turno || "Turno";
}

function obtenerNombreTienda(cadena) {
    var establecimiento = cadena.establecimiento || "";
    var nombreParticular = cadena.nombre_particular || "";

    return establecimiento + " - " + nombreParticular;
}

function nombreVoluntario(voluntario) {
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

function configurarBotonAnadirTurno(idTienda, idCampania) {
    var contenedor = document.getElementById("turnosAcciones");
    var botonExistente = document.getElementById("botonAnadirTurno");
    var esAdministrador = obtenerPerfilTurnos() === ROL_ADMINISTRADOR;

    if (!contenedor) {
        return;
    }

    if (!esAdministrador) {
        contenedor.hidden = true;
        return;
    }

    if (botonExistente) {
        botonExistente.remove();
    }

    var boton = document.createElement("a");
    boton.className = "turnos-btn turnos-btn--add";
    boton.id = "botonAnadirTurno";
    boton.textContent = "Modificar Turnos";
    boton.href = "/turnos_modificar?idTienda=" + encodeURIComponent(idTienda)
        + "&idCampania=" + encodeURIComponent(idCampania);
    contenedor.appendChild(boton);

    contenedor.hidden = false;
}

function configurarPopupVoluntario() {
    var contenedor = document.querySelector("#turnosGrid");
    var popup = document.querySelector("#popupVoluntario");

    if (!contenedor || !popup) {
        return;
    }

    contenedor.addEventListener("click", manejarClickInfoVoluntario);
    popup.addEventListener("click", manejarCierrePopup);
    document.addEventListener("keydown", manejarTeclaPopup);
}

function manejarClickInfoVoluntario(evento) {
    var enlace = evento.target.closest(SELECTOR_INFO_VOLUNTARIO);

    if (!enlace) {
        return;
    }

    evento.preventDefault();

    var idVoluntario = enlace.dataset.idVoluntario || obtenerIdVoluntarioDesdeHref(enlace.getAttribute("href"));

    abrirPopupVoluntario();
    mostrarPopupCargando();

    if (!idVoluntario) {
        mostrarPopupError("No se pudo identificar al voluntario.");
        return;
    }

    cargarInfoVoluntario(idVoluntario);
}

function manejarCierrePopup(evento) {
    if (!evento.target.matches(SELECTOR_CERRAR_POPUP)) {
        return;
    }

    cerrarPopupVoluntario();
}

function manejarTeclaPopup(evento) {
    if (evento.key !== "Escape") {
        return;
    }

    if (popupEstaAbierto()) {
        cerrarPopupVoluntario();
    }
}

function popupEstaAbierto() {
    var popup = document.querySelector("#popupVoluntario");

    return popup ? popup.classList.contains(CLASE_POPUP_ABIERTO) : false;
}

function abrirPopupVoluntario() {
    var popup = document.querySelector("#popupVoluntario");

    if (!popup) {
        return;
    }

    popup.classList.add(CLASE_POPUP_ABIERTO);
    popup.setAttribute("aria-hidden", "false");
    document.body.classList.add(CLASE_BODY_POPUP);
}

function cerrarPopupVoluntario() {
    var popup = document.querySelector("#popupVoluntario");

    if (!popup) {
        return;
    }

    popup.classList.remove(CLASE_POPUP_ABIERTO);
    popup.setAttribute("aria-hidden", "true");
    document.body.classList.remove(CLASE_BODY_POPUP);
}

async function cargarInfoVoluntario(idVoluntario) {
    try {
        var datos = await fetchInfoVoluntario(idVoluntario);
        pintarPopupVoluntario(datos);
    } catch (error) {
        mostrarPopupError(error.message);
    }
}

function pintarPopupVoluntario(datos) {
    var tabla = document.querySelector("#popupVoluntarioTabla");
    var error = document.querySelector("#popupVoluntarioError");

    if (!tabla || !error) {
        return;
    }

    var info = normalizarInfoVoluntario(datos);

    tabla.textContent = "";
    error.hidden = true;

    tabla.appendChild(crearFilaPopup("Nombre", info.nombre));
    tabla.appendChild(crearFilaPopup("Apellido 1", info.apellido1));
    tabla.appendChild(crearFilaPopup("Apellido 2", info.apellido2));
    tabla.appendChild(crearFilaPopup("Email", info.email));
    tabla.appendChild(crearFilaPopup("Entidad asociada", info.entidad));
}

function mostrarPopupCargando() {
    var tabla = document.querySelector("#popupVoluntarioTabla");
    var error = document.querySelector("#popupVoluntarioError");

    if (!tabla || !error) {
        return;
    }

    tabla.textContent = "";
    error.hidden = true;
    tabla.appendChild(crearFilaPopup("Estado", "Cargando..."));
}

function mostrarPopupError(mensaje) {
    var tabla = document.querySelector("#popupVoluntarioTabla");
    var error = document.querySelector("#popupVoluntarioError");

    if (!tabla || !error) {
        return;
    }

    tabla.textContent = "";
    error.textContent = mensaje;
    error.hidden = false;
}

function crearFilaPopup(etiqueta, valor) {
    var fila = document.createElement("tr");
    var celdaEtiqueta = document.createElement("th");
    var celdaValor = document.createElement("td");

    celdaEtiqueta.textContent = etiqueta;
    celdaValor.textContent = valor;

    fila.appendChild(celdaEtiqueta);
    fila.appendChild(celdaValor);

    return fila;
}

function normalizarInfoVoluntario(datos) {
    var voluntario = datos.voluntario || datos.info || datos;
    var entidad = datos.entidad || voluntario.entidad || {};

    return {
        nombre: textoSeguro(voluntario.nombre),
        apellido1: textoSeguro(voluntario.apellido_1),
        apellido2: textoSeguro(voluntario.apellido_2),
        email: textoSeguro(voluntario.email || voluntario.correo),
        entidad: textoSeguro(entidad.nombre || entidad.nombre_entidad || voluntario.entidad_asociada)
    };
}

function textoSeguro(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return "-";
    }

    return String(valor);
}

function obtenerIdVoluntarioDesdeHref(href) {
    if (!href) {
        return "";
    }

    var partes = href.split("?");

    if (partes.length < 2) {
        return "";
    }

    var parametros = new URLSearchParams(partes[1]);

    return parametros.get("idVoluntario") || "";
}
