import { Link } from 'react-router-dom';
import usuariosStyles from '../styles/usuarios.module.css';

export default function UsuarioCard({ usuario }) {
    return (
        <div className={usuariosStyles['usuario-card']}>
            <h3 className={usuariosStyles['titulo-usuario']}>
                {usuario.nombre_completo || usuario.nombreCompleto}
            </h3>

            <p><strong>Email: </strong>{usuario.email}</p>
            <p><strong>Teléfono: </strong>{usuario.telefono || "N/A"}</p>
            <p><strong>Domicilio: </strong>{usuario.domicilio || "N/A"}</p>
            <p><strong>CP: </strong>{usuario.cp ? (usuario.cp.cp || usuario.cp) : "N/A"}</p>
            <p><strong>Rol: </strong>{usuario.rol || usuario.puesto || "N/A"}</p>

            <div className={usuariosStyles['botones-card']}>
                {/* Aquí preparamos la ruta para cuando crees el componente de Editar en React */}
                <Link to={`/usuarios/editar/${usuario.id_usuario || usuario.idUsuario}`} className={usuariosStyles['btn-editar']} style={{ textDecoration: 'none' }}>
                    Editar
                </Link>
            </div>
        </div>
    );
}