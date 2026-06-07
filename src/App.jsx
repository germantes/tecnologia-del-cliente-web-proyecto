import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import './App.css'
import { Header, Footer } from './components/header_footer'
import Homepage from './components/homepage'

const legacyLinks = [
  { label: 'Login', href: '/html/index.html' },
  { label: 'Inicio', href: '/' },
  { label: 'Campanias', href: '/html/campanias.html' },
  { label: 'Zonas', href: '/html/zonas.html' },
  { label: 'Tiendas', href: '/html/tiendas.html' },
  { label: 'Entidades', href: '/html/entidades.html' },
  { label: 'Voluntarios', href: '/html/voluntarios.html' },
]

function App() {
  return (
    <BrowserRouter>
      <Header />

      <Routes>
        <Route path="/" element={<Homepage />} />
      </Routes>

      <Footer />
    </BrowserRouter>
  )
}

export default App