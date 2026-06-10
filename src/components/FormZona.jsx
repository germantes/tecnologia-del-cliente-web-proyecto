import GenericForm from './GenericForm';
import { zonaSchema } from './formSchemas';

function FormZona({ onClose, existingZonas, onZonaCreated, initialData = null }) {
    const isEditMode = !!initialData;
    
    return (
        <GenericForm
            title={isEditMode ? 'Editar Zona' : 'Crear Nueva Zona'}
            fields={zonaSchema.fields}
            apiEndpoint={
                isEditMode 
                    ? `${zonaSchema.apiEndpoint}/${initialData.id_zona}` 
                    : zonaSchema.apiEndpoint
            }
            method={isEditMode ? 'PUT' : 'POST'}
            initialData={isEditMode ? {
                cp: initialData.cp || '',
                localidad: initialData.localidad || '',
                nombreDistrito: (initialData.distrito?.nombre_distrito) || (initialData.nombreDistrito) || '',
                zonaGeografica: (initialData.zona?.zona_geografica) || (initialData.zonaGeografica) || (initialData.zona_geografica) || '',
                descripcion: initialData.descripcion || '',
            } : {}}
            onClose={onClose}
            onSuccess={onZonaCreated}
            validate={(formData) => {
                // En modo edición, excluir la zona actual de la validación
                const recordsToCheck = isEditMode
                    ? existingZonas.filter(z => z.id_zona !== initialData.id_zona)
                    : existingZonas;
                return zonaSchema.validate(formData, recordsToCheck);
            }}
            transformSubmitData={zonaSchema.transformSubmitData}
        />
    );
}

export default FormZona;
