import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuthHeaders } from './session'
import { getFirstValue } from '../utils/helpers'
import formStyles from '../styles/edit.module.css'

const ENTITY_TYPES = [
  { key: 'entidad', label: 'Entidad', endpoint: '/api/entidades', idField: 'id_entidad', nameField: 'nombre' },
  { key: 'tienda', label: 'Tienda', endpoint: '/api/tiendas', idField: 'id_tienda', nameField: 'domicilio' },
  { key: 'voluntario', label: 'Voluntario', endpoint: '/api/voluntarios', idField: 'id_voluntario', nameField: ['nombre', 'apellido_1'] },
]

const REF_ENDPOINTS = {
  usuario: '/api/usuarios',
  entidad: '/api/entidades',
  tienda: '/api/tiendas',
  zona: '/api/cp',
  cadena: '/api/cadenas',
}

const SCHEMAS = {
  entidad: [
    { key: 'id_entidad', label: 'ID Entidad', type: 'text', readonly: true },
    { key: 'nombre', label: 'Nombre', type: 'text', required: true },
    { key: 'domicilio', label: 'Domicilio', type: 'text' },
    { key: 'cp', label: 'Código Postal', type: 'select_zona' },
    { key: 'codigo_bancosol', label: 'Código Bancosol', type: 'text' },
    { key: 'vinculado_bancosol', label: 'Vinculado a Bancosol', type: 'boolean' },
    { key: 'id_usuario_contacto', label: 'Usuario de Contacto', type: 'select_usuario' },
  ],
  tienda: [
    { key: 'id_tienda', label: 'ID Tienda', type: 'text', readonly: true },
    { key: 'domicilio', label: 'Domicilio', type: 'text', required: true },
    { key: 'cp', label: 'Zona (CP)', type: 'select_zona', required: true },
    { key: 'id_cadena', label: 'Cadena', type: 'select_cadena', required: true },
  ],
  voluntario: [
    { key: 'id_voluntario', label: 'ID Voluntario', type: 'text', readonly: true },
    { key: 'id_entidad', label: 'Entidad', type: 'select_entidad', required: true },
    { key: 'nombre', label: 'Nombre', type: 'text', required: true },
    { key: 'apellido_1', label: 'Apellido 1', type: 'text' },
    { key: 'apellido_2', label: 'Apellido 2', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
  ],
}

// Hardcoded, but could put it in a Enumerator
// Didn't do it because needed to change column type in supabase
const ROLES = ['ADMINISTRADOR', 'COORDINADOR', 'CAPITAN', 'RESPONSABLE-ENTIDAD', 'RESPONSABLE-TIENDA']

function getEntityName(entity, config) {
  if (!entity || !config) return ''
  if (config.key === 'tienda') {
    const domicilio = entity.domicilio || ''
    const cadenaName = entity.cadena?.establecimiento || entity.cadena?.nombre_particular || ''
    return cadenaName ? `${domicilio} - ${cadenaName}` : domicilio
  }
  return getFirstValue(entity, config.nameField)
}

function resolveFieldValue(entity, field, refData) {
  let val = entity[field.key]
  if (val === undefined || val === null || (typeof val === 'object' && val !== null)) {
    const nestedKey = field.key.replace(/^id_/, '')
    const nested = (typeof val === 'object' && val !== null) ? val : entity[nestedKey]
    if (nested && typeof nested === 'object') {
      if (nestedKey === 'cadena') {
        val = String(nested.id_cadena ?? Object.values(nested)[0] ?? '')
      } else if (nestedKey === 'cp') {
        const cpRaw = nested.cp ?? nested.id_cp ?? Object.values(nested)[0]
        const zonaItem = (refData.zona || []).find(z => String(z.cp) === String(cpRaw))
        val = String(cpRaw)
      } else {
        val = nested[field.key] ?? nested[nestedKey] ?? nested.id ?? Object.values(nested)[0]
      }
    }
  }
  if (field.type === 'select_zona' && val !== undefined && val !== null && val !== '' && typeof val !== 'object') {
    const zonaItem = (refData.zona || []).find(z => String(z.cp) === String(val))
    if (zonaItem) {
      val = String(zonaItem.cp)
    }
  }
  return val !== undefined && val !== null && typeof val !== 'object' ? val : ''
}

function CrearSugerencia() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [selectedType, setSelectedType] = useState('')
  const [entityList, setEntityList] = useState([])
  const [selectedEntityId, setSelectedEntityId] = useState('')
  const [originalData, setOriginalData] = useState(null)
  const [formData, setFormData] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [refs, setRefs] = useState({})

  const schema = SCHEMAS[selectedType] || []

  const loadRefData = useCallback(async (neededTypes) => {
    const result = {}
    for (const type of neededTypes) {
      try {
        if (type === 'rol') {
          result.rol = ROLES.map(r => ({ id: r, name: r.charAt(0) + r.slice(1).toLowerCase().replace(/-/g, ' ') }))
        } else if (type === 'zona') {
          const resp = await fetch('/api/cp', { headers: getAuthHeaders() })
          if (resp.ok) result.zona = await resp.json()
        } else {
          const endpoint = REF_ENDPOINTS[type]
          if (endpoint) {
            const resp = await fetch(endpoint, { headers: getAuthHeaders() })
            if (resp.ok) {
              let data = await resp.json()
              result[type] = data
            }
          }
        }
      } catch { /* ignore */ }
    }
    return result
  }, [])

  const handleTypeChange = async (typeKey) => {
    setSelectedType(typeKey)
    setSelectedEntityId('')
    setOriginalData(null)
    setFormData({})
    setError('')

    if (!typeKey) {
      setEntityList([])
      setStep(1)
      return
    }

    setLoading(true)
    setStep(2)

    try {
      const typeConfig = ENTITY_TYPES.find(t => t.key === typeKey)
      if (!typeConfig) { setEntityList([]); return }

      const resp = await fetch(typeConfig.endpoint, { headers: getAuthHeaders() })
      if (resp.ok) {
        let data = await resp.json()
        if (typeKey === 'cadena') {
          const seen = new Set()
          data = data.filter(item => {
            const name = item.establecimiento || item.nombre_particular || ''
            if (!name || seen.has(name)) return false
            seen.add(name)
            return true
          })
        }
        setEntityList(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      setError('Error al cargar lista de entidades: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEntitySelect = async (entityId) => {
    setSelectedEntityId(entityId)
    setError('')

    if (!entityId) return

    setLoading(true)

    try {
      const typeConfig = ENTITY_TYPES.find(t => t.key === selectedType)
      if (!typeConfig) return

      const entity = entityList.find(e => String(e[typeConfig.idField]) === String(entityId))
      if (!entity) { setError('Entidad no encontrada'); return }

      const neededTypes = new Set()
      for (const field of (SCHEMAS[selectedType] || [])) {
        if (field.type.startsWith('select_')) {
          neededTypes.add(field.type.replace('select_', ''))
        }
      }

      const refData = await loadRefData([...neededTypes])

      setRefs(refData)

      const initial = {}
      const origValues = {}
      for (const field of (SCHEMAS[selectedType] || [])) {
        initial[field.key] = resolveFieldValue(entity, field, refData)
        origValues[field.key] = initial[field.key]
      }
      setOriginalData(origValues)
      setFormData(initial)
      setStep(3)
    } catch (err) {
      setError('Error al cargar datos de la entidad: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!originalData || !selectedType || !selectedEntityId) return

    const changed = {}
    for (const key of Object.keys(formData)) {
      const origVal = originalData[key]
      const newVal = formData[key]
      if (String(origVal ?? '').trim() !== String(newVal ?? '').trim()) {
        changed[key] = newVal
      }
    }

    delete changed[ENTITY_TYPES.find(t => t.key === selectedType)?.idField]

    if (Object.keys(changed).length === 0) {
      setError('No hay cambios para sugerir.')
      return
    }

    setLoading(true)

    try {
      const resp = await fetch('/api/sugerencias', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_entidad: selectedType,
          id_entidad_original: selectedEntityId,
          datos_propuestos: changed,
        }),
      })

      if (!resp.ok) {
        const errData = await resp.json()
        throw new Error(errData.error || 'Error al crear la sugerencia')
      }

      navigate('/homepage')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const renderField = (field) => {
    const value = formData[field.key] ?? ''
    const isReadOnly = field.readonly

    if (field.type === 'boolean') {
      return (
        <select
          value={String(value)}
          onChange={e => handleFieldChange(field.key, e.target.value === 'true')}
          disabled={isReadOnly}
          style={isReadOnly ? { background: 'var(--color-surface-2)' } : undefined}
        >
          <option value="false">No</option>
          <option value="true">Sí</option>
        </select>
      )
    }

    if (field.type.startsWith('select_')) {
      const refType = field.type.replace('select_', '')
      let options = []

      if (refType === 'rol') {
        options = refs.rol || []
      } else if (refType === 'zona') {
        const items = refs.zona || []
        options = items.map(item => {
          const displayName = item.localidad ? `${item.cp} - ${item.localidad}` : String(item.cp || item.id_zona || '')
          return { id: String(item.cp ?? item.id_zona ?? ''), name: displayName }
        })
      } else if (refType === 'cadena') {
        const items = refs.cadena || []
        options = items.map(item => {
          const parts = [item.nombre_particular, item.empresa_cadena].filter(Boolean)
          const displayName = parts.length > 0 ? parts.join(' - ') : item.establecimiento || `#${item.id_cadena}`
          return { id: String(item.id_cadena ?? ''), name: displayName }
        })
      } else {
        const items = refs[refType] || []
        const config = ENTITY_TYPES.find(t => t.key === refType)
        options = items.map(item => {
          const displayName = config ? getEntityName(item, config) : `#${Object.values(item)[0] || ''}`
          const id = config ? String(item[config.idField] ?? item.id ?? '') : displayName
          return { id, name: displayName }
        })
      }

      return (
        <select
          value={value === null || value === undefined ? '' : String(value)}
          onChange={e => handleFieldChange(field.key, e.target.value)}
          disabled={isReadOnly}
          required={field.required && !isReadOnly}
          style={isReadOnly ? { background: 'var(--color-surface-2)' } : undefined}
        >
          <option value="">Seleccione {field.label}...</option>
          {options.map((opt, idx) => (
            <option key={`${opt.id}_${idx}`} value={opt.id}>{opt.name}</option>
          ))}
        </select>
      )
    }

    if (field.type === 'password') {
      return (
        <input
          type="password"
          value={value}
          onChange={e => handleFieldChange(field.key, e.target.value)}
          placeholder="Dejar en blanco para mantener la actual"
          disabled={isReadOnly}
          style={isReadOnly ? { background: 'var(--color-surface-2)' } : undefined}
        />
      )
    }

    return (
      <input
        type={field.type || 'text'}
        value={value}
        onChange={e => handleFieldChange(field.key, e.target.value)}
        required={field.required && !isReadOnly}
        disabled={isReadOnly}
        style={isReadOnly ? { background: 'var(--color-surface-2)' } : undefined}
      />
    )
  }

  if (step === 1) {
    return (
      <main className={formStyles['form-wrapper']}>
        <div className={formStyles['form-element']}>
          <div className={formStyles['total']}>
            <div className={formStyles['form-header']}>
              <h1>Nueva Sugerencia de Cambio</h1>
            </div>
            <div className={formStyles['tablas']}>
              <table>
                <tbody>
                  <tr>
                    <td className={formStyles['etiqueta-campo']}>Tipo de Entidad</td>
                    <td>
                      <select
                        value={selectedType}
                        onChange={e => handleTypeChange(e.target.value)}
                      >
                        <option value="">Seleccione tipo de entidad...</option>
                        {ENTITY_TYPES.map(t => (
                          <option key={t.key} value={t.key}>{t.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (step === 2) {
    return (
      <main className={formStyles['form-wrapper']}>
        <div className={formStyles['form-element']}>
          <div className={formStyles['total']}>
            <div className={formStyles['form-header']}>
              <h1>Seleccionar {ENTITY_TYPES.find(t => t.key === selectedType)?.label}</h1>
            </div>

            {error && <div className={formStyles['error-banner']}>{error}</div>}

            <div className={formStyles['tablas']}>
              <table>
                <tbody>
                  <tr>
                    <td className={formStyles['etiqueta-campo']}>
                      {ENTITY_TYPES.find(t => t.key === selectedType)?.label}
                    </td>
                    <td>
                      <select
                        value={selectedEntityId}
                        onChange={e => handleEntitySelect(e.target.value)}
                      >
                        <option value="">Seleccione...</option>
                        {entityList.map(entity => {
                          const config = ENTITY_TYPES.find(t => t.key === selectedType)
                          const name = config ? getEntityName(entity, config) : `#${entity[config?.idField]}`
                          const id = String(entity[config?.idField] ?? '')
                          return (
                            <option key={id} value={id}>{name}</option>
                          )
                        })}
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className={formStyles['botones']}>
              <button
                type="button"
                className={formStyles['btn-cerrar']}
                onClick={() => handleTypeChange('')}
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className={formStyles['form-wrapper']}>
      <form onSubmit={handleSubmit} className={formStyles['form-element']}>
        <div className={formStyles['total']}>
          <div className={formStyles['form-header']}>
            <h1>
              Sugerir cambio en {ENTITY_TYPES.find(t => t.key === selectedType)?.label}
            </h1>
          </div>

          {error && <div className={formStyles['error-banner']}>{error}</div>}

          <div className={formStyles['tablas']}>
            <table>
              <tbody>
                {schema.map(field => (
                  <tr key={field.key}>
                    <td className={formStyles['etiqueta-campo']}>{field.label}</td>
                    <td>{renderField(field)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={formStyles['botones']}>
            <button
              type="button"
              className={formStyles['btn-cerrar']}
              onClick={() => setStep(2)}
              disabled={loading}
            >
              Volver
            </button>
            <button
              type="submit"
              className={formStyles['btn-guardar']}
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Enviar sugerencia'}
            </button>
          </div>
        </div>
      </form>
    </main>
  )
}

export default CrearSugerencia
