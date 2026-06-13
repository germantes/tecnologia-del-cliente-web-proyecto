import {getAuthHeaders, estaAutenticado, getId} from './session.js'
import {
  faArrowRight,
  faBuilding,
  faCalendarCheck,
  faCheckCircle,
  faClipboardList,
  faFlagCheckered,
  faShieldHalved,
  faStore,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'

const API_BASE =
  typeof window !== 'undefined' && window.API_URL
    ? window.API_URL
    : 'http://localhost:3000'

const ICONOS_HOME = {
  responsabilidades: faClipboardList,
  permisos: faShieldHalved,
  accesosRapidos: faArrowRight,
  campaniaActiva: faFlagCheckered,
  campaniasActivas: faCalendarCheck,
  tiendasRegistradas: faStore,
  entidadesRegistradas: faBuilding,
  voluntariosRegistrados: faUsers,
  lista: faCheckCircle,
}

function construirUrlApi(ruta) {
  if (ruta.startsWith('http://') || ruta.startsWith('https://')) {
    return ruta
  }

  return `${API_BASE}${ruta}`
}

function construirUrl(base, parametros = {}) {
  const urlParams = new URLSearchParams()

  Object.entries(parametros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') {
      urlParams.set(clave, valor)
    }
  })

  const queryString = urlParams.toString()

  return queryString ? `${base}?${queryString}` : base
}

function convertirANumero(valor) {
  if (valor === undefined || valor === null || valor === '') {
    return null
  }

  const numero = Number(valor)

  return Number.isNaN(numero) ? null : numero
}

function obtenerPrimerValorDisponible(objeto, campos) {
  if (!objeto) {
    return null
  }

  for (const campo of campos) {
    if (objeto[campo] !== undefined && objeto[campo] !== null) {
      return objeto[campo]
    }
  }

  return null
}


function sonMismoIdentificador(valorA, valorB) {
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

async function obtenerJsonApi(ruta) {
  const respuesta = await fetch(construirUrlApi(ruta), {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!respuesta.ok) {
    throw new Error(`Error al cargar ${ruta}`)
  }

  return await respuesta.json()
}

async function obtenerJsonApiOpcional(ruta) {
  try {
    return await obtenerJsonApi(ruta)
  } catch {
    return null
  }
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

async function obtenerListaApiOpcional(ruta) {
  const respuesta = await obtenerJsonApiOpcional(ruta)
  return normalizarLista(respuesta)
}

function contarElementosUnicos(lista, camposId) {
  return new Set(
    normalizarLista(lista)
      .map((elemento) => obtenerPrimerValorDisponible(elemento, camposId))
      .filter((id) => id !== undefined && id !== null)
      .map(String)
  ).size
}

function obtenerIdUsuarioActual() {
  return getId();
}

function obtenerIdEntidad(entidad) {
  return convertirANumero(
    obtenerPrimerValorDisponible(entidad, [
      'id_entidad',
      'idEntidad',
      'id',
    ])
  )
}

async function obtenerIdEntidadPorUsuario(idUsuario) {
  const idUsuarioNumero = convertirANumero(idUsuario)

  if (!idUsuarioNumero) {
    return null
  }

  const entidades = normalizarLista(
    await obtenerJsonApi(
      construirUrl('/api/entidades', {
        id_usuario_contacto: idUsuarioNumero,
      })
    )
  )

  const entidad = entidades.find((entidad) => {
    const idUsuarioContacto = obtenerPrimerValorDisponible(entidad, [
      'id_usuario_contacto',
      'idUsuarioContacto',
    ])

    return sonMismoIdentificador(idUsuarioContacto, idUsuarioNumero)
  })

  return obtenerIdEntidad(entidad || entidades[0])
}

async function obtenerIdEntidadDelUsuarioActual() {
  const autenticado = estaAutenticado()

  if (!autenticado) {
    return null
  }

  return await obtenerIdEntidadPorUsuario(getId());
}

function parsearFechaLocal(fecha) {
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
  const inicio = parsearFechaLocal(fechaInicio)
  const fin = parsearFechaLocal(fechaFin)

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
    return `${diaInicio}-${diaFin} ${mesFin}`
  }

  return `${diaInicio} ${mesInicio}-${diaFin} ${mesFin}`
}

function calcularPorcentaje(parte, total) {
  if (!total || total <= 0) {
    return 0
  }

  const porcentaje = (parte / total) * 100

  return Math.max(0, Math.min(100, Math.round(porcentaje)))
}

function calcularPorcentajeTiempo(fechaInicio, fechaFin) {
  const inicio = parsearFechaLocal(fechaInicio)
  const fin = parsearFechaLocal(fechaFin)

  if (
    !inicio ||
    !fin ||
    Number.isNaN(inicio.getTime()) ||
    Number.isNaN(fin.getTime())
  ) {
    return 0
  }

  fin.setHours(23, 59, 59, 999)

  const duracionTotal = fin.getTime() - inicio.getTime()
  const tiempoTranscurrido = Date.now() - inicio.getTime()

  return calcularPorcentaje(tiempoTranscurrido, duracionTotal)
}

function esCampaniaActiva(campania) {
  const fechaInicio = obtenerPrimerValorDisponible(campania, [
    'fecha_inicio',
    'fechaInicio',
  ])

  const fechaFin = obtenerPrimerValorDisponible(campania, [
    'fecha_fin',
    'fechaFin',
  ])

  const inicio = parsearFechaLocal(fechaInicio)
  const fin = parsearFechaLocal(fechaFin)

  if (!inicio || !fin) {
    return false
  }

  fin.setHours(23, 59, 59, 999)

  const hoy = new Date()

  return hoy >= inicio && hoy <= fin
}

async function obtenerCampanias() {
  return normalizarLista(await obtenerJsonApi('/api/campanias'))
}

async function obtenerCampaniaActiva() {
  const campanias = await obtenerCampanias()
  return campanias.find(esCampaniaActiva) || null
}

async function obtenerIdCampaniaActiva() {
  const campaniaActiva = await obtenerCampaniaActiva()

  return convertirANumero(
    obtenerPrimerValorDisponible(campaniaActiva, [
      'id_campania',
      'idCampania',
      'id',
    ])
  )
}

async function obtenerTiendasRegistradas() {
  return await obtenerListaApiOpcional('/tiendas')
}

async function obtenerTiendasDeCampania(idCampania) {
  return normalizarLista(
    await obtenerJsonApi(
      construirUrl('/api/tiendas', {
        idCampania,
      })
    )
  )
}

function obtenerRelacionCampaniaTienda(tienda, idCampania) {
  const relaciones = normalizarLista(
    obtenerPrimerValorDisponible(tienda, [
      'tienda_campania',
      'tiendaCampania',
    ])
  )

  return (
    relaciones.find((relacion) => {
      const idCampaniaRelacion = obtenerPrimerValorDisponible(relacion, [
        'id_campania',
        'idCampania',
      ])

      return sonMismoIdentificador(idCampaniaRelacion, idCampania)
    }) || null
  )
}

function tiendaParticipaEnCampania(tienda, idCampania) {
  const relacion = obtenerRelacionCampaniaTienda(tienda, idCampania)

  if (!relacion) {
    return true
  }

  const participa = obtenerPrimerValorDisponible(relacion, ['participa'])

  return (
    participa === true ||
    participa === 'true' ||
    participa === 1 ||
    participa === '1'
  )
}

async function obtenerResumenCampaniaActiva() {
  const campania = await obtenerCampaniaActiva()

  if (!campania) {
    return null
  }

  const idCampania = convertirANumero(
    obtenerPrimerValorDisponible(campania, [
      'id_campania',
      'idCampania',
      'id',
    ])
  )

  if (!idCampania) {
    return null
  }

  const [
    tiendasCampania,
    tiendasRegistradas,
  ] = await Promise.all([
    obtenerTiendasDeCampania(idCampania),
    obtenerTiendasRegistradas(),
  ])

  const fechaInicio = obtenerPrimerValorDisponible(campania, [
    'fecha_inicio',
    'fechaInicio',
  ])

  const fechaFin = obtenerPrimerValorDisponible(campania, [
    'fecha_fin',
    'fechaFin',
  ])

  const tiendasParticipantes = tiendasCampania.filter((tienda) => {
    return tiendaParticipaEnCampania(tienda, idCampania)
  })

  const numeroTiendasParticipan = contarElementosUnicos(tiendasParticipantes, [
    'id_tienda',
    'idTienda',
    'id',
  ])

  const numeroTiendasTotales = contarElementosUnicos(tiendasRegistradas, [
    'id_tienda',
    'idTienda',
    'id',
  ])

  return {
    nombre: obtenerPrimerValorDisponible(campania, ['nombre']),
    fechas: formatearRangoFechas(fechaInicio, fechaFin),
    numeroTiendasParticipan,
    numeroTiendasTotales,
    porcentajeTiendasParticipan: calcularPorcentaje(
      numeroTiendasParticipan,
      numeroTiendasTotales
    ),
    porcentajeTiempoTranscurrido: calcularPorcentajeTiempo(
      fechaInicio,
      fechaFin
    ),
  }
}

async function obtenerEstadisticasHomepage() {
  const [
    campanias,
    tiendas,
    entidades,
    voluntarios,
  ] = await Promise.all([
    obtenerListaApiOpcional('/api/campanias'),
    obtenerTiendasRegistradas(),
    obtenerListaApiOpcional('/api/entidades'),
    obtenerListaApiOpcional('/api/voluntarios'),
  ])

  return {
    campaniasActivas: campanias.filter(esCampaniaActiva).length,
    campaniasTotales: campanias.length,

    tiendasRegistradas: contarElementosUnicos(tiendas, [
      'id_tienda',
      'idTienda',
      'id',
    ]),

    entidadesRegistradas: contarElementosUnicos(entidades, [
      'id_entidad',
      'idEntidad',
      'id',
    ]),

    voluntariosRegistrados: contarElementosUnicos(voluntarios, [
      'id_voluntario',
      'idVoluntario',
      'id',
    ]),
  }
}

async function obtenerAccesosRapidosPorRol(rol) {
  const idUsuario = obtenerIdUsuarioActual()
  const idCampaniaActiva = await obtenerIdCampaniaActiva()

  if (rol === 'ADMINISTRADOR') {
    return [
      { texto: 'Campañas', enlace: '/html/campanias.html' },
      { texto: 'Tiendas', enlace: '/html/tiendas.html' },
      { texto: 'Entidades', enlace: '/html/entidades.html' },
      { texto: 'Voluntarios', enlace: '/html/voluntarios.html' },
      { texto: 'Sugerencias', enlace: '/sugerencias' },
      { texto: 'Gráficas', enlace: '/dashboard' },
    ]
  }

  if (rol === 'CAPITAN') {
    return [
      {
        texto: 'Zonas',
        enlace: construirUrl('/html/zonas.html', {
          idCampania: idCampaniaActiva,
          idUsuario,
        }),
      },
      {
        texto: 'Tiendas',
        enlace: construirUrl('/html/tiendas.html', {
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
        enlace: construirUrl('/html/zonas.html', {
          idCampania: idCampaniaActiva,
          idUsuario,
        }),
      },
      {
        texto: 'Tiendas',
        enlace: construirUrl('/html/tiendas.html', {
          idCampania: idCampaniaActiva,
          idUsuario,
        }),
      },
      {
        texto: 'Voluntarios',
        enlace: construirUrl('/html/voluntarios.html', {
          idCampania: idCampaniaActiva,
        }),
      }, {
        texto: 'Entidades',
        enlace: construirUrl('/html/entidades.html', {
          idCampania: idCampaniaActiva,
        }),
      },
      {
        texto: 'Sugerir cambio',
        enlace: '/sugerencias/crear',
      },
    ]
  }

  if (rol === 'RESPONSABLE-ENTIDAD') {
    const idEntidad = await obtenerIdEntidadDelUsuarioActual()

    return [
      {
        texto: 'Mi entidad',
        enlace: '/entidad',
      },
      {
        texto: 'Voluntarios',
        enlace: idEntidad
          ? construirUrl('/html/voluntarios.html', {
            idEntidad,
          })
          : '/html/voluntarios.html',
      },
      {
        texto: 'Tiendas',
        enlace: construirUrl('/html/tiendas.html', {
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
        enlace: construirUrl('/html/tiendas.html', {
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
  ICONOS_HOME,
  obtenerAccesosRapidosPorRol,
  obtenerResumenCampaniaActiva,
  obtenerEstadisticasHomepage,
}
