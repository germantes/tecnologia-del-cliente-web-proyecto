import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import styles from '../styles/homepage.module.css'
import {estaAutenticado, getSesion} from './session.js'
import {
  ICONOS_HOME,
  obtenerAccesosRapidosPorRol,
  obtenerResumenCampaniaActiva,
  obtenerEstadisticasHomepage,
} from './auxiliar-homepage.js'

const CONTENIDO_POR_ROL = {
  ADMINISTRADOR: {
    responsabilidades: [
      'Administrar el sistema',
      'Controlar y mantener los datos generales',
      'Generar campañas y configurar cadenas participantes',
      'Gestionar tiendas, coordinadores, capitanes y colaboradores',
    ],
    permisos: [
      'Acceso total a la aplicación',
      'Crear, modificar y eliminar campañas/cadenas',
      'Crear, modificar y eliminar tiendas',
      'Validar las sugerencias de cambios',
    ],
  },
  CAPITAN: {
    responsabilidades: [
      'Apoyar la logística cercana a las tiendas durante la campaña',
      'Supervisar la actividad en las tiendas asignadas',
      'Coordinarse con el coordinador correspondiente',
      'Informar de incidencias detectadas durante la campaña',
    ],
    permisos: [
      'Acceder solo a tiendas y colaboradores asignados',
      'Visualizar los datos de sus tiendas',
      'Consultar información de voluntarios, turnos y contactos',
      'Registrar incidencias',
    ],
  },
  COORDINADOR: {
    responsabilidades: [
      'Gestionar las tiendas asignadas',
      'Gestionar los colaboradores asignados',
      'Asignar colaboradores a turnos',
      'Mantener actualizados los datos de contacto de colaboradores',
    ],
    permisos: [
      'Acceder solo a tiendas y colaboradores asignados',
      'Asignar colaboradores por turnos',
      'Añadir nuevos colaboradores, pendientes de validación por administrador',
      'Actualizar datos de contacto de colaboradores',
    ],
  },
  'RESPONSABLE-ENTIDAD': {
    responsabilidades: [
      'Asignar voluntarios de su entidad a la tienda asignada',
      'Supervisar los voluntarios de la entidad durante la campaña',
      'Hacer seguimiento de la participación de la entidad colaboradora',
      'Comunicar incidencias o feedback durante el turno',
    ],
    permisos: [
      'Acceder solo a tiendas y colaboradores asignados',
      'Visualizar los datos relacionados con su entidad y tienda',
      'Registrar incidencias',
      'Aportar feedback directo sobre el turno o la colaboración',
    ],
  },
  'RESPONSABLE-TIENDA': {
    responsabilidades: [
      'Supervisar los voluntarios de la tienda asignada',
      'Controlar el desarrollo de los turnos en su tienda',
      'Revisar la información operativa de la tienda',
      'Comunicar posibles problemas o incidencias',
    ],
    permisos: [
      'Acceder solo a su tienda asignada',
      'Visualizar los datos de la tienda y turnos',
      'Consultar información de colaboradores/voluntarios asignados',
      'No modificar datos generales ni asignaciones',
    ],
  },
}

const CONTENIDO_DEFECTO = {
  responsabilidades: [
    'Consultar la información disponible',
    'Revisar sus datos de usuario',
    'Acceder a las funcionalidades asignadas',
    'Contactar con responsables si necesita cambios',
  ],
  permisos: [
    'Consultar la página de inicio',
    'Ver información básica',
    'Acceder a su perfil',
    'Cerrar sesión',
  ],
}

function Homepage() {
  const sesion = getSesion()

  const perfil = sesion.perfil;

  const nombreDelUsuario = sesion.nombre;

  const contenidoDelPerfil = CONTENIDO_POR_ROL[perfil] || CONTENIDO_DEFECTO

  const [accesos, setAccesos] = useState({
    datos: [],
    cargando: false,
    error: '',
  })

  const [campania, setCampania] = useState({
    datos: null,
    cargando: false,
    error: '',
  })

  const [estadisticas, setEstadisticas] = useState({
    datos: null,
    cargando: false,
    error: '',
  })

  useEffect(() => {
    if (!perfil) {
      return
    }

    let activo = true

    async function cargarAccesos() {
      try {
        setAccesos({ datos: [], cargando: true, error: '' })

        const datos = await obtenerAccesosRapidosPorRol(perfil)

        if (activo) {
          setAccesos({ datos, cargando: false, error: '' })
        }
      } catch {
        if (activo) {
          setAccesos({
            datos: [],
            cargando: false,
            error: 'No se pudieron cargar los accesos rápidos.',
          })
        }
      }
    }

    cargarAccesos()

    return () => {
      activo = false
    }
  }, [perfil])

  useEffect(() => {
    let activo = true

    async function cargarDatosHomepage() {
      setCampania({ datos: null, cargando: true, error: '' })
      setEstadisticas({ datos: null, cargando: true, error: '' })

      const [resultadoCampania, resultadoEstadisticas] = await Promise.allSettled([
        obtenerResumenCampaniaActiva(),
        obtenerEstadisticasHomepage(),
      ])

      if (!activo) {
        return
      }

      if (resultadoCampania.status === 'fulfilled') {
        setCampania({
          datos: resultadoCampania.value,
          cargando: false,
          error: '',
        })
      } else {
        setCampania({
          datos: null,
          cargando: false,
          error: 'No se pudo cargar el resumen de la campaña activa.',
        })
      }

      if (resultadoEstadisticas.status === 'fulfilled') {
        setEstadisticas({
          datos: resultadoEstadisticas.value,
          cargando: false,
          error: '',
        })
      } else {
        setEstadisticas({
          datos: null,
          cargando: false,
          error: 'No se pudieron cargar las estadísticas generales.',
        })
      }
    }

    cargarDatosHomepage()

    return () => {
      activo = false
    }
  }, [])

  if (!estaAutenticado()) {
    return (
      <div className={styles['homepage']}>
        <main className={styles['homepage-main']}>
          <section className={styles['homepage-hero']}>
            <h1 className={styles['homepage-title']}>No hay sesión iniciada.</h1>
            <p>Inicia sesión para ver tus responsabilidades, permisos y accesos disponibles.</p>
          </section>
        </main>
      </div>
    )
  }

  function renderizarIcono(icono) {
    return (
      <span className={styles['homepage-icon']} aria-hidden="true">
        <FontAwesomeIcon icon={icono} className={styles['homepage-icon__svg']} />
      </span>
    )
  }

  function renderizarLista(items) {
    return items.map((texto) => (
      <li key={texto} className={styles['card-list__item']}>
        <FontAwesomeIcon icon={ICONOS_HOME.lista} className={styles['card-list__check']} aria-hidden="true" />
        <span>{texto}</span>
      </li>
    ))
  }

  function renderizarAccesos() {
    if (accesos.cargando) {
      return <p className={styles['message']}>Cargando accesos...</p>
    }

    if (accesos.error) {
      return <p className={`${styles['message']} ${styles['message--error']}`}>{accesos.error}</p>
    }

    if (accesos.datos.length === 0) {
      return <p className={styles['message']}>No hay accesos disponibles para este rol.</p>
    }

    return accesos.datos.map((acceso) => (
      <a key={acceso.texto} className={styles['quick-access']} href={acceso.enlace}>
        <span>{acceso.texto}</span>
        <span className={styles['quick-access__arrow']} aria-hidden="true">›</span>
      </a>
    ))
  }

  function renderizarProgreso(etiqueta, porcentaje, detalle) {
    const porcentajeSeguro = Math.max(0, Math.min(100, Number(porcentaje) || 0))

    return (
      <div className={styles['progress']}>
        <div className={styles['progress__header']}>
          <span>{etiqueta}</span>
          <strong>{porcentajeSeguro}%</strong>
        </div>

        <div className={styles['progress__bar']} aria-hidden="true">
          <div
            className={styles['progress__fill']}
            style={{ width: `${porcentajeSeguro}%` }}
          ></div>
        </div>

        <p className={styles['progress__detail']}>{detalle}</p>
      </div>
    )
  }

  function renderizarResumenCampania() {
    const resumen = campania.datos

    if (campania.cargando) {
      return <p className={styles['message']}>Cargando resumen de la campaña activa...</p>
    }

    if (campania.error) {
      return <p className={`${styles['message']} ${styles['message--error']}`}>{campania.error}</p>
    }

    if (!resumen) {
      return <p className={styles['message']}>No hay ninguna campaña activa actualmente.</p>
    }

    return (
      <>
        <div className={styles['campaign-summary__main']}>
          <div className={`${styles['campaign-summary__field']} ${styles['campaign-summary__field--name']}`}>
            <span>Nombre</span>
            <strong>{resumen.nombre}</strong>
          </div>

          <div className={styles['campaign-summary__field']}>
            <span>Estado</span>
            <strong className={styles['campaign-summary__status']}>Activa</strong>
          </div>

          <div className={styles['campaign-summary__field']}>
            <span>Fechas</span>
            <strong>{resumen.fechas}</strong>
          </div>

          <div className={styles['campaign-summary__field']}>
            <span>Tiendas participantes</span>
            <strong>{resumen.numeroTiendasParticipan}</strong>
          </div>
        </div>

        <div className={styles['progress-grid']}>
          {renderizarProgreso(
            'Tiendas participantes',
            resumen.porcentajeTiendasParticipan,
            `${resumen.numeroTiendasParticipan} de ${resumen.numeroTiendasTotales} tiendas participan en la campaña.`
          )}

          {renderizarProgreso(
            'Tiempo transcurrido',
            resumen.porcentajeTiempoTranscurrido,
            'Porcentaje de tiempo transcurrido desde el inicio hasta el final de la campaña.'
          )}
        </div>
      </>
    )
  }

  function crearTarjetaEstadistica(tipo, numero, titulo, subtitulo) {
    const iconosEstadistica = {
      campanias: ICONOS_HOME.campaniasActivas,
      tiendas: ICONOS_HOME.tiendasRegistradas,
      entidades: ICONOS_HOME.entidadesRegistradas,
      voluntarios: ICONOS_HOME.voluntariosRegistrados,
    }

    return (
      <article className={`${styles['stat-card']} ${styles['panel']} ${styles['panel--bordered']}`}>
        {renderizarIcono(iconosEstadistica[tipo])}

        <div className={styles['stat-card__content']}>
          <strong>{numero}</strong>
          <span>{titulo}</span>

          {subtitulo && (
            <small>{subtitulo}</small>
          )}
        </div>
      </article>
    )
  }

  function renderizarEstadisticas() {
    const datos = estadisticas.datos

    if (estadisticas.cargando) {
      return (
        <section className={styles['stats-row']}>
          <p className={`${styles['message']} ${styles['panel']} ${styles['panel--bordered']} ${styles['stats-message']}`}>
            Cargando estadísticas generales...
          </p>
        </section>
      )
    }

    if (estadisticas.error) {
      return (
        <section className={styles['stats-row']}>
          <p className={`${styles['message']} ${styles['message--error']} ${styles['panel']} ${styles['panel--bordered']} ${styles['stats-message']}`}>
            {estadisticas.error}
          </p>
        </section>
      )
    }

    if (!datos) {
      return null
    }

    return (
      <section className={styles['stats-row']} aria-label="Estadísticas generales">
        {crearTarjetaEstadistica(
          'campanias',
          datos.campaniasActivas,
          'Campañas activas',
          `${datos.campaniasTotales} campañas registradas`
        )}

        {crearTarjetaEstadistica(
          'tiendas',
          datos.tiendasRegistradas,
          'Tiendas registradas'
        )}

        {crearTarjetaEstadistica(
          'entidades',
          datos.entidadesRegistradas,
          'Entidades registradas'
        )}

        {crearTarjetaEstadistica(
          'voluntarios',
          datos.voluntariosRegistrados,
          'Voluntarios registrados'
        )}
      </section>
    )
  }

  return (
    <div className={styles['homepage']}>
      <main className={styles['homepage-main']}>
        <section className={styles['homepage-hero']}>
          <h2 className={styles['homepage-title']}>Bienvenid@, {nombreDelUsuario}</h2>
        <p className={styles['homepage-role']}>Rol: {perfil}</p>

        <div className={styles['homepage-intro']}>
          <p>
            Desde aquí puedes consultar un resumen de tus responsabilidades,
            permisos y las herramientas disponibles para gestionar BancoSol de
            forma eficiente.
          </p>
        </div>
      </section>

      <section className={styles['homepage-controls']} aria-label="Resumen principal del usuario">
        <article className={`${styles['homepage-card']} ${styles['panel']} ${styles['panel--bordered']}`}>
          <div className={styles['panel__header']}>
            {renderizarIcono(ICONOS_HOME.responsabilidades)}
            <h3>Mis responsabilidades</h3>
          </div>

          <ul className={styles['card-list']}>
            {renderizarLista(contenidoDelPerfil.responsabilidades)}
          </ul>
        </article>

        <article className={`${styles['homepage-card']} ${styles['panel']} ${styles['panel--bordered']}`}>
          <div className={styles['panel__header']}>
            {renderizarIcono(ICONOS_HOME.permisos)}
            <h3>Mis permisos</h3>
          </div>

          <ul className={styles['card-list']}>
            {renderizarLista(contenidoDelPerfil.permisos)}
          </ul>
        </article>

        <article className={`${styles['homepage-card']} ${styles['panel']} ${styles['panel--bordered']}`}>
          <div className={styles['panel__header']}>
            {renderizarIcono(ICONOS_HOME.accesosRapidos)}
            <h3>Accesos rápidos</h3>
          </div>

          <div className={styles['quick-access-grid']}>
            {renderizarAccesos()}
          </div>
        </article>
      </section>

      <section className={`${styles['campaign-summary']} ${styles['panel']} ${styles['panel--bordered']}`} aria-label="Resumen de la campaña activa">
        <div className={styles['panel__header']}>
          {renderizarIcono(ICONOS_HOME.campaniaActiva)}

          <div>
            <h3>Campaña activa</h3>
            <p>Resumen general de la campaña que se encuentra actualmente en curso.</p>
          </div>
        </div>

        {renderizarResumenCampania()}
      </section>

      {renderizarEstadisticas()}
    </main>
    </div>
  )
}

export default Homepage