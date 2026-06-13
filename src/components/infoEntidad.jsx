import { useEffect, useState } from 'react'
import {
  obtenerContactosEntidad,
  obtenerEntidadPorUsuario,
  obtenerUsuarioPorId,
  obtenerVoluntariosPorEntidad,
} from './auxiliar-infoEntidad.js'
import { getId } from './session.js'
import '../styles/turnos_comun.css'
import '../styles/infoEntidad.css'

function obtenerNombreCompleto(persona) {
  if (!persona) return 'Sin responsable asignado'

  return persona.nombre_completo
    || persona.nombreCompleto
    || [persona.nombre, persona.apellido_1, persona.apellido_2]
      .filter(Boolean)
      .join(' ')
    || 'Sin nombre'
}

function obtenerIdEntidad(entidad) {
  return entidad?.id_entidad ?? entidad?.idEntidad ?? entidad?.id
}

function obtenerIdUsuario(usuario) {
  return usuario?.id_contacto_adicional
    ?? usuario?.idContactoAdicional
    ?? usuario?.id_contacto
    ?? usuario?.idContacto
    ?? usuario?.id_usuario
    ?? usuario?.idUsuario
    ?? usuario?.id
    ?? `${usuario?.id_entidad ?? usuario?.idEntidad}-${usuario?.email ?? usuario?.correo ?? usuario?.nombre ?? 'contacto'}`
}

function obtenerNombreContacto(contacto) {
  return contacto.nombre_completo
    || contacto.nombreCompleto
    || contacto.nombre
    || contacto.contacto
    || `Contacto ${contacto.id_usuario ?? contacto.idUsuario ?? contacto.id_contacto ?? ''}`.trim()
}

function obtenerEmailContacto(contacto) {
  return contacto.email || contacto.correo || ''
}

function InfoEntidad() {
  const idUsuario = getId()
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(Boolean(idUsuario))
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true

    async function cargarDatos() {
      try {
        setCargando(true)
        setError('')

        const entidad = await obtenerEntidadPorUsuario(idUsuario)
        const idEntidad = obtenerIdEntidad(entidad)
        const idResponsable = entidad.id_usuario_contacto ?? entidad.idUsuarioContacto

        const [responsable, contactos, voluntarios] = await Promise.all([
          obtenerUsuarioPorId(idResponsable),
          obtenerContactosEntidad(idEntidad),
          obtenerVoluntariosPorEntidad(idEntidad),
        ])

        if (activo) {
          setDatos({ entidad, responsable, contactos, voluntarios })
        }
      } catch (errorCarga) {
        if (activo) {
          setError(errorCarga.message || 'No se pudo cargar la información de la entidad.')
        }
      } finally {
        if (activo) setCargando(false)
      }
    }

    if (idUsuario) cargarDatos()

    return () => {
      activo = false
    }
  }, [idUsuario])

  if (!idUsuario) {
    return (
      <main className="info-entidad-estado" role="alert">
        <div className="turnos-empty">
          <h3>No se pudo mostrar la entidad</h3>
          <p>No se ha indicado un usuario válido.</p>
        </div>
      </main>
    )
  }

  if (cargando) {
    return (
      <main className="info-entidad-estado" aria-live="polite">
        <div className="turnos-empty">Cargando información de la entidad...</div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="info-entidad-estado" role="alert">
        <div className="turnos-empty">
          <h3>No se pudo mostrar la entidad</h3>
          <p>{error}</p>
        </div>
      </main>
    )
  }

  const { entidad, responsable, contactos, voluntarios } = datos

  return (
    <main className="info-entidad-pagina">
      <header className="info-entidad-cabecera">
        <p className="info-entidad-cabecera-etiqueta">Mi entidad</p>
        <h1 className="info-entidad-nombre">{entidad.nombre || 'Entidad sin nombre'}</h1>

        <div className="info-entidad-responsables">
          <section className="info-entidad-responsable-principal">
            <span>Responsable principal</span>
            <strong>{obtenerNombreCompleto(responsable)}</strong>
            {responsable?.email && <p className="info-entidad-email">{responsable.email}</p>}
          </section>

          {contactos.length > 0 && (
            <section className="info-entidad-responsables-adicionales">
              <h2>CONTACTOS ADICIONALES</h2>
              <div className="info-entidad-lista-contactos">
              {contactos.map((contacto) => (
                <div className="info-entidad-contacto" key={obtenerIdUsuario(contacto)}>
                  <strong>{obtenerNombreContacto(contacto)}</strong>
                  {obtenerEmailContacto(contacto) && (
                    <p className="info-entidad-email">{obtenerEmailContacto(contacto)}</p>
                  )}
                </div>
              ))}
              </div>
            </section>
          )}
        </div>
      </header>

      <section className="info-entidad-seccion-voluntarios" aria-labelledby="mis-voluntarios">
        <div className="info-entidad-titulo-seccion">
          <h2 id="mis-voluntarios">Mis Voluntarios</h2>
        </div>

        {voluntarios.length === 0 ? (
          <div className="turnos-empty info-entidad-sin-voluntarios">
            <h3>No hay voluntarios asociados</h3>
            <p>Esta entidad todavía no tiene voluntarios registrados.</p>
          </div>
        ) : (
          <div className="info-entidad-cuadricula-voluntarios">
            {voluntarios.map((voluntario) => (
              <article
                className="info-entidad-tarjeta-voluntario"
                key={voluntario.id_voluntario ?? voluntario.idVoluntario ?? voluntario.id}
              >
                <h3>{obtenerNombreCompleto(voluntario)}</h3>
                <div className="info-entidad-dato-voluntario">
                  <span>Email</span>
                  {voluntario.email
                    ? <p className="info-entidad-email-voluntario">{voluntario.email}</p>
                    : <strong>Sin email</strong>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default InfoEntidad
