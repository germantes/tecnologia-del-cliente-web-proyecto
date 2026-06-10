/**
 * Configuraciones de formularios para diferentes entidades
 * Cada schema define los campos, validaciones y transformaciones necesarias
 */

// ========== CADENAS ==========
export const cadenaSchema = {
    title: 'Cadena',
    apiEndpoint: '/api/cadenas',
    fields: [
        {
            name: 'codigoCadena',
            label: 'Código',
            type: 'text',
            required: true,
        },
        {
            name: 'establecimiento',
            label: 'Establecimiento',
            type: 'text',
            required: true,
        },
        {
            name: 'nombreParticular',
            label: 'Nombre particular',
            type: 'text',
            required: false,
        },
        {
            name: 'empresa',
            label: 'Empresa',
            type: 'text',
            required: false,
        },
    ],
    // Transformar nombres de campos del frontend al backend
    transformSubmitData: (formData) => ({
        codigo_cadena: formData.codigoCadena,
        establecimiento: formData.establecimiento,
        nombre_particular: formData.nombreParticular,
        empresa: formData.empresa,
    }),
    // Validación personalizada
    validate: (formData, existingRecords = []) => {
        const codeExists = existingRecords.some(cadena => 
            String(cadena.codigo_cadena) === String(formData.codigoCadena)
        );
        if (codeExists) {
            return 'El código de cadena ya existe.';
        }
        return null;
    },
};

// ========== CAMPAÑAS ==========
export const campaniaSchema = {
    title: 'Campaña',
    apiEndpoint: '/campanias', // POST y PUT sin /api/
    apiEndpointGet: '/api/campanias', // GET con /api/
    fields: [
        {
            name: 'nombre',
            label: 'Nombre',
            type: 'text',
            required: true,
        },
        {
            name: 'tipo',
            label: 'Tipo',
            type: 'select',
            required: true,
            options: [
                { value: 'Recogida', label: 'Recogida' },
                { value: 'Reparto', label: 'Reparto' },
                { value: 'Mixta', label: 'Mixta' },
            ],
        },
        {
            name: 'fechaInicio',
            label: 'Fecha de Inicio',
            type: 'date',
            required: true,
        },
        {
            name: 'fechaFin',
            label: 'Fecha de Fin',
            type: 'date',
            required: true,
        },
        {
            name: 'descripcion',
            label: 'Descripción',
            type: 'textarea',
            required: false,
        },
    ],
    transformSubmitData: (formData) => ({
        nombre: formData.nombre,
        tipo: formData.tipo,
        fecha_inicio: formData.fechaInicio,
        fecha_fin: formData.fechaFin,
        descripcion: formData.descripcion || null,
    }),
    validate: (formData) => {
        const inicio = new Date(formData.fechaInicio);
        const fin = new Date(formData.fechaFin);
        
        if (fin < inicio) {
            return 'La fecha de fin no puede ser anterior a la fecha de inicio.';
        }
        return null;
    },
};

// ========== ZONAS ==========
export const zonaSchema = {
    title: 'Zona',
    apiEndpointGet: '/api/cp',  // GET con /api/cp
    apiEndpoint: '/zonas',  // POST y PUT sin /api/
    fields: [
        {
            name: 'cp',
            label: 'Código Postal',
            type: 'text',
            required: true,
            disabled: true, // No editable, es el identificador
        },
        {
            name: 'localidad',
            label: 'Localidad',
            type: 'text',
            required: true,
        },
        {
            name: 'nombreDistrito',
            label: 'Distrito',
            type: 'text',
            required: false,
        },
        {
            name: 'zonaGeografica',
            label: 'Zona Geográfica',
            type: 'text',
            required: true,
        },
        {
            name: 'descripcion',
            label: 'Descripción',
            type: 'textarea',
            required: false,
        },
    ],
    transformSubmitData: (formData) => ({
        localidad: formData.localidad,
        zona_geografica: formData.zonaGeografica,
        descripcion: formData.descripcion || null,
        // Nota: nombreDistrito se maneja en otra tabla, no se envía en el PUT de zona
    }),
    validate: (formData, existingRecords = []) => {
        // Validación opcional - puedes agregar más validaciones si es necesario
        return null;
    },
};

/**
 * Obtener el schema según el tipo de entidad
 * @param {string} entityType - 'cadena', 'campania', o 'zona'
 * @returns {Object} Schema de la entidad
 */
export function getSchema(entityType) {
    const schemas = {
        cadena: cadenaSchema,
        campania: campaniaSchema,
        zona: zonaSchema,
    };
    return schemas[entityType] || null;
}
