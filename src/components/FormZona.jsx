import { useState, useEffect, useMemo, useCallback } from 'react';
import GenericForm from './GenericForm';
import { zonaSchema } from './formSchemas';
import { getAuthHeaders } from './session';

function FormZona({ onClose, existingZonas, onZonaCreated, initialData = null }) {
    const isEditMode = !!initialData;
    const [distritos, setDistritos] = useState([]);
    const [zonas, setZonas] = useState([]);
    const [formValues, setFormValues] = useState(() => {
        if (initialData) {
            return {
                zonaGeografica: (initialData.zona?.zona_geografica) || (initialData.zonaGeografica) || (initialData.zona_geografica) || '',
                localidad: initialData.localidad || '',
                nombreDistrito: String(initialData.distrito?.distrito || ''),
            };
        }
        return { zonaGeografica: '', localidad: '', nombreDistrito: '' };
    });

    useEffect(() => {
        async function fetchOptions() {
            try {
                const [distritosRes, zonasRes] = await Promise.all([
                    fetch('/api/distritos', { headers: getAuthHeaders() }),
                    fetch('/api/zonas', { headers: getAuthHeaders() }),
                ]);
                if (distritosRes.ok) setDistritos(await distritosRes.json());
                if (zonasRes.ok) setZonas(await zonasRes.json());
            } catch (err) {
                console.error('Error cargando opciones:', err);
            }
        }
        fetchOptions();
    }, []);

    const zonaOptions = useMemo(() => zonas.map(z => ({
        value: z.zona_geografica,
        label: z.zona_geografica,
    })), [zonas]);

    const localidadOptions = useMemo(() => {
        const selectedZona = zonas.find(z => z.zona_geografica === formValues.zonaGeografica);
        let options = [];
        if (selectedZona) {
            const records = (existingZonas || []).filter(z => z.id_zona === selectedZona.id_zona && z.localidad);
            options = [...new Map(records.map(z => [z.localidad, { value: z.localidad, label: z.localidad }])).values()];
        }
        if (formValues.localidad && !options.find(o => o.value === formValues.localidad)) {
            options.unshift({ value: formValues.localidad, label: formValues.localidad });
        }
        return options;
    }, [formValues.zonaGeografica, formValues.localidad, existingZonas, zonas]);

    const distritoSuggestions = useMemo(() => {
        if (formValues.localidad) {
            const records = (existingZonas || []).filter(
                z => z.localidad === formValues.localidad && z.distrito
            );
            return [...new Map(records.map(z => [
                z.distrito.nombre_distrito,
                { value: z.distrito.nombre_distrito, label: z.distrito.nombre_distrito }
            ])).values()];
        }
        return distritos.map(d => ({
            value: d.nombre_distrito,
            label: d.nombre_distrito,
        }));
    }, [formValues.localidad, existingZonas, distritos]);

    const fields = useMemo(() => zonaSchema.fields.map(field => {
        if (field.name === 'zonaGeografica') return { ...field, options: zonaOptions };
        if (field.name === 'localidad') return { ...field, options: localidadOptions };
        if (field.name === 'nombreDistrito') return { ...field, options: distritoSuggestions };
        return field;
    }), [zonaOptions, localidadOptions, distritoSuggestions]);

    const handleFieldChange = useCallback((fieldName, newValue, setFieldValue, currentFormData) => {
        setFormValues(prev => ({ ...prev, [fieldName]: newValue }));
        if (fieldName === 'localidad') {
            const hasDistritos = (existingZonas || []).some(
                z => z.localidad === newValue && z.distrito
            );
            if (!hasDistritos) {
                setFieldValue('nombreDistrito', '');
                setFormValues(prev => ({ ...prev, nombreDistrito: '' }));
            }
        }
    }, [existingZonas]);

    const formInitialData = useMemo(() => {
        if (!initialData) return {};
        return {
            cp: initialData.cp || '',
            zonaGeografica: (initialData.zona?.zona_geografica) || (initialData.zonaGeografica) || (initialData.zona_geografica) || '',
            localidad: initialData.localidad || '',
            nombreDistrito: initialData.distrito?.nombre_distrito || '',
        };
    }, [initialData?.id_zona, initialData?.cp]);

    const submitTransform = useCallback((formData) => {
        return {
            localidad: formData.localidad,
            zona_geografica: formData.zonaGeografica,
            nombre_distrito: (formData.nombreDistrito || '').trim() || null,
        };
    }, []);

    return (
        <GenericForm
            title={isEditMode ? 'Editar Zona' : 'Crear Nueva Zona'}
            fields={fields}
            apiEndpoint={
                isEditMode 
                    ? `/api/cp/${initialData.cp}` 
                    : zonaSchema.apiEndpoint
            }
            method={isEditMode ? 'PUT' : 'POST'}
            initialData={formInitialData}
            onClose={onClose}
            onSuccess={onZonaCreated}
            onFieldChange={handleFieldChange}
            validate={(formData) => {
                const recordsToCheck = isEditMode
                    ? existingZonas.filter(z => z.id_zona !== initialData.id_zona)
                    : existingZonas;
                return zonaSchema.validate(formData, recordsToCheck);
            }}
            transformSubmitData={submitTransform}
        />
    );
}

export default FormZona;
