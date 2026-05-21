var datosPagina = {
    idTienda: "",
    idCampania: "",
    idTurno: "",
    turno: "",
    idEntidad: "",
    idsSeleccionados: []
};

document.addEventListener("DOMContentLoaded", iniciarPaginaEditarTurno);

async function iniciarPaginaEditarTurno() {
    var parametros = new URLSearchParams(window.location.search);
    datosPagina.idTienda = parametros.get("idTienda");
    datosPagina.idCampania = parametros.get("idCampania");
    datosPagina.idTurno = parametros.get("idTurno");
    datosPagina.turno = parametros.get("turno");
    datosPagina.idEntidad = parametros.get("idEntidad");

    rellenarCamposOcultos();

    if (!datosPagina.idTienda || !datosPagina.idCampania || !datosPagina.idTurno) {
        mostrarMensaje("Faltan parámetros para editar el turno.");
        return;
    }

    document.getElementById("volverTurnos").href = "/tienda_turnos?idTienda="
        + encodeURIComponent(datosPagina.idTienda)
        + "&idCampania=" + encodeURIComponent(datosPagina.idCampania);

    document.getElementById("formTurnoVoluntarios").addEventListener("submit", guardarFormulario);
    document.getElementById("botonBuscar").addEventListener("click", buscarVoluntarios);

    await cargarDatosIniciales();
}

async function cargarDatosIniciales() {
    try {
        var datosTurnos = await fetchTurnosTiendaParaEditar(datosPagina.idTienda, datosPagina.idCampania);
        var turnoActual = buscarTurnoActual(datosTurnos.turnosTienda || []);

        if (!turnoActual) {
            mostrarMensaje("No se encontró el turno seleccionado.");
            return;
        }

        if (!datosPagina.idEntidad) {
            datosPagina.idEntidad = turnoActual.id_entidad || turnoActual.idEntidad || "";
            rellenarCamposOcultos();
        }

        datosPagina.idsSeleccionados = obtenerIdsVoluntarios(turnoActual.voluntarios || []);

        pintarCabecera(datosTurnos, turnoActual);
        await cargarVoluntarios("");
    } catch (error) {
        mostrarMensaje(error.message);
    }
}

async function buscarVoluntarios() {
    var texto = document.getElementById("busquedaVoluntario").value;
    await cargarVoluntarios(texto);
}

async function cargarVoluntarios(busqueda) {
    try {
        if (!datosPagina.idEntidad) {
            mostrarMensaje("El turno no tiene entidad asociada.");
            pintarTablaVoluntarios([]);
            return;
        }

        var respuesta = await fetchVoluntariosDeEntidad(datosPagina.idEntidad, busqueda);

        if (respuesta.nombreEntidad) {
            document.getElementById("nombreEntidad").textContent = respuesta.nombreEntidad;
        }

        pintarTablaVoluntarios(respuesta.voluntarios || []);
        mostrarMensaje("");
    } catch (error) {
        mostrarMensaje(error.message);
    }
}

function buscarTurnoActual(turnos) {
    for (var i = 0; i < turnos.length; i++) {
        var idTurno = turnos[i].id_turno || turnos[i].idTurno;

        if (String(idTurno) === String(datosPagina.idTurno)) {
            return turnos[i];
        }
    }

    return null;
}

function obtenerIdsVoluntarios(voluntarios) {
    var ids = [];

    for (var i = 0; i < voluntarios.length; i++) {
        var id = voluntarios[i].id_voluntario || voluntarios[i].idVoluntario || voluntarios[i].id;

        if (id) {
            ids.push(String(id));
        }
    }

    return ids;
}

function pintarCabecera(datosTurnos, turnoActual) {
    var tiendaCampania = datosTurnos.tiendaCampania || {};
    var tienda = tiendaCampania.tienda || {};
    var cadena = tienda.cadena || {};

    document.getElementById("nombreTienda").textContent = obtenerNombreTienda(cadena);
    document.getElementById("fechaTurno").textContent = formatearFecha(turnoActual.fecha);
    document.getElementById("tituloTurno").textContent = "Turno: " + textoTurno(turnoActual.turno || turnoActual.tipo_turno || datosPagina.turno);
}

function pintarTablaVoluntarios(voluntarios) {
    var tabla = document.getElementById("tablaVoluntarios");
    tabla.textContent = "";

    if (voluntarios.length === 0) {
        var filaVacia = document.createElement("tr");
        var celdaVacia = document.createElement("td");
        celdaVacia.colSpan = 2;
        celdaVacia.textContent = "No hay voluntarios disponibles para esta entidad.";
        filaVacia.appendChild(celdaVacia);
        tabla.appendChild(filaVacia);
        return;
    }

    for (var i = 0; i < voluntarios.length; i++) {
        tabla.appendChild(crearFilaVoluntario(voluntarios[i]));
    }
}

function crearFilaVoluntario(voluntario) {
    var idVoluntario = String(voluntario.id_voluntario || voluntario.idVoluntario || voluntario.id);
    var fila = document.createElement("tr");

    var celdaCheck = document.createElement("td");
    celdaCheck.className = "celda-participa";

    var check = document.createElement("input");
    check.type = "checkbox";
    check.name = "voluntariosSeleccionados";
    check.value = idVoluntario;
    check.checked = estaSeleccionado(idVoluntario);

    celdaCheck.appendChild(check);

    var celdaNombre = document.createElement("td");
    celdaNombre.className = "celda-nombre";
    celdaNombre.textContent = nombreVoluntario(voluntario);

    fila.appendChild(celdaCheck);
    fila.appendChild(celdaNombre);

    return fila;
}

function estaSeleccionado(idVoluntario) {
    for (var i = 0; i < datosPagina.idsSeleccionados.length; i++) {
        if (String(datosPagina.idsSeleccionados[i]) === String(idVoluntario)) {
            return true;
        }
    }

    return false;
}

async function guardarFormulario(evento) {
    evento.preventDefault();

    var checks = document.querySelectorAll("input[name='voluntariosSeleccionados']:checked");
    var ids = [];

    for (var i = 0; i < checks.length; i++) {
        ids.push(checks[i].value);
    }

    try {
        await guardarVoluntariosTurno(datosPagina.idTienda, datosPagina.idCampania, datosPagina.idTurno, ids);
        window.location.href = "/tienda_turnos?idTienda="
            + encodeURIComponent(datosPagina.idTienda)
            + "&idCampania=" + encodeURIComponent(datosPagina.idCampania);
    } catch (error) {
        mostrarMensaje(error.message);
    }
}

function rellenarCamposOcultos() {
    document.getElementById("campoIdTienda").value = datosPagina.idTienda || "";
    document.getElementById("campoIdCampania").value = datosPagina.idCampania || "";
    document.getElementById("campoIdTurno").value = datosPagina.idTurno || "";
    document.getElementById("campoIdEntidad").value = datosPagina.idEntidad || "";
}

function mostrarMensaje(mensaje) {
    document.getElementById("mensajeEstado").textContent = mensaje;
}

function formatearFecha(fecha) {
    var partes = String(fecha || "").split("-");

    if (partes.length !== 3) {
        return fecha || "Fecha";
    }

    return partes[2] + "/" + partes[1] + "/" + partes[0];
}

function textoTurno(turno) {
    var texto = String(turno || "").toLowerCase();

    if (texto === "manana") {
        return "mañana";
    }

    if (texto === "tarde") {
        return "tarde";
    }

    return turno || "Turno";
}

function obtenerNombreTienda(cadena) {
    var establecimiento = cadena.establecimiento || "";
    var nombreParticular = cadena.nombre_particular || "";

    if (establecimiento && nombreParticular) {
        return establecimiento + " - " + nombreParticular;
    }

    if (establecimiento) {
        return establecimiento;
    }

    if (nombreParticular) {
        return nombreParticular;
    }

    return "Nombre tienda";
}

function nombreVoluntario(voluntario) {
    if (voluntario.nombre_completo) {
        return voluntario.nombre_completo;
    }

    if (voluntario.nombreCompleto) {
        return voluntario.nombreCompleto;
    }

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
