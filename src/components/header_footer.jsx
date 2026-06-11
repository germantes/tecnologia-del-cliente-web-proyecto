import headerStyles from '../styles/header.module.css'
import footerStyles from '../styles/footer.module.css'
import { Link } from 'react-router-dom'
import { cerrarSesion as borrarSesion } from './session.js'

function Header() {
  function cerrarSesion() {
    borrarSesion()
    window.location.href = '/'
  }

  return (
    <header className={headerStyles['bancosol-header']}>
      <Link className={headerStyles['bancosol-header__logo-link']} to="/homepage" aria-label="Ir a inicio">
        <img className={headerStyles['bancosol-header__logo']} src="/resources/img/BancosolLogo.png" alt="BancoSol Alimentos"/>
      </Link>

      <div className={headerStyles['bancosol-header__actions']}>
        <a className={headerStyles['bancosol-header__profile']} href="/perfil" aria-label="Ir al perfil">
          <svg className={headerStyles['bancosol-header__profile-icon']} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="currentColor" d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5Zm0 2c-3.31 0-10 1.67-10 5v3h20v-3c0-3.33-6.69-5-10-5Z"/>
          </svg>
          Perfil
        </a>

        <button className={headerStyles['bancosol-header__logout']} type="button" onClick={cerrarSesion} aria-label="Cerrar sesión">
          <svg className={headerStyles['bancosol-header__logout-icon']} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="currentColor" d="M10 3a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V5H5v14h4v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6Zm6.3 4.3a1 1 0 0 1 1.4 0l4 4a1 1 0 0 1 0 1.4l-4 4a1 1 0 1 1-1.4-1.4L18.6 13H10a1 1 0 1 1 0-2h8.6l-2.3-2.3a1 1 0 0 1 0-1.4Z"/>
          </svg>
          Cerrar sesión
        </button>
      </div>

      <nav className={headerStyles['bancosol-header__nav']} aria-label="Navegación principal">
        <Link className={`${headerStyles['bancosol-header__nav-item']} ${headerStyles['bancosol-header__nav-item--active']}`} data-nav="inicio" to="/homepage">
          Inicio
        </Link>

        <Link className={headerStyles['bancosol-header__nav-item']} data-nav="campanias" to="/campanias">
          Campañas
        </Link>

        <Link className={headerStyles['bancosol-header__nav-item']} data-nav="cadenas" to="/cadenas">
          Cadenas
        </Link>

        <Link className={headerStyles['bancosol-header__nav-item']} data-nav="zonas" to="/zonas">
          Zonas
        </Link>

        <a className={headerStyles['bancosol-header__nav-item']} data-nav="tiendas" href="/tiendas">
          Tiendas
        </a>

        <a className={headerStyles['bancosol-header__nav-item']} data-nav="entidades" href="/entidades">
          Entidades
        </a>

        <a className={headerStyles['bancosol-header__nav-item']} data-nav="voluntarios" href="/voluntarios">
          Voluntarios
        </a>
      </nav>
    </header>
  )
}

function Footer(){
    return(
        <footer className={footerStyles['bancosol-footer']}>
            <img className={footerStyles['bancosol-footer__logo']} src="/resources/img/Bancosol.png" alt="BancoSol"></img>
            <div className={footerStyles['bancosol-footer__content']}>
                <span className={footerStyles['bancosol-footer__brand']}>BancoSol</span>.
                Proyecto Tecnologías del Servidor y del Cliente para aplicaciones web - 2026
            </div>
        </footer>
    )
}

export {Header,Footer};