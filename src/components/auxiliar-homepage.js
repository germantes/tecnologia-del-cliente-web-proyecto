import { getAuthHeaders, getUsuario } from './session.js'

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

function normalizarRol(rol) {
  return String(rol || '').trim().toUpperCase()
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
  const respuesta = await fetch(ruta, {
    method: 'GET',
    headers: getAuthHeaders(),
  })

  if (!respuesta.ok) {
    throw new Error(`Error al cargar ${ruta}`)
  }

  return await respuesta.json()
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

  const entidades = await apiGet(url)

  if (!Array.isArray(entidades) || entidades.length === 0) {
    return null
  }

  const entidad = entidades.find((entidad) => {
    return String(entidad.id_usuario_contacto) === String(idUsuarioNumero)
  })

  return obtenerIdEntidadDeObjeto(entidad || entidades[0])
}

async function getIdEntidadUsuarioActual() {
  const usuario = getUsuario()

  if (!usuario) {
    return null
  }

  const idEntidadGuardado = obtenerCampo(usuario, [
    'id_entidad',
    'idEntidad',
  ])

  if (idEntidadGuardado) {
    return convertirANumero(idEntidadGuardado)
  }

  const idUsuario = getIdUsuarioActual()

  return await getIdEntidadPorIdUsuario(idUsuario)
}

function esCampaniaActiva(campania) {
  if (!campania.fecha_inicio || !campania.fecha_fin) {
    return false
  }

  const hoy = new Date()
  const fechaInicio = new Date(campania.fecha_inicio)
  const fechaFin = new Date(campania.fecha_fin)

  fechaFin.setHours(23, 59, 59, 999)

  return hoy >= fechaInicio && hoy <= fechaFin
}

async function getCampaniaActiva() {
  const campanias = await apiGet('/api/campanias')

  if (!Array.isArray(campanias)) {
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

async function getAccesosRapidosPorRol(rol) {
  const rolNormalizado = normalizarRol(rol)
  const idUsuario = getIdUsuarioActual()
  const idCampaniaActiva = await getIdCampaniaActiva()

  if (rolNormalizado === 'ADMINISTRADOR') {
    return [
      { texto: 'Campañas', enlace: '/html/campanias.html' },
      { texto: 'Tiendas', enlace: '/html/tiendas.html' },
      { texto: 'Entidades', enlace: '/html/entidades.html' },
      { texto: 'Voluntarios', enlace: '/html/voluntarios.html' },
    ]
  }

  if (rolNormalizado === 'CAPITAN') {
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

  if (rolNormalizado === 'COORDINADOR') {
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

  if (rolNormalizado === 'RESPONSABLE-ENTIDAD') {
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

  if (rolNormalizado === 'RESPONSABLE-TIENDA') {
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
}