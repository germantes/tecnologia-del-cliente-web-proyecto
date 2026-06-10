// schemas.js - Configuración genérica de formularios
const SCHEMAS = {
    entidades: [
        { key: 'id_entidad', label: 'ID Entidad', type: 'text', readonly: true },
        { key: 'nombre', label: 'Nombre', type: 'text', required: true },
        { key: 'domicilio', label: 'Domicilio', type: 'text' },
        { key: 'cp', label: 'Código Postal', type: 'select_zona' },
        { key: 'codigo_bancosol', label: 'Código Bancosol', type: 'text' },
        { key: 'vinculado_bancosol', label: 'Vinculado a Bancosol', type: 'boolean' },
        { key: 'id_usuario_contacto', label: 'Usuario de Contacto', type: 'select_usuario' }
    ],
    voluntarios: [
        { key: 'id_voluntario', label: 'ID Voluntario', type: 'text', readonly: true },
        { key: 'id_entidad', label: 'Entidad', type: 'select_entidad', required: true },
        { key: 'nombre', label: 'Nombre', type: 'text', required: true },
        { key: 'apellido_1', label: 'Apellido 1', type: 'text' },
        { key: 'apellido_2', label: 'Apellido 2', type: 'text' },
        { key: 'email', label: 'Email', type: 'email' }
    ],
    tiendas: [
        { key: 'id_tienda', label: 'ID Tienda', type: 'text', readonly: true },
        { key: 'domicilio', label: 'Domicilio', type: 'text', required: true },
        { key: 'id_cp', label: 'Zona (CP)', type: 'select_zona', required: true },
        { key: 'id_cadena', label: 'Cadena', type: 'select_cadena', required: true }
    ],
    turnos: [
        { key: 'id_turno', label: 'ID Turno', type: 'text', readonly: true },
        { key: 'id_tienda', label: 'Tienda', type: 'select_tienda', required: true },
        { key: 'id_campania', label: 'Campaña', type: 'select_campania', required: true },
        { key: 'fecha', label: 'Fecha', type: 'date', required: true },
        { key: 'turno', label: 'Turno (manana/tarde)', type: 'text', required: true },
        { key: 'id_entidad', label: 'Entidad Responsable', type: 'select_entidad' },
        { key: 'observaciones', label: 'Observaciones', type: 'text' }
    ],
    campanias: [
        { key: 'id_campania', label: 'ID Campaña', type: 'text', readonly: true },
        { key: 'nombre', label: 'Nombre', type: 'text', required: true },
        { key: 'fecha_inicio', label: 'Fecha Inicio', type: 'date', required: true },
        { key: 'fecha_fin', label: 'Fecha Fin', type: 'date', required: true },
        { key: 'tipo', label: 'Tipo', type: 'text' }
    ],
    zonas: [
        { key: 'cp', label: 'Código Postal', type: 'text', readonly: true },
        { key: 'localidad', label: 'Localidad', type: 'select_localidad', required: true },
        { key: 'distrito', label: 'Distrito', type: 'select_distrito' },
        { key: 'id_zona', label: 'Zona Geográfica', type: 'select_zona', required: true }
    ],
    usuarios: [
        { key: 'id_usuario', label: 'ID Usuario', type: 'text', readonly: true },
        { key: 'nombre_completo', label: 'Nombre Completo', type: 'text', required: true },
        { key: 'email', label: 'Email', type: 'email', required: true },
        { key: 'rol', label: 'Rol/Puesto', type: 'select_rol', required: true },
        { key: 'cp', label: 'Zona Asignada', type: 'select_zona' },
        { key: 'contrasenia', label: 'Contraseña', type: 'password' },
        { key: 'telefono', label: 'Teléfono', type: 'number' }
    ]
};