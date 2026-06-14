import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuthHeaders } from './session.js'
import '../styles/sugerencias.css'

const API_BASE = typeof window !== 'undefined' && window.API_URL
    ? window.API_URL
    : 'http://localhost:3000'

function formatDate(value) {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString('es-ES', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
    })
}

function Sugerencias() {
    const [sugerencias, setSugerencias] = useState([])
    const [userNames, setUserNames] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let active = true

        async function loadSugerencias() {
            try {
                const [sugResp, usrResp] = await Promise.all([
                    fetch(`${API_BASE}/api/sugerencias`, { headers: getAuthHeaders() }),
                    fetch(`${API_BASE}/api/usuarios`, { headers: getAuthHeaders() }),
                ])

                if (!sugResp.ok) throw new Error(`Error cargando sugerencias (${sugResp.status})`)
                if (!usrResp.ok) throw new Error(`Error cargando usuarios (${usrResp.status})`)

                const [sugerenciasData, usuariosData] = await Promise.all([
                    sugResp.json(),
                    usrResp.json(),
                ])

                if (!active) return

                // Mapa de usuarios
                const userMap = usuariosData.reduce((m, u) => {
                    if (u?.id_usuario !== undefined) m[String(u.id_usuario)] = u.nombre_completo
                    return m
                }, {})
                setUserNames(userMap)
                setSugerencias(sugerenciasData)

            } catch (err) {
                if (active) setError(err.message || 'Error cargando sugerencias')
            } finally {
                if (active) setLoading(false)
            }
        }

        loadSugerencias()
        return () => { active = false }
    }, [])

    const renderUserName = (userId) => {
        if (userId === null || userId === undefined || userId === '') return '-'
        return userNames[String(userId)] || String(userId)
    }

    return (
        <main className="main sugerencias-main">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Sugerencias de Cambios</h1>
                </div>
            </div>

            {loading && (
                <div className="loading">
                    <span className="spinner"></span> Cargando sugerencias...
                </div>
            )}

            {error && <div className="alert alert-error">Error: {error}</div>}

            {!loading && !error && (
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Tipo</th>
                                <th>ID Entidad</th>
                                <th>Propuesto por</th>
                                <th>Fecha</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sugerencias.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="empty-row">
                                        No hay sugerencias registradas.
                                    </td>
                                </tr>
                            ) : (
                                sugerencias.map((sug) => (
                                    <tr key={sug.id_sugerencia}>
                                        <td>{sug.id_sugerencia}</td>
                                        <td>{sug.tipo_entidad || '-'}</td>
                                        <td>{sug.id_entidad_original ?? '-'}</td>
                                        <td>{renderUserName(sug.id_propuesto_por)}</td>
                                        <td>{formatDate(sug.fecha_propuesta)}</td>
                                        <td>
                                            <span className={`estado-badge estado-${(sug.estado || '').toLowerCase()}`}>
                                                {sug.estado || '-'}
                                            </span>
                                        </td>
                                        <td>
                                            <Link to={`/sugerencias/${sug.id_sugerencia}`} className="link-revisar">
                                                Ver detalle
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    )
}

export default Sugerencias
