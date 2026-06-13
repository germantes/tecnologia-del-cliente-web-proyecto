import { Link } from 'react-router-dom';

// Importación clásica de CSS
import '../styles/usuarios.css';

/**
 * Componente "Dumb/Presentational".
 * Su única responsabilidad es recibir un objeto "usuario" por props y dibujarlo.
 */
export default function UsuarioCard({ usuario }) {
    return (
        <div className="usuario-card">
            <h3 className="titulo-usuario">
                {/* Fallback de compatibilidad: Soporta snake_case (Supabase) o camelCase (Spring Boot) */}
                {usuario.nombre_completo || usuario.nombreCompleto}
            </h3>

            <p><strong>Email: </strong>{usuario.email}</p>
            <p><strong>Teléfono: </strong>{usuario.telefono || "N/A"}</p>
            <p><strong>Domicilio: </strong>{usuario.domicilio || "N/A"}</p>

            {/* Si 'cp' es un objeto (relación JPA), saca la propiedad interna, si es string (Supabase), lo imprime tal cual */}
            <p><strong>CP: </strong>{usuario.cp ? (usuario.cp.cp || usuario.cp) : "N/A"}</p>

            <p><strong>Rol: </strong>{usuario.rol || usuario.puesto || "N/A"}</p>

            <div className="botones-card">
                {/* Navegación fluida de React Router hacia la pantalla de edición del usuario concreto */}
                <Link to={`/usuarios/editar/${usuario.id_usuario || usuario.idUsuario}`} className="btn-editar" style={{ textDecoration: 'none' }}>
                    Editar
                </Link>
            </div>
        </div>
    );
}