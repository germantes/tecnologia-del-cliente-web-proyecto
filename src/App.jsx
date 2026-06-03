import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import './App.css'

const legacyLinks = [
  { label: 'Login', href: '/html/index.html' },
  { label: 'Inicio', href: '/html/inicio.html' },
  { label: 'Campanias', href: '/html/campanias.html' },
  { label: 'Zonas', href: '/html/zonas.html' },
  { label: 'Tiendas', href: '/html/tiendas.html' },
  { label: 'Entidades', href: '/html/entidades.html' },
  { label: 'Voluntarios', href: '/html/voluntarios.html' },
]

function ReactHome() {
  return (
    <main className="react-shell">
      <header className="react-header">
        <h1>BancoSol React</h1>
        <p>
          Esta pagina React sirve como punto de entrada a las pantallas HTML
          legacy.
        </p>
        <nav className="react-nav">
          <Link to="/react">Ir a pagina React</Link>
        </nav>
      </header>

      <section className="legacy-links" aria-label="Enlaces a HTML legacy">
        {legacyLinks.map((link) => (
          <a key={link.href} href={link.href} className="legacy-link">
            {link.label}
          </a>
        ))}
      </section>
    </main>
  )
}

function ReactInfo() {
  return (
    <main className="react-shell">
      <header className="react-header">
        <h1>Pagina React</h1>
        <p>Esta ruta es interna de React Router.</p>
        <nav className="react-nav">
          <Link to="/">Volver al inicio React</Link>
        </nav>
      </header>
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ReactHome />} />
        <Route path="/react" element={<ReactInfo />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
