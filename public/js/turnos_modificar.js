var datosAnadir = {
    idTienda: "",
    idCampania: "",
    fechaInicio: "",
    fechaFin: "",
    turnosPorDia: {},
    idEntidadBase: ""
};

document.addEventListener("DOMContentLoaded", iniciarPaginaAnadir);

async function iniciarPaginaAnadir() {
    leerParametrosAnadir();
    prepararBotonesAnadir();

    if (!datosAnadir.idTienda || !datosAnadir.idCampania) {
        pintarMensajeTabla("Faltan parámetros para añadir turnos.");
        return;
    }

    if (obtenerPerfilTurnos() !== ROL_ADMINISTRADOR) {
        window.location.href = "/html/tienda_turnos.html?idTienda=" + encodeURIComponent(datosAnadir.idTienda)
            + "&idCampania=" + encodeURIComponent(datosAnadir.idCampania);
        return;
    }

    try {
        await cargarDatosCampania();
        await cargarTurnosTienda();
        pintarTablaDias();
    } catch (error) {
        pintarMensajeTabla(error.message);
    }
}

function leerParametrosAnadir() {
    var parametros = new URLSearchParams(window.location.search);
    datosAnadir.idTienda = parametros.get("idTienda") || "";
    datosAnadir.idCampania = parametros.get("idCampania") || "";
}

function prepararBotonesAnadir() {
    var btnActualizar = document.getElementById("btnActualizarFechas");
    var btnVolver = document.getElementById("btnVolver");

    if (btnActualizar) {
        btnActualizar.addEventListener("click", function () {
            actualizarFechasCampania();
        });
    }

    if (btnVolver) {
        btnVolver.href = "/html/tienda_turnos.html?idTienda=" + encodeURIComponent(datosAnadir.idTienda)
            + "&idCampania=" + encodeURIComponent(datosAnadir.idCampania);
    }
}

async function cargarDatosCampania() {
    var campania = await fetchJsonAnadir("/campanias/" + encodeURIComponent(datosAnadir.idCampania));
    document.getElementById("nombreCampania").textContent = campania.nombre || "Campaña";

    datosAnadir.fechaInicio = campania.fecha_inicio || "";
    datosAnadir.fechaFin = campania.fecha_fin || "";

    document.getElementById("fechaInicio").value = datosAnadir.fechaInicio;
    document.getElementById("fechaFin").value = datosAnadir.fechaFin;
}

async function actualizarFechasCampania() {
    var fechaInicio = document.getElementById("fechaInicio").value;
    var fechaFin = document.getElementById("fechaFin").value;

    if (!fechaInicio || !fechaFin) {
        pintarMensajeTabla("Debes indicar ambas fechas para actualizar la campaña.");
        return;
    }

    try {
        await fetchJsonAnadir("/campanias/" + encodeURIComponent(datosAnadir.idCampania), {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin
            })
        });

        datosAnadir.fechaInicio = fechaInicio;
        datosAnadir.fechaFin = fechaFin;
        pintarTablaDias();
    } catch (error) {
        pintarMensajeTabla(error.message);
    }
}

async function cargarTurnosTienda() {
    var datos = await fetchJsonAnadir(
        "/api/tienda_turnos?idTienda=" + encodeURIComponent(datosAnadir.idTienda)
        + "&idCampania=" + encodeURIComponent(datosAnadir.idCampania)
    );

    var turnos = datos.turnosTienda || [];
    datosAnadir.turnosPorDia = {};
    datosAnadir.idEntidadBase = "";

    for (var i = 0; i < turnos.length; i++) {
        var fecha = turnos[i].fecha;
        if (fecha) {
            datosAnadir.turnosPorDia[fecha] = true;
        }

        if (!datosAnadir.idEntidadBase && turnos[i].id_entidad) {
            datosAnadir.idEntidadBase = turnos[i].id_entidad;
        }
    }
}

function pintarTablaDias() {
    var cuerpo = document.getElementById("tablaDias");
    cuerpo.textContent = "";

    if (!datosAnadir.fechaInicio || !datosAnadir.fechaFin) {
        pintarMensajeTabla("No hay fechas de campaña disponibles.");
        return;
    }

    var dias = obtenerDiasIntervalo(datosAnadir.fechaInicio, datosAnadir.fechaFin);

    if (dias.length === 0) {
        pintarMensajeTabla("El intervalo no tiene días válidos.");
        return;
    }

    for (var i = 0; i < dias.length; i++) {
        cuerpo.appendChild(crearFilaDia(dias[i]));
    }
}

function crearFilaDia(fechaIso) {
    var fila = document.createElement("tr");

    var celdaDia = document.createElement("td");
    celdaDia.textContent = formatearFecha(fechaIso);

    var celdaEstado = document.createElement("td");
    var celdaAccion = document.createElement("td");

    if (datosAnadir.turnosPorDia[fechaIso]) {
        celdaEstado.textContent = "Ya existe";
        celdaEstado.className = "aniadir-estado aniadir-estado--completo";

        if (obtenerPerfilTurnos() === ROL_ADMINISTRADOR) {
            var botonEliminar = document.createElement("button");
            botonEliminar.type = "button";
            botonEliminar.className = "aniadir-btn aniadir-btn--delete";
            botonEliminar.textContent = "Eliminar";
            botonEliminar.addEventListener("click", function () {
                manejarEliminarTurnos(fechaIso, botonEliminar);
            });
            celdaAccion.appendChild(botonEliminar);
        }
    } else {
        celdaEstado.textContent = "Pendiente";
        celdaEstado.className = "aniadir-estado aniadir-estado--pendiente";

        var boton = document.createElement("button");
        boton.type = "button";
        boton.className = "aniadir-btn";
        boton.textContent = "Añadir";
        boton.addEventListener("click", function () {
            manejarAgregarTurnos(fechaIso, boton);
        });

        celdaAccion.appendChild(boton);
    }

    fila.appendChild(celdaDia);
    fila.appendChild(celdaEstado);
    fila.appendChild(celdaAccion);

    return fila;
}

async function manejarAgregarTurnos(fechaIso, boton) {
    boton.disabled = true;
    boton.textContent = "Creando...";

    try {
        await crearTurno(fechaIso, "manana");
        await crearTurno(fechaIso, "tarde");
        datosAnadir.turnosPorDia[fechaIso] = true;
        pintarTablaDias();
    } catch (error) {
        boton.disabled = false;
        boton.textContent = "Añadir";
        alert(error.message);
    }
}

async function manejarEliminarTurnos(fechaIso, boton) {
    var confirmado = window.confirm("¿Estás seguro de eliminar los turnos de este día?");

    if (!confirmado) {
        return;
    }

    boton.disabled = true;
    boton.textContent = "Eliminando...";

    try {
        await borrarTurnosDia(fechaIso);
        delete datosAnadir.turnosPorDia[fechaIso];
        pintarTablaDias();
    } catch (error) {
        boton.disabled = false;
        boton.textContent = "Eliminar";
        alert(error.message);
    }
}

async function crearTurno(fechaIso, tipoTurno) {
    var payload = {
        id_tienda: datosAnadir.idTienda,
        id_campania: datosAnadir.idCampania,
        fecha: fechaIso,
        turno: tipoTurno,
        observaciones: ""
    };

    if (datosAnadir.idEntidadBase) {
        payload.id_entidad = datosAnadir.idEntidadBase;
    }

    return await fetchJsonAnadir("/turnos", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
}

async function borrarTurnosDia(fechaIso) {
    return await fetchJsonAnadir("/api/turno_borrar_dia", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            idTienda: datosAnadir.idTienda,
            idCampania: datosAnadir.idCampania,
            fecha: fechaIso
        })
    });
}

function pintarMensajeTabla(mensaje) {
    var cuerpo = document.getElementById("tablaDias");
    var fila = document.createElement("tr");
    var celda = document.createElement("td");

    cuerpo.textContent = "";
    celda.colSpan = 3;
    celda.className = "aniadir-vacio";
    celda.textContent = mensaje;

    fila.appendChild(celda);
    cuerpo.appendChild(fila);
}

function obtenerDiasIntervalo(inicio, fin) {
    var dias = [];
    var fechaActual = new Date(inicio);
    var fechaFin = new Date(fin);

    if (isNaN(fechaActual.getTime()) || isNaN(fechaFin.getTime())) {
        return dias;
    }

    fechaActual.setHours(0, 0, 0, 0);
    fechaFin.setHours(0, 0, 0, 0);

    while (fechaActual <= fechaFin) {
        dias.push(formatearFechaIso(fechaActual));
        fechaActual.setDate(fechaActual.getDate() + 1);
    }

    return dias;
}

function formatearFechaIso(fecha) {
    var anio = fecha.getFullYear();
    var mes = String(fecha.getMonth() + 1).padStart(2, "0");
    var dia = String(fecha.getDate()).padStart(2, "0");

    return anio + "-" + mes + "-" + dia;
}

function formatearFecha(fechaIso) {
    var partes = String(fechaIso || "").split("-");

    if (partes.length !== 3) {
        return fechaIso;
    }

    return partes[2] + "/" + partes[1] + "/" + partes[0];
}

async function fetchJsonAnadir(ruta, opciones) {
    var respuesta = await fetch(crearUrlAnadir(ruta), prepararOpciones(opciones));
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

function prepararOpciones(opciones) {
    var resultado = opciones || {};
    resultado.headers = crearHeadersAutorizacionTurnos(resultado.headers || {});
    return resultado;
}

function crearUrlAnadir(ruta) {
    var apiUrl = window.API_URL || "http://localhost:3000";

    if (apiUrl.endsWith("/") && ruta.charAt(0) === "/") {
        return apiUrl.substring(0, apiUrl.length - 1) + ruta;
    }

    return apiUrl + ruta;
}
