import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthHeaders, getId } from './session.js';
import formStyles from '../styles/edit.module.css';

const API_BASE = typeof window !== 'undefined' && window.API_URL
    ? window.API_URL
    : 'http://localhost:3000';

async function obtenerJson(respuesta, mensajePorDefecto) {
    const datos = await respuesta.json().catch(() => null);

    if (!respuesta.ok) {
        throw new Error(datos?.message || mensajePorDefecto);
    }

    return datos;
}

function Profile() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nombre_completo: '',
        email: '',
        telefono: '',
        domicilio: '',
        cp: '',
        rol: ''
    });
    const [listaCPs, setListaCPs] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(Boolean(getId()));
    const [saving, setSaving] = useState(false);

    const userId = getId();

    useEffect(() => {
        if (!userId) return;

        async function fetchData() {
            try {
                const [userRes, cpsRes] = await Promise.all([
                    fetch(`${API_BASE}/api/usuarios/${encodeURIComponent(userId)}`, {
                        headers: getAuthHeaders(),
                    }),
                    fetch(`${API_BASE}/api/cp`, { headers: getAuthHeaders() }),
                ]);

                const user = await obtenerJson(userRes, 'Error al cargar datos del perfil');
                const cps = cpsRes.ok ? await cpsRes.json() : [];
                const listaCodigosPostales = Array.isArray(cps) ? cps : [];

                setListaCPs(listaCodigosPostales.sort((a, b) => parseInt(a.cp) - parseInt(b.cp)));

                const cpValue = user.cp && typeof user.cp === 'object'
                    ? String(user.cp.cp)
                    : String(user.cp || user.idCp || '');

                setFormData({
                    nombre_completo: user.nombre_completo || user.nombreCompleto || '',
                    email: user.email || '',
                    telefono: user.telefono || '',
                    domicilio: user.domicilio || '',
                    cp: cpValue,
                    rol: user.rol || user.puesto || ''
                });
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [userId]);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE}/api/usuarios/${encodeURIComponent(userId)}`, {
                method: 'PUT',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                throw new Error(errData?.message || 'Error al actualizar el perfil');
            }

            const data = await res.json();
            if (data.token) {
                sessionStorage.setItem('token', data.token);
            }

            navigate('/homepage');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <main className={formStyles['form-wrapper']}>
                <p>...</p>
            </main>
        );
    }

    if (!userId) {
        return (
            <main className={formStyles['form-wrapper']}>
                <div className={formStyles['error-banner']}>No se pudo identificar al usuario.</div>
            </main>
        );
    }

    return (
        <main className={formStyles['form-wrapper']}>
            <form onSubmit={handleSubmit} className={formStyles['form-element']}>
                <div className={formStyles['total']}>
                    <div className={formStyles['form-header']}>
                        <h1>Mi Perfil</h1>
                    </div>

                    {error && <div className={formStyles['error-banner']}>{error}</div>}

                    <div className={formStyles['tablas']}>
                        <table>
                            <tbody>
                                <tr>
                                    <td className={formStyles['etiqueta-campo']}>Nombre Completo</td>
                                    <td>
                                        <input
                                            type="text"
                                            name="nombre_completo"
                                            value={formData.nombre_completo}
                                            required
                                            onChange={handleChange}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td className={formStyles['etiqueta-campo']}>Email</td>
                                    <td>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            required
                                            onChange={handleChange}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td className={formStyles['etiqueta-campo']}>Teléfono</td>
                                    <td>
                                        <input
                                            type="text"
                                            name="telefono"
                                            value={formData.telefono}
                                            onChange={handleChange}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td className={formStyles['etiqueta-campo']}>Domicilio</td>
                                    <td>
                                        <textarea
                                            name="domicilio"
                                            rows="3"
                                            value={formData.domicilio}
                                            onChange={handleChange}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td className={formStyles['etiqueta-campo']}>Cód. Postal / Localidad</td>
                                    <td>
                                        <select name="cp" value={formData.cp} required onChange={handleChange}>
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
                                    <td className={formStyles['etiqueta-campo']}>Rol</td>
                                    <td>
                                        <select name="rol" value={formData.rol} disabled>
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

                    <div className={formStyles['botones']}>
                        <button type="button" className={formStyles['btn-cerrar']} onClick={() => navigate('/homepage')}>
                            Cancelar
                        </button>
                        <button type="submit" className={formStyles['btn-guardar']} disabled={saving}>
                            {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </div>
            </form>
        </main>
    );
}

export default Profile;
