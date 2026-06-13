import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import UsuarioCard from './UsuarioCard.jsx';

// Importación clásica de CSS (Sin modules)
import '../styles/usuarios.css';

/**
 * Componente principal para el listado de Usuarios.
 * Conecta con el servidor Express/Supabase para descargar la lista y la renderiza en una cuadrícula.
 */
export default function Usuarios() {
    // Estados de React para manejar los datos, la rueda de carga y los posibles errores
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    // useEffect se ejecuta una única vez al montar el componente (gracias al array vacío [])
    useEffect(() => {
        let ignore = false; // Bandera para evitar fugas de memoria si el componente se desmonta rápido
        const token = sessionStorage.getItem('token');
        const API_BASE = window.API_URL || 'http://localhost:3000';

        async function descargarUsuarios() {
            try {
                // Petición HTTP protegida con JWT
                const response = await fetch(`${API_BASE}/api/usuarios`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    throw new Error('Error al descargar la lista de usuarios.');
                }

                const json = await response.json();

                if (!ignore) {
                    // Ordenamos los usuarios por ID de menor a mayor antes de guardarlos en el estado
                    const usuariosOrdenados = json.sort((a, b) => {
                        const idA = parseInt(a.id_usuario || a.idUsuario || 0);
                        const idB = parseInt(b.id_usuario || b.idUsuario || 0);
                        return idA - idB;
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

    // Renderizado Condicional: Mientras descarga, muestra el spinner
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

    // Renderizado Condicional: Si falló la petición, muestra el mensaje rojo
    if (error) {
        return (
            <main className="main-error">
                <h2 className="mensaje-error">{error.message}</h2>
            </main>
        );
    }

    // Renderizado Principal
    return (
        <main className="usuarios-main">
            <header className="header-titulo">
                <h1>Gestión de Usuarios</h1>
            </header>

            <div className="crear-container">
                <Link to="/usuarios/crear" style={{ textDecoration: 'none' }}>
                    <button type="button" className="btn-crear">Crear Usuario</button>
                </Link>
            </div>

            <div className="usuarios-grid">
                {usuarios.length > 0 ? (
                    // Mapeo del array: Por cada usuario en JSON, renderiza un componente Tarjeta
                    usuarios.map(usuario => (
                        <UsuarioCard key={usuario.id_usuario || usuario.idUsuario} usuario={usuario} />
                    ))
                ) : (
                    <h3 className="mensaje-vacio">No hay usuarios registrados.</h3>
                )}
            </div>
        </main>
    );
}