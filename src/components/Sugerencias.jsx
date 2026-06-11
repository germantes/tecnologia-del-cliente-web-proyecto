import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuthHeaders } from './session.js'
import '../styles/sugerencias.css'

// ─────────────────────────────────────────────────────────────────────────────
// Configuración de entidades (para resolver la entidad original → nombre)
// ─────────────────────────────────────────────────────────────────────────────

const ENTITY_CONFIG = {
    cadena: { endpoint: '/api/cadenas', idField: 'id_cadena', nameFields: ['nombre_particular', 'establecimiento'], label: 'Cadena' },
    campania: { endpoint: '/api/campanias', idField: 'id_campania', nameFields: ['nombre'], label: 'Campaña' },
    zona: { endpoint: '/api/cp', idField: 'id_zona', nameFields: ['zona_geografica'], label: 'Zona' },
    entidad: { endpoint: '/api/entidades', idField: 'id_entidad', nameFields: ['nombre'], label: 'Entidad' },
    tienda: { endpoint: '/api/tiendas', idField: 'id_tienda', nameFields: ['domicilio'], label: 'Tienda' },
    usuario: { endpoint: '/api/usuarios', idField: 'id_usuario', nameFields: ['nombre_completo', 'nombre'], label: 'Usuario' },
    voluntario: { endpoint: '/api/voluntarios', idField: 'id_voluntario', nameFields: ['nombre', 'apellido_1'], label: 'Voluntario' },
}

function formatDate(value) {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString('es-ES', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
    })
}

function getFirstValue(obj, fields) {
    for (const f of fields) {
        if (obj[f] !== undefined && obj[f] !== null && obj[f] !== '') return String(obj[f])
    }
    return null
}

// Carga todas las entidades de un tipo y construye un índice id → nombre
async function buildEntityIndex(tipo) {
    const config = ENTITY_CONFIG[tipo]
    if (!config) return {}
    try {
        const resp = await fetch(config.endpoint, { headers: getAuthHeaders() })
        if (!resp.ok) return {}
        const data = await resp.json()
        const index = {}
        for (const row of (Array.isArray(data) ? data : [])) {
            const id = row[config.idField]
            if (id !== undefined && id !== null) {
                index[String(id)] = getFirstValue(row, config.nameFields) ?? `#${id}`
            }
        }
        return index
    } catch { return {} }
}

function Sugerencias() {
    const [sugerencias, setSugerencias] = useState([])
    const [userNames, setUserNames] = useState({})
    // Índice por tipo: { cadena: { '1': 'Mercadona', ... }, campania: {...}, ... }
    const [entityIndexes, setEntityIndexes] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let active = true

        async function loadSugerencias() {
            try {
                const [sugResp, usrResp] = await Promise.all([
                    fetch('/api/sugerencias', { headers: getAuthHeaders() }),
                    fetch('/api/usuarios', { headers: getAuthHeaders() }),
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

                // Detectar qué tipos de entidad hay para precargar sus índices
                const tiposNecesarios = [...new Set(
                    sugerenciasData.map((s) => s.tipo_entidad?.toLowerCase()).filter(Boolean)
                )]

                if (tiposNecesarios.length > 0) {
                    const indexes = {}
                    await Promise.all(
                        tiposNecesarios.map(async (tipo) => {
                            indexes[tipo] = await buildEntityIndex(tipo)
                        })
                    )
                    if (active) setEntityIndexes(indexes)
                }
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

    const renderEntityName = (tipo, idOriginal) => {
        if (idOriginal === null || idOriginal === undefined) return '-'
        const config = ENTITY_CONFIG[tipo?.toLowerCase()]
        const label = config?.label ?? tipo ?? '?'
        const index = entityIndexes[tipo?.toLowerCase()] ?? {}
        const name = index[String(idOriginal)]
        return name ? `${label}: ${name}` : `${label} #${idOriginal}`
    }

    const renderEntityType = (tipo) => {
        return ENTITY_CONFIG[tipo?.toLowerCase()]?.label ?? tipo ?? '-'
    }

    return (
        <main className="main">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Sugerencias de Cambio</h1>
                    <p className="page-sub">
                        Listado de sugerencias de cambio registradas en la base de datos.
                    </p>
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
                                <th>Tipo</th>
                                <th>Entidad afectada</th>
                                <th>Propuesto por</th>
                                <th>Fecha propuesta</th>
                                <th>Estado</th>
                                <th>Revisado por</th>
                                <th>Fecha revisión</th>
                                <th>Detalle</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sugerencias.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="empty-row">
                                        No hay sugerencias registradas.
                                    </td>
                                </tr>
                            ) : (
                                sugerencias.map((sug) => (
                                    <tr key={sug.id_sugerencia}>
                                        <td>{renderEntityType(sug.tipo_entidad)}</td>
                                        <td>{renderEntityName(sug.tipo_entidad, sug.id_entidad_original)}</td>
                                        <td>{renderUserName(sug.id_propuesto_por)}</td>
                                        <td>{formatDate(sug.fecha_propuesta)}</td>
                                        <td>
                                            <span className={`estado-badge estado-${(sug.estado || '').toLowerCase()}`}>
                                                {sug.estado || '-'}
                                            </span>
                                        </td>
                                        <td>{renderUserName(sug.id_revisado_por)}</td>
                                        <td>{formatDate(sug.fecha_revision)}</td>
                                        <td>
                                            <Link to={`/sugerencias/${sug.id_sugerencia}`} className="btn btn-sm btn-outline">
                                                Ver detalles
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
