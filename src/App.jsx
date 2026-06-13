import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, Link } from 'react-router-dom'
import { Header, Footer } from './components/header_footer'
import Homepage from './components/homepage'
import Cadenas from './components/cadenas'
import Campanias from './components/campanias'
import Zonas from './components/zonas'
import EditPage from './components/EditPage'

import Usuarios from './components/Usuarios.jsx'
import CuadroMando from './components/CuadroMando.jsx'
import UsuarioCrear from './components/UsuarioCrear.jsx'
import UsuarioEditar from './components/UsuarioEditar.jsx'
import Sugerencias from './components/Sugerencias'
import SugerenciaDetalle from './components/SugerenciaDetalle'
import CrearSugerencia from './components/CrearSugerencia'
import Profile from './components/Profile'

// Importar la función getPerfil desde session.js
import { getPerfil } from './components/session.js'

function LoginRedirect() {
    const token = sessionStorage.getItem('token')

    useEffect(() => {
        if (!token) {
            window.location.replace('/html/index.html')
        }
    }, [token])

    if (token) {
        return <Navigate to="/homepage" replace />
    }

    return null
}

function RequireAuth({ children }) {
    const token = sessionStorage.getItem('token')

    useEffect(() => {
        if (!token) {
            window.location.replace('/html/index.html')
        }
    }, [token])

    if (!token) {
        return null
    }

    return children
}

// Localizar el componente guardián RequireAdmin
function RequireAdmin({ children }) {
    const token = sessionStorage.getItem('token')

    // Eliminar la obtención directa con sessionStorage
    // y reemplazarla por la llamada a getPerfil() que gestiona JWT y fallbacks.
    const rol = getPerfil()

    useEffect(() => {
        if (!token) {
            window.location.replace('/html/index.html')
        }
    }, [token])

    if (!token) {
        return null
    }

    // No cambiar el resto de la lógica (redirección)
    // Si está logueado pero NO es administrador, lo redirigimos al homepage de React
    if (rol !== 'ADMINISTRADOR') {
        return <Navigate to="/homepage" replace />
    }

    return children
}

// Mantenemos ReactHome por si necesitas acceder a tu menú provisional escribiendo /react-home
function ReactHome() {
    return (
        <main className={appStyles['react-shell']}>
            <header className={appStyles['react-header']}>
                <h1>BancoSol React</h1>
                <p>Esta página React sirve como punto de entrada provisional a tus pantallas.</p>
                <nav className={appStyles['react-nav']} style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '20px' }}>
                    <Link to="/usuarios" className="btn-react-nav">Gestión de Usuarios</Link>
                    <Link to="/dashboard" className="btn-react-nav">Cuadro de Mando</Link>
                </nav>
            </header>
        </main>
    )
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* ENTRADA PRINCIPAL CON REDIRECCIÓN DE TU EQUIPO */}
                <Route path="/" element={<LoginRedirect />} />

                {/* PÁGINAS CREADAS POR TUS COMPAÑEROS (ACCESO GENERAL LOGUEADO) */}
                <Route
                    path="/homepage"
                    element={
                        <RequireAuth>
                            <Header />
                            <Homepage />
                            <Footer />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/cadenas"
                    element={
                        <RequireAuth>
                            <Header />
                            <Cadenas />
                            <Footer />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/campanias"
                    element={
                        <RequireAuth>
                            <Header />
                            <Campanias />
                            <Footer />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/zonas"
                    element={
                        <RequireAuth>
                            <Header />
                            <Zonas />
                            <Footer />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/sugerencias"
                    element={
                        <RequireAuth>
                            <RequireAdmin>
                                <Header />
                                <Sugerencias />
                                <Footer />
                            </RequireAdmin>
                        </RequireAuth>
                    }
                />
                <Route
                    path="/sugerencias/:id"
                    element={
                        <RequireAuth>
                            <RequireAdmin>
                                <Header />
                                <SugerenciaDetalle />
                                <Footer />
                            </RequireAdmin>
                        </RequireAuth>
                    }
                />
                <Route
                    path="/sugerencias/crear"
                    element={
                        <RequireAuth>
                            <Header />
                            <CrearSugerencia />
                            <Footer />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/edit/:entityType"
                    element={
                        <RequireAuth>
                            <Header />
                            <EditPage />
                            <Footer />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/perfil"
                    element={
                        <RequireAuth>
                            <Header />
                            <Profile />
                            <Footer />
                        </RequireAuth>
                    }
                />

                {/* TUS PÁGINAS PROTEGIDAS (SOLO ADMINISTRADORES) */}
                <Route path="/usuarios" element={
                    <RequireAdmin>
                        <Header />
                        <Usuarios />
                        <Footer />
                    </RequireAdmin>
                } />
                <Route path="/usuarios/crear" element={
                    <RequireAdmin>
                        <Header />
                        <UsuarioCrear />
                        <Footer />
                    </RequireAdmin>
                } />
                <Route path="/usuarios/editar/:id" element={
                    <RequireAdmin>
                        <Header />
                        <UsuarioEditar />
                        <Footer />
                    </RequireAdmin>
                } />
                <Route path="/dashboard" element={
                    <RequireAdmin>
                        <Header />
                        <CuadroMando />
                        <Footer />
                    </RequireAdmin>
                } />

                {/* RUTA AUXILIAR PARA TU MENÚ PROVISIONAL */}
                <Route path="/react-home" element={<ReactHome />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App