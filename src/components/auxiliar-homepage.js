import { getAuthHeaders, getUsuario } from './session.js'

const API_BASE =
  typeof window !== 'undefined' && window.API_URL
    ? window.API_URL
    : 'http://localhost:3000'

function crearUrlApi(ruta) {
  if (ruta.startsWith('http://') || ruta.startsWith('https://')) {
    return ruta
  }

  return `${API_BASE}${ruta}`
}

function convertirANumero(valor) {
  if (valor === undefined || valor === null || valor === '') {
    return null
  }

  const numero = Number(valor)

  if (Number.isNaN(numero)) {
    return null
  }

  return numero
}

function obtenerCampo(objeto, nombresCampos) {
  if (!objeto) {
    return null
  }

  for (const campo of nombresCampos) {
    if (objeto[campo] !== undefined && objeto[campo] !== null) {
      return objeto[campo]
    }
  }

  return null
}

function crearUrl(base, parametros = {}) {
  const urlParams = new URLSearchParams()

  Object.entries(parametros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') {
      urlParams.set(clave, valor)
    }
  })

  const queryString = urlParams.toString()

  if (!queryString) {
    return base
  }

  return `${base}?${queryString}`
}

async function apiGet(ruta) {
  const respuesta = await fetch(crearUrlApi(ruta), {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!respuesta.ok) {
    throw new Error(`Error al cargar ${ruta}`)
  }

  return await respuesta.json()
}

function normalizarLista(respuesta) {
  if (Array.isArray(respuesta)) {
    return respuesta
  }

  if (Array.isArray(respuesta?.data)) {
    return respuesta.data
  }

  if (Array.isArray(respuesta?.rows)) {
    return respuesta.rows
  }

  if (Array.isArray(respuesta?.result)) {
    return respuesta.result
  }

  return []
}

function sonMismoId(valorA, valorB) {
  if (
    valorA === undefined ||
    valorA === null ||
    valorB === undefined ||
    valorB === null
  ) {
    return false
  }

  return String(valorA) === String(valorB)
}

function getIdUsuarioActual() {
  const usuario = getUsuario()

  const idUsuario = obtenerCampo(usuario, [
    'id_usuario',
    'idUsuario',
    'id',
  ])

  return convertirANumero(idUsuario)
}

function obtenerIdEntidadDeObjeto(entidad) {
  const idEntidad = obtenerCampo(entidad, [
    'id_entidad',
    'idEntidad',
    'id',
  ])

  return convertirANumero(idEntidad)
}

async function getIdEntidadPorIdUsuario(idUsuario) {
  const idUsuarioNumero = convertirANumero(idUsuario)

  if (!idUsuarioNumero) {
    return null
  }

  const url = crearUrl('/api/entidades', {
    id_usuario_contacto: idUsuarioNumero,
  })

  const respuesta = await apiGet(url)
  const entidades = normalizarLista(respuesta)

  if (entidades.length === 0) {
    return null
  }

  const entidad = entidades.find((entidad) => {
    return sonMismoId(entidad.id_usuario_contacto, idUsuarioNumero)
  })

  return obtenerIdEntidadDeObjeto(entidad || entidades[0])
}

async function getIdEntidadUsuarioActual() {
  const usuario = getUsuario()

  if (!usuario) {
    return null
  }

  const idEntidadGuardado = obtenerCampo(usuario, [
    'id_entidad'
  ])

  if (idEntidadGuardado) {
    return convertirANumero(idEntidadGuardado)
  }

  const idUsuario = getIdUsuarioActual()

  return await getIdEntidadPorIdUsuario(idUsuario)
}

function parseFechaLocal(fecha) {
  if (!fecha) {
    return null
  }

  if (typeof fecha === 'string' && fecha.includes('-')) {
    const [anio, mes, dia] = fecha.split('-').map(Number)
    return new Date(anio, mes - 1, dia)
  }

  return new Date(fecha)
}

function formatearRangoFechas(fechaInicio, fechaFin) {
  const inicio = parseFechaLocal(fechaInicio)
  const fin = parseFechaLocal(fechaFin)

  if (
    !inicio ||
    !fin ||
    Number.isNaN(inicio.getTime()) ||
    Number.isNaN(fin.getTime())
  ) {
    return ''
  }

  const meses = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ]

  const diaInicio = inicio.getDate()
  const diaFin = fin.getDate()
  const mesInicio = meses[inicio.getMonth()]
  const mesFin = meses[fin.getMonth()]

  if (
    inicio.getMonth() === fin.getMonth() &&
    inicio.getFullYear() === fin.getFullYear()
  ) {
    return `${diaInicio} - ${diaFin} ${mesFin}`
  }

  return `${diaInicio} ${mesInicio} - ${diaFin} ${mesFin}`
}

function calcularPorcentaje(parte, total) {
  if (!total || total <= 0) {
    return 0
  }

  const porcentaje = (parte / total) * 100

  if (porcentaje < 0) {
    return 0
  }

  if (porcentaje > 100) {
    return 100
  }

  return Math.round(porcentaje)
}

function calcularPorcentajeTiempoTranscurrido(fechaInicio, fechaFin) {
  const inicio = parseFechaLocal(fechaInicio)
  const fin = parseFechaLocal(fechaFin)

  if (
    !inicio ||
    !fin ||
    Number.isNaN(inicio.getTime()) ||
    Number.isNaN(fin.getTime())
  ) {
    return 0
  }

  fin.setHours(23, 59, 59, 999)

  const ahora = new Date()
  const duracionTotal = fin.getTime() - inicio.getTime()
  const tiempoTranscurrido = ahora.getTime() - inicio.getTime()

  if (duracionTotal <= 0) {
    return 0
  }

  return calcularPorcentaje(tiempoTranscurrido, duracionTotal)
}

function esCampaniaActiva(campania) {
  const fechaInicio = obtenerCampo(campania, [
    'fecha_inicio',
    'fechaInicio',
  ])

  const fechaFin = obtenerCampo(campania, [
    'fecha_fin',
    'fechaFin',
  ])

  if (!fechaInicio || !fechaFin) {
    return false
  }

  const hoy = new Date()
  const inicio = parseFechaLocal(fechaInicio)
  const fin = parseFechaLocal(fechaFin)

  if (!inicio || !fin) {
    return false
  }

  fin.setHours(23, 59, 59, 999)

  return hoy >= inicio && hoy <= fin
}

async function getCampaniaActiva() {
  const respuesta = await apiGet('/api/campanias')
  const campanias = normalizarLista(respuesta)

  if (campanias.length === 0) {
    return null
  }

  return campanias.find(esCampaniaActiva) || null
}

async function getIdCampaniaActiva() {
  const campaniaActiva = await getCampaniaActiva()

  if (!campaniaActiva) {
    return null
  }

  const idCampania = obtenerCampo(campaniaActiva, [
    'id_campania',
    'idCampania',
    'id',
  ])

  return convertirANumero(idCampania)
}

async function getCampaniaPorId(idCampania) {
  const idCampaniaNumero = convertirANumero(idCampania)

  if (!idCampaniaNumero) {
    return null
  }

  const respuesta = await apiGet('/api/campanias')
  const campanias = normalizarLista(respuesta)

  return (
    campanias.find((campania) => {
      const id = obtenerCampo(campania, [
        'id_campania',
        'idCampania',
        'id',
      ])

      return sonMismoId(id, idCampaniaNumero)
    }) || null
  )
}

async function getTiendasDeCampania(idCampania) {
  const tiendas = await apiGet(
    crearUrl('/api/tiendas', {
      idCampania,
    })
  )

  return normalizarLista(tiendas)
}

async function getNumeroTotalTiendasRegistradas() {
  const respuesta = await apiGet('/tiendas')
  const tiendas = normalizarLista(respuesta)

  const idsTiendas = new Set(
    tiendas
      .map(getIdTienda)
      .filter((idTienda) => idTienda !== undefined && idTienda !== null)
      .map(String)
  )

  return idsTiendas.size
}

function getIdCampaniaDeRelacion(relacion) {
  return obtenerCampo(relacion, [
    'id_campania',
    'idCampania',
  ])
}

function getIdTienda(tienda) {
  return obtenerCampo(tienda, [
    'id_tienda',
    'idTienda',
    'id',
  ])
}

function getRelacionCampaniaTienda(tienda, idCampania) {
  const relaciones = normalizarLista(
    obtenerCampo(tienda, [
      'tienda_campania',
      'tiendaCampania',
    ])
  )

  return (
    relaciones.find((relacion) => {
      return sonMismoId(getIdCampaniaDeRelacion(relacion), idCampania)
    }) || null
  )
}

function tiendaParticipaEnCampania(tienda, idCampania) {
  const relacion = getRelacionCampaniaTienda(tienda, idCampania)

  if (!relacion) {
    return false
  }

  const participa = obtenerCampo(relacion, [
    'participa',
  ])

  return (
    participa === true ||
    participa === 'true' ||
    participa === 1 ||
    participa === '1'
  )
}

async function getResumenCampaniaPorId(idCampania) {
  const idCampaniaNumero = convertirANumero(idCampania)

  if (!idCampaniaNumero) {
    return null
  }

  const [campania, tiendas, numeroTiendasTotales] = await Promise.all([
    getCampaniaPorId(idCampaniaNumero),
    getTiendasDeCampania(idCampaniaNumero),
    getNumeroTotalTiendasRegistradas(),
  ])

  if (!campania) {
    return null
  }

  const fechaInicio = obtenerCampo(campania, [
    'fecha_inicio',
    'fechaInicio',
  ])

  const fechaFin = obtenerCampo(campania, [
    'fecha_fin',
    'fechaFin',
  ])

  const tiendasParticipantes = tiendas.filter((tienda) => {
    return tiendaParticipaEnCampania(tienda, idCampaniaNumero)
  })

  const idsTiendasParticipantes = new Set(
    tiendasParticipantes
      .map(getIdTienda)
      .filter((idTienda) => idTienda !== undefined && idTienda !== null)
      .map(String)
  )

  return {
    nombre: obtenerCampo(campania, [
      'nombre',
    ]),
    fechas: formatearRangoFechas(fechaInicio, fechaFin),
    numeroTiendasParticipan: idsTiendasParticipantes.size,
    numeroTiendasTotales,
    porcentajeTiendasParticipan: calcularPorcentaje(
      idsTiendasParticipantes.size,
      numeroTiendasTotales
    ),
    porcentajeTiempoTranscurrido: calcularPorcentajeTiempoTranscurrido(
      fechaInicio,
      fechaFin
    ),
  }
}

async function getResumenCampaniaActiva() {
  const idCampaniaActiva = await getIdCampaniaActiva()

  if (!idCampaniaActiva) {
    return null
  }

  return await getResumenCampaniaPorId(idCampaniaActiva)
}

async function getAccesosRapidosPorRol(rol) {
  const idUsuario = getIdUsuarioActual()
  const idCampaniaActiva = await getIdCampaniaActiva()

  if (rol === 'ADMINISTRADOR') {
    return [
      { texto: 'Campañas', enlace: '/html/campanias.html' },
      { texto: 'Tiendas', enlace: '/html/tiendas.html' },
      { texto: 'Entidades', enlace: '/html/entidades.html' },
      { texto: 'Voluntarios', enlace: '/html/voluntarios.html' },
    ]
  }

  if (rol === 'CAPITAN') {
    return [
      {
        texto: 'Zonas',
        enlace: crearUrl('/html/zonas.html', {
          idCampania: idCampaniaActiva,
          idUsuario,
        }),
      },
      {
        texto: 'Tiendas',
        enlace: crearUrl('/html/tiendas.html', {
          idCampania: idCampaniaActiva,
          idUsuario,
        }),
      },
    ]
  }

  if (rol === 'COORDINADOR') {
    return [
      {
        texto: 'Zonas',
        enlace: crearUrl('/html/zonas.html', {
          idCampania: idCampaniaActiva,
          idUsuario,
        }),
      },
      {
        texto: 'Tiendas',
        enlace: crearUrl('/html/tiendas.html', {
          idCampania: idCampaniaActiva,
          idUsuario,
        }),
      },
    ]
  }

  if (rol === 'RESPONSABLE-ENTIDAD') {
    const idEntidad = await getIdEntidadUsuarioActual()

    return [
      {
        texto: 'Mi entidad',
        enlace: idEntidad
          ? crearUrl('/html/edit.html', {
              type: 'entidades',
              id: idEntidad,
            })
          : '/html/entidades.html',
      },
      {
        texto: 'Voluntarios',
        enlace: idEntidad
          ? crearUrl('/html/voluntarios.html', {
              idEntidad,
            })
          : '/html/voluntarios.html',
      },
      {
        texto: 'Tiendas',
        enlace: crearUrl('/html/tiendas.html', {
          idCampania: idCampaniaActiva,
          idEntidad,
        }),
      },
    ]
  }

  if (rol === 'RESPONSABLE-TIENDA') {
    return [
      {
        texto: 'Mis tiendas',
        enlace: crearUrl('/html/tiendas.html', {
          idCampania: idCampaniaActiva,
          idResponsableTienda: idUsuario,
        }),
      },
    ]
  }

  return [
    { texto: 'Inicio', enlace: '/homepage' },
    { texto: 'Perfil', enlace: '/html/perfil.html' },
  ]
}

export {
  convertirANumero,
  crearUrl,
  getIdUsuarioActual,
  getIdEntidadPorIdUsuario,
  getIdEntidadUsuarioActual,
  getCampaniaActiva,
  getIdCampaniaActiva,
  getAccesosRapidosPorRol,
  getResumenCampaniaPorId,
  getResumenCampaniaActiva,
}