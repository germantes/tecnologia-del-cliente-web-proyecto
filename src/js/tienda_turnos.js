document.addEventListener("DOMContentLoaded", iniciarPaginaTurnos);

async function iniciarPaginaTurnos() {
    var parametros = new URLSearchParams(window.location.search);
    var idTienda = parametros.get("idTienda") || parametros.get("id");
    var idCampania = parametros.get("idCampania");

    if (!idTienda || !idCampania) {
        mostrarError("Faltan los parámetros idTienda e idCampania.");
        return;
    }

    try {
        var datos = await fetchTurnosTienda(idTienda, idCampania);
        pintarCabecera(datos);
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

    var nombreTienda = cadena.nombre_particular || cadena.establecimiento || "Nombre tienda";
    var domicilio = tienda.domicilio || "Domicilio no disponible";
    var localidad = cp.localidad || "Localidad no disponible";
    var codigoPostal = cp.cp || "CP no disponible";
    var nombreResponsable = responsable.nombre_completo || responsable.nombreCompleto || responsable.nombre || "Nombre del Responsable";

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
        var tarjetaDia = crearTarjetaDia(fecha, turnosDeLaFecha, datos.idTienda, datos.idCampania);
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

function crearTarjetaDia(fecha, turnosDeLaFecha, idTienda, idCampania) {
    var tarjeta = document.createElement("div");
    tarjeta.className = "dia-card";

    var tituloFecha = document.createElement("h3");
    tituloFecha.className = "fecha-turno";
    tituloFecha.textContent = formatearFecha(fecha);
    tarjeta.appendChild(tituloFecha);

    var tarjetaTurnos = document.createElement("div");
    tarjetaTurnos.className = "turno-card turnos-panel";

    for (var i = 0; i < turnosDeLaFecha.length; i++) {
        var bloque = crearBloqueTurno(turnosDeLaFecha[i], idTienda, idCampania);
        tarjetaTurnos.appendChild(bloque);
    }

    tarjeta.appendChild(tarjetaTurnos);
    return tarjeta;
}

function crearBloqueTurno(turno, idTienda, idCampania) {
    var bloque = document.createElement("div");
    bloque.className = "bloque-turno";

    var titulo = document.createElement("h3");
    titulo.className = "titulo-turno";
    titulo.textContent = textoTurno(turno.turno || turno.tipo_turno);
    bloque.appendChild(titulo);

    var voluntarios = turno.voluntarios || [];

    if (voluntarios.length === 0) {
        bloque.appendChild(crearFilaSinVoluntarios());
    } else {
        for (var i = 0; i < voluntarios.length; i++) {
            bloque.appendChild(crearFilaVoluntario(voluntarios[i]));
        }
    }

    bloque.appendChild(crearAccionesTurno(turno, idTienda, idCampania));
    return bloque;
}

function crearFilaVoluntario(voluntario) {
    var fila = document.createElement("div");
    fila.className = "fila-voluntario";

    var nombre = document.createElement("span");
    nombre.textContent = nombreVoluntario(voluntario);

    var enlace = document.createElement("a");
    enlace.className = "link-info js-voluntario-info";
    enlace.href = "/api/info_voluntario?idVoluntario=" + encodeURIComponent(voluntario.id_voluntario || voluntario.idVoluntario || voluntario.id || "");
    enlace.textContent = "+info";

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

function crearAccionesTurno(turno, idTienda, idCampania) {
    var acciones = document.createElement("div");
    acciones.className = "acciones-turno";

    var tipoTurno = turno.turno || turno.tipo_turno || "";

    var enlaceEditar = document.createElement("a");
    enlaceEditar.className = "turnos-btn turnos-btn--small";
    enlaceEditar.href = "/turno_editar?idTienda=" + encodeURIComponent(idTienda)
        + "&idCampania=" + encodeURIComponent(idCampania)
        + "&fecha=" + encodeURIComponent(turno.fecha)
        + "&turno=" + encodeURIComponent(tipoTurno);
    enlaceEditar.textContent = "Editar";

    var enlaceObservaciones = document.createElement("a");
    enlaceObservaciones.className = "turnos-btn turnos-btn--small";
    enlaceObservaciones.href = "/turno_observaciones?idTienda=" + encodeURIComponent(idTienda)
        + "&idCampania=" + encodeURIComponent(idCampania)
        + "&idTurno=" + encodeURIComponent(turno.id_turno || turno.idTurno || "");
    enlaceObservaciones.textContent = "Observaciones";

    acciones.appendChild(enlaceEditar);
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
