import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/usuario_formulario.css';

export default function UsuarioCrear() {
    const navigate = useNavigate();
    const [listaCPs, setListaCPs] = useState([]);
    const [errorMensaje, setErrorMensaje] = useState(null);

    const [formData, setFormData] = useState({
        nombre_completo: '',
        email: '',
        telefono: '',
        domicilio: '',
        idCp: '',
        contrasenia: '',
        confirmContrasenia: '',
        rol: 'ADMINISTRADOR'
    });

    useEffect(() => {
        let ignore = false;
        async function fetchCPs() {
            const token = sessionStorage.getItem('token');
            const API_BASE = window.API_URL || 'http://localhost:3000';
            try {
                const res = await fetch(`${API_BASE}/api/cps`, { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await res.json();
                if (!ignore) {
                    // ORDENAR LOS CPs NUMÉRICAMENTE
                    const cpsOrdenados = data.sort((a, b) => parseInt(a.cp) - parseInt(b.cp));
                    setListaCPs(cpsOrdenados);
                }
            } catch (err) { console.error(err); }
        }
        fetchCPs();
        return () => { ignore = true; };
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.contrasenia !== formData.confirmContrasenia) {
            setErrorMensaje("Las contraseñas introducidas no coinciden.");
            return;
        }

        const token = sessionStorage.getItem('token');
        const API_BASE = window.API_URL || 'http://localhost:3000';

        try {
            const res = await fetch(`${API_BASE}/usuarios`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                navigate('/usuarios'); // Volvemos al listado si todo va bien
            } else {
                setErrorMensaje("Error al crear el usuario. Revisa los datos.");
            }
        } catch (err) {
            setErrorMensaje("Error de conexión con el servidor.");
        }
    };

    return (
        <>
            <main className="form-main">
                <form onSubmit={handleSubmit} className="form-container">
                    <div className="total-form">
                        <div className="form-header">
                            <h1>Crear Nuevo Usuario</h1>
                        </div>

                        {errorMensaje && <div className="error-banner">{errorMensaje}</div>}

                        <div className="tablas-form">
                            <table>
                                <tbody>
                                <tr><td className="etiqueta-campo">Nombre Completo</td><td><input type="text" name="nombre_completo" className="form-input" required onChange={handleChange} /></td></tr>
                                <tr><td className="etiqueta-campo">Email</td><td><input type="email" name="email" className="form-input" required onChange={handleChange} /></td></tr>
                                <tr><td className="etiqueta-campo">Teléfono</td><td><input type="text" name="telefono" className="form-input" onChange={handleChange} /></td></tr>
                                <tr><td className="etiqueta-campo">Domicilio</td><td><textarea name="domicilio" rows="3" className="form-input" onChange={handleChange}></textarea></td></tr>
                                <tr>
                                    <td className="etiqueta-campo">Cód. Postal / Localidad</td>
                                    <td>
                                        <select
                                            name="idCp"
                                            value={formData.idCp}
                                            className="form-input"
                                            required
                                            onChange={handleChange}
                                        >
                                            <option value="">-- Seleccione un CP --</option>
                                            {listaCPs.map(cp => (
                                                <option key={cp.cp} value={String(cp.cp)}>
                                                    {cp.cp} - {cp.localidad}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                                <tr><td className="etiqueta-campo">Contraseña</td><td><input type="password" name="contrasenia" className="form-input" required onChange={handleChange} /></td></tr>
                                <tr><td className="etiqueta-campo">Confirmar Contraseña</td><td><input type="password" name="confirmContrasenia" className="form-input" required onChange={handleChange} /></td></tr>
                                <tr>
                                    <td className="etiqueta-campo">Rol</td>
                                    <td>
                                        <select name="rol" className="form-input" required onChange={handleChange}>
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
                            <Link to="/usuarios" className="btn-cerrar">Cancelar</Link>
                            <button type="submit" className="btn-guardar">Crear</button>
                        </div>
                    </div>
                </form>
            </main>
        </>
    );
}