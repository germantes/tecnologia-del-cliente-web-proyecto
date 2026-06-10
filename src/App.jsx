import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, Link } from 'react-router-dom'
import './App.css'
import { Header, Footer } from './components/header_footer'
import Homepage from './components/homepage'
import Cadenas from './components/cadenas'
import EditPage from './components/EditPage'

import Usuarios from './components/Usuarios.jsx'
import CuadroMando from './components/CuadroMando.jsx'
import RutaProtegida from './components/RutaProtegida.jsx'
import UsuarioCrear from './components/UsuarioCrear.jsx'
import UsuarioEditar from './components/UsuarioEditar.jsx'

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

// Mantenemos ReactHome por si necesitas acceder a tu menú provisional escribiendo /react-home
function ReactHome() {
    return (
        <main className="react-shell">
            <header className="react-header">
                <h1>BancoSol React</h1>
                <p>Esta página React sirve como punto de entrada provisional a tus pantallas.</p>
                <nav className="react-nav" style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '20px' }}>
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

                {/* PÁGINAS CREADAS POR TUS COMPAÑEROS */}
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
                    path="/edit/:entityType"
                    element={
                        <RequireAuth>
                            <Header />
                            <EditPage />
                            <Footer />
                        </RequireAuth>
                    }
                />

                {/* TUS PÁGINAS DE USUARIOS Y CUADRO DE MANDO */}
                <Route path="/usuarios" element={
                    <RutaProtegida>
                        <Usuarios />
                    </RutaProtegida>
                } />
                <Route path="/usuarios/crear" element={
                    <RutaProtegida>
                        <UsuarioCrear />
                    </RutaProtegida>
                } />
                <Route path="/usuarios/editar/:id" element={
                    <RutaProtegida>
                        <UsuarioEditar />
                    </RutaProtegida>
                } />
                <Route path="/dashboard" element={
                    <RutaProtegida>
                        <CuadroMando />
                    </RutaProtegida>
                } />

                {/* RUTA AUXILIAR PARA TU MENÚ PROVISIONAL */}
                <Route path="/react-home" element={<ReactHome />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App