import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuthHeaders } from './session'
import formStyles from '../styles/edit.module.css'

const ENTITY_TYPES = [
  { key: 'entidad', label: 'Entidad', endpoint: '/api/entidades', idField: 'id_entidad', nameField: 'nombre' },
  { key: 'tienda', label: 'Tienda', endpoint: '/api/tiendas', idField: 'id_tienda', nameField: 'domicilio' },
  { key: 'turno', label: 'Turno', endpoint: '/api/turnos', idField: 'id_turno', nameField: ['fecha', 'id_turno'] },
  { key: 'campania', label: 'Campaña', endpoint: '/api/campanias', idField: 'id_campania', nameField: 'nombre' },
  { key: 'usuario', label: 'Usuario', endpoint: '/api/usuarios', idField: 'id_usuario', nameField: ['nombre_completo', 'nombre', 'email'] },
  { key: 'voluntario', label: 'Voluntario', endpoint: '/api/voluntarios', idField: 'id_voluntario', nameField: ['nombre', 'apellido_1'] },
]

const REF_ENDPOINTS = {
  usuario: '/api/usuarios',
  entidad: '/api/entidades',
  tienda: '/api/tiendas',
  campania: '/api/campanias',
  zona: '/api/zonas',
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
    { key: 'id_cp', label: 'Zona (CP)', type: 'select_zona', required: true },
    { key: 'id_cadena', label: 'Cadena', type: 'select_cadena', required: true },
  ],
  turno: [
    { key: 'id_turno', label: 'ID Turno', type: 'text', readonly: true },
    { key: 'id_tienda', label: 'Tienda', type: 'select_tienda', required: true },
    { key: 'id_campania', label: 'Campaña', type: 'select_campania', required: true },
    { key: 'fecha', label: 'Fecha', type: 'date', required: true },
    { key: 'turno', label: 'Turno (manana/tarde)', type: 'text', required: true },
    { key: 'id_entidad', label: 'Entidad Responsable', type: 'select_entidad' },
    { key: 'observaciones', label: 'Observaciones', type: 'text' },
  ],
  campania: [
    { key: 'id_campania', label: 'ID Campaña', type: 'text', readonly: true },
    { key: 'nombre', label: 'Nombre', type: 'text', required: true },
    { key: 'fecha_inicio', label: 'Fecha Inicio', type: 'date', required: true },
    { key: 'fecha_fin', label: 'Fecha Fin', type: 'date', required: true },
    { key: 'tipo', label: 'Tipo', type: 'text' },
  ],
  usuario: [
    { key: 'id_usuario', label: 'ID Usuario', type: 'text', readonly: true },
    { key: 'nombre_completo', label: 'Nombre Completo', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'rol', label: 'Rol/Puesto', type: 'select_rol', required: true },
    { key: 'cp', label: 'Zona Asignada', type: 'select_zona' },
    { key: 'contrasenia', label: 'Contraseña', type: 'password' },
    { key: 'telefono', label: 'Teléfono', type: 'number' },
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

const ROLES = ['ADMINISTRADOR', 'COORDINADOR', 'CAPITAN', 'RESPONSABLE-ENTIDAD', 'RESPONSABLE-TIENDA']

function getFirstValue(obj, fields) {
  const arr = Array.isArray(fields) ? fields : [fields]
  for (const f of arr) {
    if (obj[f] !== undefined && obj[f] !== null && obj[f] !== '') return String(obj[f]).trim()
  }
  return `#${Object.values(obj)[0] || ''}`
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
          result.rol = ROLES
        } else if (type === 'zona') {
          const resp = await fetch('/api/zonas', { headers: getAuthHeaders() })
          if (resp.ok) result.zona = await resp.json()
        } else {
          const endpoint = REF_ENDPOINTS[type]
          if (endpoint) {
            const resp = await fetch(endpoint, { headers: getAuthHeaders() })
            if (resp.ok) result[type] = await resp.json()
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
        const data = await resp.json()
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

      setOriginalData({ ...entity })

      const neededTypes = new Set()
      for (const field of (SCHEMAS[selectedType] || [])) {
        if (field.type.startsWith('select_')) {
          neededTypes.add(field.type.replace('select_', ''))
        }
      }

      const refData = await loadRefData([...neededTypes])
      setRefs(refData)

      const initial = {}
      for (const field of (SCHEMAS[selectedType] || [])) {
        initial[field.key] = entity[field.key] !== undefined ? entity[field.key] : ''
      }
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
        options = items.map(item => ({
          id: item.cp ?? item.id_cp ?? item.id_zona ?? '',
          name: item.localidad ? `${item.cp || item.id_zona} - ${item.localidad}` : String(item.cp || item.id_zona || ''),
        }))
      } else if (refType === 'cadena') {
        const items = refs.cadena || []
        options = items.map(item => ({
          id: item.id_cadena ?? '',
          name: item.establecimiento || item.nombre_particular || `#${item.id_cadena}`,
        }))
      } else {
        const items = refs[refType] || []
        const config = ENTITY_TYPES.find(t => t.key === refType)
        options = items.map(item => ({
          id: item[config?.idField || `id_${refType}`] ?? item.id ?? Object.values(item)[0] ?? '',
          name: config ? getFirstValue(item, config.nameField) : String(item.nombre || item.domicilio || `#${Object.values(item)[0]}`),
        }))
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
          {options.map(opt => (
            <option key={opt.id} value={opt.id}>{opt.name}</option>
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
                          const name = config ? getFirstValue(entity, config.nameField) : `#${entity[config?.idField]}`
                          const id = entity[config?.idField]
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
              onClick={() => handleEntitySelect('')}
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
