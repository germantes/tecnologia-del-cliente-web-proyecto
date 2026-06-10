import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import UsuarioCard from './UsuarioCard.jsx';
import '../styles/usuarios.css';

export default function Usuarios() {
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let ignore = false;
        const token = sessionStorage.getItem('token');
        const API_BASE = window.API_URL || 'http://localhost:3000';

        async function descargarUsuarios() {
            try {
                const response = await fetch(`${API_BASE}/api/usuarios`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    throw new Error('Error al descargar la lista de usuarios.');
                }

                const json = await response.json();

                if (!ignore) {
                    // AQUÍ HACEMOS LA MAGIA DEL ORDENADO:
                    // Usamos sort para comparar los IDs (normalizando si es id_usuario o idUsuario)
                    const usuariosOrdenados = json.sort((a, b) => {
                        const idA = parseInt(a.id_usuario || a.idUsuario || 0);
                        const idB = parseInt(b.id_usuario || b.idUsuario || 0);
                        return idA - idB; // De menor a mayor
                    });

                    setUsuarios(usuariosOrdenados);
                    setCargando(false);
                }
            } catch (err) {
                if (!ignore) {
                    setError(err);
                    setCargando(false);
                }
            }
        }

        descargarUsuarios();
        return () => { ignore = true; };
    }, []);

    if (cargando) {
        return (
            <main className="main-error">
                <div style={{ textAlign: 'center', marginTop: '50px' }}>
                    <h3 style={{ color: '#323266' }}>Cargando usuarios...</h3>
                    <div className="spinner"></div>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="main-error">
                <h2 className="mensaje-error">{error.message}</h2>
            </main>
        );
    }

    return (
        <>
            <main className="usuarios-main">
                <header className="header-titulo">
                    <h1>Gestión de Usuarios</h1>
                </header>

                <div className="crear-container">
                    {/* Enlace preparado para la futura pantalla de creación en React */}
                    <Link to="/usuarios/crear" style={{ textDecoration: 'none' }}>
                        <button type="button" className="btn-crear">Crear Usuario</button>
                    </Link>
                </div>

                <div className="usuarios-grid">
                    {usuarios.length > 0 ? (
                        usuarios.map(usuario => (
                            <UsuarioCard key={usuario.id_usuario || usuario.idUsuario} usuario={usuario} />
                        ))
                    ) : (
                        <h3 className="mensaje-vacio">No hay usuarios registrados.</h3>
                    )}
                </div>
            </main>
        </>
    );
}