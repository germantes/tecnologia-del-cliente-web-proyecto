import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

// Importación clásica de CSS
import '../styles/usuario_formulario.css';

/**
 * Componente Formulario para editar y sobreescribir usuarios existentes.
 */
export default function UsuarioEditar() {
    const { id } = useParams(); // Hook crítico: Extrae la ID del usuario que viene inyectada en la URL
    const navigate = useNavigate();
    const [listaCPs, setListaCPs] = useState([]);
    const [errorMensaje, setErrorMensaje] = useState(null);
    const [cargando, setCargando] = useState(true);

    const [formData, setFormData] = useState({
        nombre_completo: '',
        email: '',
        telefono: '',
        domicilio: '',
        idCp: '',
        rol: ''
    });

    // 1. Carga inicial: Extrae de forma paralela los datos del usuario actual y la lista de CPs
    useEffect(() => {
        let ignore = false;
        async function fetchData() {
            const token = sessionStorage.getItem('token');
            const API_BASE = window.API_URL || 'http://localhost:3000';
            try {
                // Promise.all permite hacer las dos peticiones a la vez (más rápido)
                const [resUsuario, resCPs] = await Promise.all([
                    fetch(`${API_BASE}/usuarios/${id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch(`${API_BASE}/api/cps`, { headers: { 'Authorization': `Bearer ${token}` } })
                ]);

                if (!resUsuario.ok) throw new Error("Usuario no encontrado");

                const usuario = await resUsuario.json();
                const cps = await resCPs.json();

                if (!ignore) {
                    const cpsOrdenados = cps.sort((a, b) => parseInt(a.cp) - parseInt(b.cp));
                    setListaCPs(cpsOrdenados);

                    // Normalización de datos: Previene fallos si la BD envía objetos anidados en vez de strings
                    const cpValue = usuario.cp && typeof usuario.cp === 'object'
                        ? String(usuario.cp.cp)
                        : String(usuario.cp || usuario.idCp || '');

                    // Pre-rellena los inputs del formulario con los datos bajados de la BD
                    setFormData({
                        nombre_completo: usuario.nombre_completo || usuario.nombreCompleto || '',
                        email: usuario.email || '',
                        telefono: usuario.telefono || '',
                        domicilio: usuario.domicilio || '',
                        idCp: cpValue,
                        rol: usuario.rol || usuario.puesto || 'ADMINISTRADOR'
                    });
                    setCargando(false);
                }
            } catch (err) {
                if (!ignore) { setErrorMensaje(err.message); setCargando(false); }
            }
        }
        fetchData();
        return () => { ignore = true; };
    }, [id]);

    const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); };

    // Envío del Formulario (Actualización)
    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = sessionStorage.getItem('token');
        const API_BASE = window.API_URL || 'http://localhost:3000';

        try {
            // Petición PUT (Restful standard para actualizaciones totales)
            const res = await fetch(`${API_BASE}/usuarios/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            if (res.ok) navigate('/usuarios');
            else setErrorMensaje("Error al actualizar el usuario.");
        } catch (err) { setErrorMensaje("Error de conexión."); }
    };

    // Función destructiva: Borrar usuario
    const handleDelete = async () => {
        // Bloqueo de seguridad preventivo
        const confirmacion = window.confirm(`¿Estás seguro de que deseas eliminar permanentemente a ${formData.nombre_completo}?`);
        if (!confirmacion) return;

        const token = sessionStorage.getItem('token');
        const API_BASE = window.API_URL || 'http://localhost:3000';

        try {
            const response = await fetch(`${API_BASE}/usuarios/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (response.ok && data.success !== false) {
                navigate('/usuarios');
            } else {
                setErrorMensaje(data.message || 'Error al eliminar. Es posible que el usuario tenga dependencias (turnos, entidades...).');
                window.scrollTo(0, 0); // Sube la pantalla para que el usuario vea el mensaje rojo
            }
        } catch (error) {
            console.error("Error en la eliminación:", error);
            setErrorMensaje("Error de conexión al intentar eliminar el usuario.");
            window.scrollTo(0, 0);
        }
    };

    if (cargando) return <main className="form-main"><h2 style={{color: '#323266'}}>Cargando datos...</h2></main>;
    if (errorMensaje && !formData.email) return <main className="form-main"><h2 className="mensaje-error">{errorMensaje}</h2></main>;

    return (
        <main className="form-main">
            <form onSubmit={handleSubmit} className="form-container">
                <div className="total-form">
                    <div className="form-header">
                        <h1>Editando a {formData.nombre_completo}</h1>
                    </div>

                    {errorMensaje && <div className="error-banner">{errorMensaje}</div>}

                    <div className="tablas-form">
                        <table>
                            <tbody>
                            <tr><td className="etiqueta-campo">Nombre Completo</td><td><input type="text" name="nombre_completo" value={formData.nombre_completo} className="form-input" required onChange={handleChange} /></td></tr>
                            <tr><td className="etiqueta-campo">Email</td><td><input type="email" name="email" value={formData.email} className="form-input" required onChange={handleChange} /></td></tr>
                            <tr><td className="etiqueta-campo">Teléfono</td><td><input type="text" name="telefono" value={formData.telefono} className="form-input" onChange={handleChange} /></td></tr>
                            <tr><td className="etiqueta-campo">Domicilio</td><td><textarea name="domicilio" rows="3" value={formData.domicilio} className="form-input" onChange={handleChange}></textarea></td></tr>
                            <tr>
                                <td className="etiqueta-campo">Cód. Postal / Localidad</td>
                                <td>
                                    <select name="idCp" value={formData.idCp} className="form-input" required onChange={handleChange}>
                                        <option value="">-- Seleccione un CP --</option>
                                        {listaCPs.map(cp => (
                                            <option key={cp.cp} value={String(cp.cp)}>
                                                {cp.cp} - {cp.localidad}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <td className="etiqueta-campo">Rol</td>
                                <td>
                                    <select name="rol" value={formData.rol} className="form-input" required onChange={handleChange}>
                                        <option value="ADMINISTRADOR">Administrador</option>
                                        <option value="COORDINADOR">Coordinador</option>
                                        <option value="CAPITAN">Capitán</option>
                                        <option value="RESPONSABLE-ENTIDAD">Responsable Entidad</option>
                                        <option value="RESPONSABLE-TIENDA">Responsable Tienda</option>
                                    </select>
                                </td>
                            </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="botones-form">
                        <button type="button" onClick={handleDelete} className="btn-eliminar">Eliminar</button>
                        <Link to="/usuarios" className="btn-cerrar">Cancelar</Link>
                        <button type="submit" className="btn-guardar">Guardar</button>
                    </div>
                </div>
            </form>
        </main>
    );
}