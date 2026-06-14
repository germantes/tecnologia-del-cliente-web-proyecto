import { useState, useEffect, useRef, useCallback } from 'react';
import { getAuthHeaders } from './session';
import formStyles from '../styles/edit.module.css';

/**
 * Componente de formulario genérico para crear/editar entidades
 * 
 * @param {Object} props
 * @param {string} props.title - Título del formulario (ej: "Crear Cadena", "Editar Campaña")
 * @param {Array} props.fields - Configuración de campos del formulario
 * @param {string} props.apiEndpoint - Endpoint de la API (ej: '/api/cadenas')
 * @param {string} props.method - Método HTTP ('POST' para crear, 'PUT' para editar)
 * @param {Object} props.initialData - Datos iniciales para modo edición (opcional)
 * @param {Function} props.onClose - Callback al cerrar el formulario
 * @param {Function} props.onSuccess - Callback al guardar exitosamente
 * @param {Function} props.validate - Función de validación personalizada (opcional)
 * @param {Function} props.transformSubmitData - Transformar datos antes de enviar (opcional)
 */
function GenericForm({ 
    title,
    fields,
    apiEndpoint,
    method = 'POST',
    initialData = {},
    onClose,
    onSuccess,
    validate,
    transformSubmitData,
    onFieldChange,
    showDelete,
    onDelete
}) {
    const [formData, setFormData] = useState({});
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const lastChangedField = useRef(null);
    const isFirstRender = useRef(true);

    const setFieldValue = useCallback((name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Inicializar formData al montar o cuando cambian los datos iniciales
    // Nota: NO depende de `fields` para evitar resetear el formulario cuando
    // las opciones de los desplegables cambian (ej: cascada zona → localidad)
    useEffect(() => {
        const defaultValues = {};
        fields.forEach(field => {
            const value = initialData[field.name] !== undefined 
                ? initialData[field.name] 
                : (field.defaultValue !== undefined ? field.defaultValue : '');
            defaultValues[field.name] = value;
        });
        setFormData(defaultValues);
        if (Object.keys(initialData).length > 0) {
            console.log('Datos iniciales cargados:', defaultValues);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData]);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (onFieldChange && lastChangedField.current) {
            const fieldName = lastChangedField.current;
            lastChangedField.current = null;
            onFieldChange(fieldName, formData[fieldName], setFieldValue, formData);
        }
    }, [formData, onFieldChange, setFieldValue]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        lastChangedField.current = name;
        setFormData(prevState => ({
            ...prevState,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            // Validación personalizada si existe
            if (validate) {
                const validationError = validate(formData);
                if (validationError) {
                    setError(validationError);
                    setIsSubmitting(false);
                    return;
                }
            }

            // Transformar datos si existe la función
            const dataToSubmit = transformSubmitData 
                ? transformSubmitData(formData) 
                : formData;

            // Envío a la API
            const response = await fetch(apiEndpoint, {
                method,
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSubmit),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error al ${method === 'POST' ? 'crear' : 'actualizar'} el registro.`);
            }

            const result = await response.json();
            
            // Notificar éxito (onSuccess hace redirect, no llamar también onClose)
            if (onSuccess) {
                onSuccess(result);
            } else if (onClose) {
                onClose();
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderField = (field) => {
        const { name, label, type = 'text', required = false, options, placeholder, disabled = false } = field;

        switch (type) {
            case 'select':
                return (
                    <select
                        name={name}
                        value={formData[name] || ''}
                        onChange={handleChange}
                        required={required}
                        disabled={disabled}
                    >
                        <option value="">{placeholder || 'Seleccionar...'}</option>
                        {options && options.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                );

            case 'textarea':
                return (
                    <textarea
                        name={name}
                        value={formData[name] || ''}
                        onChange={handleChange}
                        required={required}
                        placeholder={placeholder}
                        disabled={disabled}
                        rows={4}
                    />
                );

            case 'checkbox':
                return (
                    <input
                        type="checkbox"
                        name={name}
                        checked={formData[name] || false}
                        onChange={handleChange}
                        disabled={disabled}
                    />
                );

            case 'date':
                return (
                    <input
                        type="date"
                        name={name}
                        value={formData[name] || ''}
                        onChange={handleChange}
                        required={required}
                        disabled={disabled}
                    />
                );

            default: {
                const listId = type === 'text' && options ? `${name}-list` : undefined;
                return (
                    <>
                        <input
                            type={type}
                            name={name}
                            value={formData[name] || ''}
                            onChange={handleChange}
                            required={required}
                            placeholder={placeholder}
                            disabled={disabled}
                            list={listId}
                        />
                        {listId && (
                            <datalist id={listId}>
                                {options.map(opt => (
                                    <option key={opt.value} value={opt.label} />
                                ))}
                            </datalist>
                        )}
                    </>
                );
            }
        }
    };

    return (
        <main className={formStyles['form-wrapper']}>
            <form onSubmit={handleSubmit} className={formStyles['form-element']}>
                <div className={formStyles['total']}>
                    <div className={formStyles['form-header']}>
                        <h1>{title}</h1>
                    </div>

                    {error && (
                        <div className={formStyles['error-banner']}>
                            {error}
                        </div>
                    )}

                    <div className={formStyles['tablas']}>
                        <table>
                            <tbody>
                                {fields.map(field => (
                                    <tr key={field.name}>
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
                            onClick={onClose} 
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className={formStyles['btn-guardar']} 
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Guardando...' : (method === 'POST' ? 'Crear' : 'Guardar')}
                        </button>
                        {showDelete && method === 'PUT' && (
                            <button
                                type="button"
                                className={formStyles['btn-eliminar']}
                                onClick={onDelete}
                                disabled={isSubmitting}
                            >
                                Eliminar
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </main>
    );
}

export default GenericForm;
