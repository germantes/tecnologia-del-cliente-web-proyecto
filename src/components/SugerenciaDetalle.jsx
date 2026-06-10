import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getAuthHeaders } from './session.js'
import '../styles/sugerencias.css'

// ─────────────────────────────────────────────────────────────────────────────
// Configuración de entidades
// ─────────────────────────────────────────────────────────────────────────────

const ENTITY_ENDPOINTS = {
    cadena: { endpoint: '/api/cadenas', idField: 'id_cadena', nameField: ['nombre_particular', 'establecimiento'], label: 'Cadena' },
    campania: { endpoint: '/api/campanias', idField: 'id_campania', nameField: ['nombre'], label: 'Campaña' },
    zona: { endpoint: '/api/cp', idField: 'id_zona', nameField: ['zona_geografica'], label: 'Zona' },
    entidad: { endpoint: '/api/entidades', idField: 'id_entidad', nameField: ['nombre'], label: 'Entidad' },
    tienda: { endpoint: '/api/tiendas', idField: 'id_tienda', nameField: ['domicilio'], label: 'Tienda' },
    usuario: { endpoint: '/api/usuarios', idField: 'id_usuario', nameField: ['nombre_completo', 'nombre'], label: 'Usuario' },
    voluntario: { endpoint: '/api/voluntarios', idField: 'id_voluntario', nameField: ['nombre', 'apellido_1'], label: 'Voluntario' },
}

// Campos que son IDs foráneos y qué entidad referencian
const FK_FIELDS = {
    id_cadena: 'cadena',
    id_campania: 'campania',
    id_zona: 'zona',
    id_entidad: 'entidad',
    id_tienda: 'tienda',
    id_usuario: 'usuario',
    id_voluntario: 'voluntario',
    id_capitan: 'usuario',
    id_coordinador: 'usuario',
    id_responsable_tienda: 'usuario',
    id_usuario_contacto: 'usuario',
    id_propuesto_por: 'usuario',
    id_revisado_por: 'usuario',
    cp: 'cp',
    id_cp: 'cp',
}

// Campos que son IDs internos (PK) — no se muestran en la comparación
const PK_FIELDS = new Set([
    'id_cadena', 'id_campania', 'id_zona', 'id_entidad',
    'id_tienda', 'id_usuario', 'id_voluntario', 'id_turno',
    'id_sugerencia', 'id_cp',
])

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de formato
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(value) {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString('es-ES', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
    })
}

function formatValue(value) {
    if (value === null || value === undefined || value === '') return '-'
    if (typeof value === 'object') {
        try { return JSON.stringify(value, null, 2) } catch { return String(value) }
    }
    return String(value)
}

function getFirstValue(obj, fields) {
    for (const f of fields) {
        if (obj[f] !== undefined && obj[f] !== null && obj[f] !== '') return String(obj[f])
    }
    return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Parseo de datos_propuestos
// ─────────────────────────────────────────────────────────────────────────────

function normalizeProposedText(value) {
    if (typeof value === 'object' && value !== null) return JSON.stringify(value);
    if (typeof value !== 'string' || !value) return '';
    return value.trim();
}

function parseProposedData(value) {
    if (!value) return null;
    if (typeof value === 'object') return value;
    // Si no es un string, no podemos procesarlo como texto. Devolverlo tal cual.
    if (typeof value !== 'string') return value;

    const trimmed = value.trim();
    // Intentar parsear como JSON primero
    try { if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed) } catch { /* No es JSON */ }
    const lines = trimmed.split(/\r?\n/)
    const result = {}
    let canParse = true

    for (const line of lines) {
        const sep = line.indexOf(':') !== -1 ? line.indexOf(':') : line.indexOf('=')
        if (sep === -1) { canParse = false; break }
        result[line.slice(0, sep).trim()] = line.slice(sep + 1).trim()
    }

    if (canParse && Object.keys(result).length > 0) return result
    return trimmed // Devolver el valor trimeado si no es parseable como objeto
}

// ─────────────────────────────────────────────────────────────────────────────
// Carga de entidades de referencia (para resolver IDs → nombres)
// ─────────────────────────────────────────────────────────────────────────────

async function fetchEntityIndex(entityType) {
    const config = ENTITY_ENDPOINTS[entityType]
    if (!config) return {}
    try {
        const resp = await fetch(config.endpoint, { headers: getAuthHeaders() })
        if (!resp.ok) return {}
        const data = await resp.json()
        const index = {}
        const rows = Array.isArray(data) ? data : []
        for (const row of rows) {
            const id = row[config.idField]
            if (id !== undefined && id !== null) {
                const name = getFirstValue(row, config.nameField)
                index[String(id)] = name || `#${id}`
            }
        }
        return index
    } catch { return {} }
}

async function fetchCpIndex() {
    try {
        const resp = await fetch('/api/cp', { headers: getAuthHeaders() })
        if (!resp.ok) return {}
        const data = await resp.json()
        const index = {}
        for (const row of (Array.isArray(data) ? data : [])) {
            const cp = row.cp
            if (cp !== undefined && cp !== null) {
                const label = row.localidad ? `${cp} - ${row.localidad}` : String(cp)
                index[String(cp)] = label
            }
        }
        return index
    } catch { return {} }
}

async function buildFkResolvers(neededTypes) {
    const resolvers = {}
    const fetches = [...neededTypes].map(async (type) => {
        if (type === 'cp') {
            resolvers['cp'] = await fetchCpIndex()
        } else if (ENTITY_ENDPOINTS[type]) {
            resolvers[type] = await fetchEntityIndex(type)
        }
    })
    await Promise.all(fetches)
    return resolvers
}

function resolveValue(fieldName, rawValue, resolvers) {
    if (rawValue === null || rawValue === undefined || rawValue === '') return '-'
    const entityType = FK_FIELDS[fieldName]
    if (!entityType) return formatValue(rawValue)
    const index = resolvers[entityType] || {}
    const resolved = index[String(rawValue)]
    return resolved ?? formatValue(rawValue)
}

// ─────────────────────────────────────────────────────────────────────────────
// Carga de entidad original
// ─────────────────────────────────────────────────────────────────────────────

async function fetchOriginalEntity(tipoEntidad, idOriginal) {
    const config = ENTITY_ENDPOINTS[tipoEntidad?.toLowerCase()]
    if (!config) return null
    try {
        const resp = await fetch(config.endpoint, { headers: getAuthHeaders() })
        if (!resp.ok) return null
        const data = await resp.json()
        const rows = Array.isArray(data) ? data : []
        return rows.find((item) => String(item[config.idField]) === String(idOriginal)) || null
    } catch { return null }
}

function getEntityDisplayName(tipoEntidad, entity) {
    if (!entity) return null
    const config = ENTITY_ENDPOINTS[tipoEntidad?.toLowerCase()]
    if (!config) return null
    return getFirstValue(entity, config.nameField)
}

// ─────────────────────────────────────────────────────────────────────────────
// Construcción de filas de comparación
// ─────────────────────────────────────────────────────────────────────────────

function buildComparisonRows(original, proposed, resolvers) {
    const origObj = original && typeof original === 'object' && !Array.isArray(original) ? original : null
    const propObj = proposed && typeof proposed === 'object' && !Array.isArray(proposed) ? proposed : null

    if (propObj) {
        // Unión de claves: propuestas primero, luego las del original que no estén
        const keys = [...new Set([...Object.keys(propObj), ...(origObj ? Object.keys(origObj) : [])])]
            .filter((k) => !PK_FIELDS.has(k)) // ocultar PKs

        return keys.map((key) => {
            const origRaw = origObj ? origObj[key] : undefined
            const propRaw = propObj[key]
            const origDisplay = resolveValue(key, origRaw, resolvers)
            const propDisplay = resolveValue(key, propRaw, resolvers)
            return {
                key,
                originalDisplay: origDisplay,
                proposedDisplay: propDisplay,
                changed: String(origRaw ?? '') !== String(propRaw ?? ''),
            }
        })
    }

    // datos_propuestos sin parsear como objeto
    return [{
        key: 'datos_propuestos',
        originalDisplay: original ? formatValue(original) : '-',
        proposedDisplay: proposed ? String(proposed) : '-',
        changed: true,
    }]
}

// Detecta qué tipos de entidades FK se necesitan para resolver un conjunto de campos/valores
function detectNeededResolvers(obj) {
    if (!obj || typeof obj !== 'object') return new Set()
    const needed = new Set()
    for (const key of Object.keys(obj)) {
        const entityType = FK_FIELDS[key]
        if (entityType && obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
            needed.add(entityType)
        }
    }
    return needed
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

function SugerenciaDetalle() {
    const { id } = useParams()
    const [sugerencia, setSugerencia] = useState(null)
    const [comparisonRows, setComparisonRows] = useState([])
    const [entityDisplayName, setEntityDisplayName] = useState(null)
    const [userNames, setUserNames] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let active = true

        async function loadDetalle() {
            try {
                const [sugerenciaResp, usuariosResp] = await Promise.all([
                    fetch(`/api/sugerencias/${id}`, { headers: getAuthHeaders() }),
                    fetch('/api/usuarios', { headers: getAuthHeaders() }),
                ])

                if (!sugerenciaResp.ok) throw new Error(`No se encontró la sugerencia ${id}`)
                if (!usuariosResp.ok) throw new Error('Error cargando usuarios')

                const [suggestion, usuarios] = await Promise.all([
                    sugerenciaResp.json(),
                    usuariosResp.json(),
                ])
                if (!active) return

                // Mapa de usuarios
                const userMap = usuarios.reduce((m, u) => {
                    if (u?.id_usuario !== undefined) m[String(u.id_usuario)] = u.nombre_completo
                    return m
                }, {})
                setUserNames(userMap)
                setSugerencia(suggestion)

                // Parsear datos propuestos
                const proposed = parseProposedData(suggestion.datos_propuestos ?? '')

                // Cargar entidad original
                const tipoEntidad = suggestion.tipo_entidad?.toLowerCase()
                const original = (tipoEntidad && suggestion.id_entidad_original)
                    ? await fetchOriginalEntity(tipoEntidad, suggestion.id_entidad_original)
                    : null
                if (!active) return

                // Nombre de entidad para metadatos
                const displayName = getEntityDisplayName(tipoEntidad, original)
                setEntityDisplayName(displayName)

                // Detectar qué resolvers FK necesitamos
                const propObj = proposed && typeof proposed === 'object' && !Array.isArray(proposed) ? proposed : null
                const origObj = original && typeof original === 'object' ? original : null
                const needed = new Set([
                    ...detectNeededResolvers(propObj),
                    ...detectNeededResolvers(origObj),
                ])
                const resolvers = needed.size > 0 ? await buildFkResolvers(needed) : {}
                if (!active) return

                setComparisonRows(buildComparisonRows(original, proposed, resolvers))
            } catch (err) {
                if (active) setError(err.message || 'Error cargando la sugerencia')
            } finally {
                if (active) setLoading(false)
            }
        }

        loadDetalle()
        return () => { active = false }
    }, [id])

    const renderUserName = (userId) => {
        if (userId === null || userId === undefined || userId === '') return '-'
        return userNames[String(userId)] || String(userId)
    }

    const entityLabel = sugerencia
        ? (ENTITY_ENDPOINTS[sugerencia.tipo_entidad?.toLowerCase()]?.label ?? sugerencia.tipo_entidad ?? '-')
        : '-'

    return (
        <main className="sugerencias-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Detalle de sugerencia</h1>
                    <p className="page-description">
                        Comparación entre el registro original y la propuesta de cambio. Los valores distintos aparecen resaltados.
                    </p>
                </div>
                <Link to="/sugerencias" className="btn-detalle">
                    Volver a sugerencias
                </Link>
            </div>

            {loading && (
                <div className="loading">
                    <span className="spinner"></span> Cargando detalle...
                </div>
            )}

            {error && <div className="alert alert-error">Error: {error}</div>}

            {!loading && !error && sugerencia && (
                <section className="detalle-container">
                    <div className="sugerencia-meta">
                        <div><strong>ID sugerencia:</strong> {sugerencia.id_sugerencia}</div>
                        <div><strong>Tipo entidad:</strong> {entityLabel}</div>
                        <div>
                            <strong>Entidad original:</strong>{' '}
                            {entityDisplayName
                                ? entityDisplayName
                                : sugerencia.id_entidad_original ?? '-'}
                        </div>
                        <div><strong>Propuesto por:</strong> {renderUserName(sugerencia.id_propuesto_por)}</div>
                        <div><strong>Fecha propuesta:</strong> {formatDate(sugerencia.fecha_propuesta)}</div>
                        <div><strong>Estado:</strong> {sugerencia.estado || '-'}</div>
                        <div><strong>Revisado por:</strong> {renderUserName(sugerencia.id_revisado_por)}</div>
                        <div><strong>Fecha revisión:</strong> {formatDate(sugerencia.fecha_revision)}</div>
                    </div>

                    <div className="comparacion-section">
                        <h2 className="section-title">Comparación de campos</h2>
                        <table className="comparacion-table">
                            <thead>
                                <tr>
                                    <th>Campo</th>
                                    <th>Valor original</th>
                                    <th>Valor propuesto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisonRows.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="empty-row">No hay campos para comparar.</td>
                                    </tr>
                                ) : (
                                    comparisonRows.map((row) => (
                                        <tr key={row.key} className={row.changed ? 'highlight-diff' : ''}>
                                            <td>{row.key}</td>
                                            <td>{row.originalDisplay}</td>
                                            <td>{row.proposedDisplay}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </main>
    )
}

export default SugerenciaDetalle
