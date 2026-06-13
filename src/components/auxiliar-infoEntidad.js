import { getAuthHeaders } from './session.js'

const API_BASE = window.API_URL || 'http://localhost:3000'
let promesaContactosAdicionales = null
const idsEntidadesMostradas = new Set()

function construirUrl(ruta, parametros = {}) {
  const url = new URL(ruta, API_BASE)

  Object.entries(parametros).forEach(([nombre, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') {
      url.searchParams.set(nombre, valor)
    }
  })

  return url.toString()
}

async function obtenerJson(ruta, parametros = {}) {
  const url = construirUrl(ruta, parametros)
  const respuesta = await fetch(url, {
    headers: getAuthHeaders(),
  })

  const textoRespuesta = await respuesta.text()
  let json

  try {
    json = textoRespuesta ? JSON.parse(textoRespuesta) : null
  } catch {
    json = textoRespuesta
  }

  if (!respuesta.ok) {
    const mensaje = respuesta.status === 404
      ? `No se encontraron los datos solicitados en ${ruta}.`
      : `No se pudieron cargar los datos de ${ruta} (${respuesta.status}).`
    throw new Error(mensaje)
  }

  return json
}

function normalizarLista(respuesta) {
  if (Array.isArray(respuesta)) return respuesta
  if (Array.isArray(respuesta?.data)) return respuesta.data
  if (Array.isArray(respuesta?.voluntarios)) return respuesta.voluntarios
  return []
}

function idsIguales(valorA, valorB) {
  return valorA !== undefined
    && valorA !== null
    && valorB !== undefined
    && valorB !== null
    && String(valorA).trim() === String(valorB).trim()
}

function obtenerRelacionesDeEntidad(relaciones, idEntidad) {
  return relaciones.filter((relacion) => {
    const idEntidadRelacion = relacion.id_entidad ?? relacion.idEntidad
    return idsIguales(idEntidadRelacion, idEntidad)
  })
}

async function obtenerEntidadPorUsuario(idUsuario) {
  const respuesta = await obtenerJson('/api/entidades', { id_usuario_contacto: idUsuario })
  const entidades = normalizarLista(respuesta)

  if (entidades.length === 0) {
    throw new Error('Este usuario no tiene ninguna entidad asociada.')
  }

  return entidades[0]
}

async function obtenerUsuarioPorId(idUsuario) {
  if (!idUsuario) return null
  return obtenerJson(`/usuarios/${encodeURIComponent(idUsuario)}`)
}

async function obtenerContactosAdicionales() {
  if (!promesaContactosAdicionales) {
    promesaContactosAdicionales = obtenerJson('/api/contactos-adicionales')
      .catch((error) => {
        promesaContactosAdicionales = null
        throw error
      })
  }

  const respuestaRelaciones = await promesaContactosAdicionales

  return normalizarLista(respuestaRelaciones)
}

async function obtenerContactosEntidad(idEntidad) {
  const contactosAdicionales = await obtenerContactosAdicionales()
  const contactosAdicionalesEntidad = obtenerRelacionesDeEntidad(
    contactosAdicionales,
    idEntidad
  )

  const claveEntidad = String(idEntidad).trim()
  if (!idsEntidadesMostradas.has(claveEntidad)) {
    idsEntidadesMostradas.add(claveEntidad)
  }

  return contactosAdicionalesEntidad
}

async function obtenerVoluntariosPorEntidad(idEntidad) {
  const respuesta = await obtenerJson('/api/voluntarios', { idEntidad })
  return normalizarLista(respuesta)
}

export {
  obtenerContactosAdicionales,
  obtenerContactosEntidad,
  obtenerEntidadPorUsuario,
  obtenerUsuarioPorId,
  obtenerVoluntariosPorEntidad,
}
