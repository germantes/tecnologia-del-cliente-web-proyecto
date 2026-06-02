// schemas.js - Configuración genérica de formularios
const SCHEMAS = {
    entidades: [
        { key: 'id_entidad', label: 'ID Entidad', type: 'text', readonly: true },
        { key: 'nombre', label: 'Nombre', type: 'text', required: true },
        { key: 'domicilio', label: 'Domicilio', type: 'text' },
        { key: 'cp', label: 'Código Postal', type: 'text' },
        { key: 'codigo_bancosol', label: 'Código Bancosol', type: 'text' },
        { key: 'vinculado_bancosol', label: 'Vinculado a Bancosol', type: 'boolean' },
        { key: 'id_usuario_contacto', label: 'Usuario de Contacto', type: 'select_usuario' }
    ],
    voluntarios: [
        { key: 'id_voluntario', label: 'ID Voluntario', type: 'text', readonly: true },
        { key: 'id_entidad', label: 'Entidad', type: 'select_entidad', required: true },
        { key: 'nombre', label: 'Nombre', type: 'text' },
        { key: 'apellido_1', label: 'Apellido 1', type: 'text' },
        { key: 'apellido_2', label: 'Apellido 2', type: 'text' },
        { key: 'email', label: 'Email', type: 'email' }
    ]
    // Aquí puedes añadir en el futuro esquemas para: usuarios, turnos, tiendas...
};