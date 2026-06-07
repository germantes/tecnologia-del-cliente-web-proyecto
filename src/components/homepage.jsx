import '../styles/homepage.css'
import { getSesion } from './session.js'

function Homepage() {
  const sesion = getSesion()

  if (!sesion.usuario) {
    return (
      <main>
        <h1 id="Welcome">No hay sesión iniciada.</h1>
      </main>
    )
  }

  return (
    <main>
      <h1 id="Welcome">Bienvenid@, {sesion.usuario.nombre}</h1>
      <p id="rol">Rol: {sesion.perfil}</p>
      <div id="informacion-extra">
          <p>Desde aquí puedes consultar un resumen de tus responsabilidades, permisos y las herramientas disponibles para gestionar BancoSol de forma eficiente.</p>
      </div>
    </main>
  )
}

export default Homepage