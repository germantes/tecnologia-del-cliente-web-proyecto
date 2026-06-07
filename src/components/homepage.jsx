import { useEffect, useState } from 'react'
import '../styles/homepage.css'
import { getSesion } from './session.js'
import { getAccesosRapidosPorRol } from './auxiliar-homepage.js'

function Homepage() {
  const sesion = getSesion()

  const rol = sesion.usuario
    ? sesion.perfil
    : null

  const nombreUsuario = sesion.usuario
    ? sesion.usuario.nombre
    : 'usuario'

  const [accesos, setAccesos] = useState([])
  const [cargandoAccesos, setCargandoAccesos] = useState(false)
  const [errorAccesos, setErrorAccesos] = useState('')

  useEffect(() => {
    if (!rol) {
      return
    }

    let componenteActivo = true

    async function cargarAccesos() {
      try {
        setCargandoAccesos(true)
        setErrorAccesos('')

        const accesosRol = await getAccesosRapidosPorRol(rol)

        if (componenteActivo) {
          setAccesos(accesosRol)
        }
      } catch (error) {
        if (componenteActivo) {
          setErrorAccesos('No se pudieron cargar los accesos rápidos.')
          setAccesos([])
        }
      } finally {
        if (componenteActivo) {
          setCargandoAccesos(false)
        }
      }
    }

    cargarAccesos()

    return () => {
      componenteActivo = false
    }
  }, [rol])

  if (!sesion.usuario) {
    return (
      <main className="homepage-main">
        <section className="homepage-hero">
          <h1 id="Welcome">No hay sesión iniciada.</h1>
          <p>Inicia sesión para ver tus responsabilidades, permisos y accesos disponibles.</p>
        </section>
      </main>
    )
  }

  function crearItem(texto) {
    return (
      <li key={texto} className="card-list__item">
        <span className="card-list__check" aria-hidden="true">✓</span>
        <span>{texto}</span>
      </li>
    )
  }

  function crearAcceso(acceso) {
    return (
      <a key={acceso.texto} className="quick-access" href={acceso.enlace}>
        <span>{acceso.texto}</span>
        <span className="quick-access__arrow" aria-hidden="true">›</span>
      </a>
    )
  }

  function responsabilidades(rol) {
    if (rol === 'ADMINISTRADOR') {
      return (
        <>
          {[
            'Gestionar campañas de recogida',
            'Supervisar tiendas participantes',
            'Coordinar entidades colaboradoras',
            'Revisar y asignar voluntarios',
          ].map(crearItem)}
        </>
      )
    }

    if (rol === 'CAPITAN') {
      return (
        <>
          {[
            'Consultar zonas asignadas en la campaña actual',
            'Supervisar tiendas de sus zonas asignadas',
            'Revisar la cobertura de turnos',
            'Coordinar responsables asociados',
          ].map(crearItem)}
        </>
      )
    }

    if (rol === 'COORDINADOR') {
      return (
        <>
          {[
            'Consultar zonas asignadas en la campaña actual',
            'Supervisar tiendas de sus zonas asignadas',
            'Coordinar equipos de apoyo',
            'Comprobar el estado de asignaciones',
          ].map(crearItem)}
        </>
      )
    }

    if (rol === 'RESPONSABLE-ENTIDAD') {
      return (
        <>
          {[
            'Gestionar los datos de su entidad',
            'Consultar voluntarios asociados a su entidad',
            'Revisar tiendas asignadas a su entidad',
            'Mantener actualizada la información de contacto',
          ].map(crearItem)}
        </>
      )
    }

    if (rol === 'RESPONSABLE-TIENDA') {
      return (
        <>
          {[
            'Consultar sus tiendas asignadas',
            'Revisar la campaña actual',
            'Comprobar turnos asociados',
            'Comunicar incidencias del punto de recogida',
          ].map(crearItem)}
        </>
      )
    }

    return (
      <>
        {[
          'Consultar la información disponible',
          'Revisar sus datos de usuario',
          'Acceder a las funcionalidades asignadas',
          'Contactar con responsables si necesita cambios',
        ].map(crearItem)}
      </>
    )
  }

  function permisos(rol) {
    if (rol === 'ADMINISTRADOR') {
      return (
        <>
          {[
            'Crear y editar campañas',
            'Ver y editar tiendas',
            'Gestionar entidades',
            'Consultar datos globales',
          ].map(crearItem)}
        </>
      )
    }

    if (rol === 'CAPITAN') {
      return (
        <>
          {[
            'Ver zonas asignadas',
            'Consultar tiendas de sus zonas',
            'Revisar voluntarios disponibles',
            'Consultar información de campaña activa',
          ].map(crearItem)}
        </>
      )
    }

    if (rol === 'COORDINADOR') {
      return (
        <>
          {[
            'Ver zonas asignadas',
            'Consultar tiendas de sus zonas',
            'Revisar entidades colaboradoras',
            'Consultar información de campaña activa',
          ].map(crearItem)}
        </>
      )
    }

    if (rol === 'RESPONSABLE-ENTIDAD') {
      return (
        <>
          {[
            'Editar los datos de su entidad',
            'Ver voluntarios de su entidad',
            'Consultar tiendas vinculadas a su entidad',
            'Revisar información de campaña actual',
          ].map(crearItem)}
        </>
      )
    }

    if (rol === 'RESPONSABLE-TIENDA') {
      return (
        <>
          {[
            'Ver sus tiendas asignadas',
            'Consultar campaña actual',
            'Revisar turnos asociados',
            'Acceder a información de tienda',
          ].map(crearItem)}
        </>
      )
    }

    return (
      <>
        {[
          'Consultar la página de inicio',
          'Ver información básica',
          'Acceder a su perfil',
          'Cerrar sesión',
        ].map(crearItem)}
      </>
    )
  }

  function accesosRapidos() {
    if (cargandoAccesos) {
      return (
        <p className="quick-access-message">
          Cargando accesos...
        </p>
      )
    }

    if (errorAccesos) {
      return (
        <p className="quick-access-message">
          {errorAccesos}
        </p>
      )
    }

    if (!accesos || accesos.length === 0) {
      return (
        <p className="quick-access-message">
          No hay accesos disponibles para este rol.
        </p>
      )
    }

    return accesos.map(crearAcceso)
  }

  return (
    <main className="homepage-main">
      <section className="homepage-hero">
        <h2 id="Welcome">Bienvenid@, {nombreUsuario}</h2>
        <p id="rol">Rol: {rol}</p>

        <div id="informacion-extra">
          <p>
            Desde aquí puedes consultar un resumen de tus responsabilidades,
            permisos y las herramientas disponibles para gestionar BancoSol de
            forma eficiente.
          </p>
        </div>
      </section>

      <section id="controles-principales" aria-label="Resumen principal del usuario">
        <article className="homepage-card">
          <div className="homepage-card__header">
            <div className="homepage-card__image-placeholder" aria-hidden="true"></div>
            <h3>Mis responsabilidades</h3>
          </div>

          <ul className="card-list">
            {responsabilidades(rol)}
          </ul>
        </article>

        <article className="homepage-card">
          <div className="homepage-card__header">
            <div className="homepage-card__image-placeholder" aria-hidden="true"></div>
            <h3>Mis permisos</h3>
          </div>

          <ul className="card-list">
            {permisos(rol)}
          </ul>
        </article>

        <article className="homepage-card">
          <div className="homepage-card__header">
            <div className="homepage-card__image-placeholder" aria-hidden="true"></div>
            <h3>Accesos rápidos</h3>
          </div>

          <div className="quick-access-grid">
            {accesosRapidos()}
          </div>
        </article>
      </section>
    </main>
  )
}

export default Homepage