import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getAuthHeaders, getPerfil } from './session.js';
import FormCadena from './FormCadena';
import FormCampania from './FormCampania';
import FormZona from './FormZona';

/**
 * Página de edición genérica que maneja crear/editar para diferentes entidades
 * URL: /edit/:entityType?id=123
 * 
 * entityType: 'cadena', 'campania', 'zona'
 * id (query param): ID de la entidad a editar (opcional, si no existe es modo crear)
 */
function EditPage() {
    const { entityType } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const id = searchParams.get('id') || searchParams.get('cp');
    
    const [entityData, setEntityData] = useState(null);
    const [existingRecords, setExistingRecords] = useState([]);
    const [loading, setLoading] = useState(!!id); // Solo loading si estamos editando
    const [error, setError] = useState(null);

    // Mapeo de tipos de entidad a endpoints (para GET)
    const endpointsGet = {
        cadena: '/api/cadenas',
        campania: '/api/campanias',
        zona: '/api/cp',  // GET zonas usa /api/cp
    };

    const endpointsWrite = {
        cadena: '/api/cadenas',
        campania: '/api/campanias',
        zona: '/api/zonas',
    };

    const endpointGet = endpointsGet[entityType];
    const endpointWrite = endpointsWrite[entityType];

    useEffect(() => {
        if (!endpointGet) {
            setError(`Tipo de entidad inválido: ${entityType}`);
            return;
        }

        async function fetchData() {
            try {
                // Cargar todos los registros
                const allResponse = await fetch(endpointGet, {
                    headers: getAuthHeaders(),
                });
                if (!allResponse.ok) throw new Error('Error cargando registros');
                const allData = await allResponse.json();
                setExistingRecords(allData);

                // Si hay ID, buscar el registro específico en el array
                if (id) {
                    const idFields = {
                        cadena: 'id_cadena',
                        campania: 'id_campania',
                        zona: 'cp',
                    };
                    const idField = idFields[entityType];
                    const record = allData.find(item => String(item[idField]) === String(id));
                    
                    if (!record) {
                        throw new Error(`No se encontró el registro con ID ${id}`);
                    }
                    setEntityData(record);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [entityType, id, endpointGet]);

    const handleClose = () => {
        const redirects = {
            cadena: '/cadenas',
            campania: '/campanias',
            zona: '/zonas',
        };
        navigate(redirects[entityType] || '/homepage');
    };

    const handleSuccess = (savedData) => {
        // Redirigir después de guardar exitosamente
        const redirects = {
            cadena: '/cadenas',
            campania: '/campanias',
            zona: '/zonas',
        };
        window.location.href = redirects[entityType] || '/homepage';
    };

    const isAdmin = getPerfil() === 'ADMINISTRADOR';

    const handleDelete = async (entityType) => {
        const labels = { campania: 'campaña', cadena: 'cadena' };
        const label = labels[entityType] || 'registro';
        const redirects = { campania: '/campanias', cadena: '/cadenas' };
        const endpoints = { campania: `/api/campanias/${id}`, cadena: `/api/cadenas/${id}` };

        if (!window.confirm(`¿Estás seguro de que deseas eliminar esta ${label}?`)) return;
        try {
            const response = await fetch(endpoints[entityType], {
                method: 'DELETE',
                headers: getAuthHeaders(),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Error al eliminar');
            }
            window.location.href = redirects[entityType] || `/${entityType}`;
        } catch (err) {
            alert('Error al eliminar: ' + err.message);
        }
    };

    if (loading) {
        return (
            <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <div className="loading">
                    <span className="spinner"></span> Cargando...
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main style={{ padding: '2rem' }}>
                <div className="alert alert-error">
                    Error: {error}
                </div>
                <button onClick={handleClose} style={{ marginTop: '1rem' }}>
                    Volver
                </button>
            </main>
        );
    }

    // Renderizar el formulario según el tipo de entidad
    switch (entityType) {
        case 'cadena':
            return (
                <FormCadena
                    initialData={entityData}
                    onClose={handleClose}
                    existingCadenas={existingRecords}
                    onCadenaCreated={handleSuccess}
                    showDelete={isAdmin && !!id}
                    onDelete={() => handleDelete('cadena')}
                />
            );
        
        case 'campania':
            return (
                <FormCampania
                    initialData={entityData}
                    onClose={handleClose}
                    onCampaniaCreated={handleSuccess}
                    showDelete={isAdmin && !!id}
                    onDelete={() => handleDelete('campania')}
                />
            );
        
        case 'zona':
            return (
                <FormZona
                    initialData={entityData}
                    onClose={handleClose}
                    existingZonas={existingRecords}
                    onZonaCreated={handleSuccess}
                />
            );
        
        default:
            return (
                <main style={{ padding: '2rem' }}>
                    <div className="alert alert-error">
                        Tipo de entidad no soportado: {entityType}
                    </div>
                    <button onClick={handleClose}>Volver</button>
                </main>
            );
    }
}

export default EditPage;
