import GenericForm from './GenericForm';
import { campaniaSchema } from './formSchemas';

function FormCampania({ onClose, onCampaniaCreated, initialData = null }) {
    const isEditMode = !!initialData;
    
    return (
        <GenericForm
            title={isEditMode ? 'Editar Campaña' : 'Crear Nueva Campaña'}
            fields={campaniaSchema.fields}
            apiEndpoint={
                isEditMode 
                    ? `${campaniaSchema.apiEndpoint}/${initialData.id_campania}` 
                    : campaniaSchema.apiEndpoint
            }
            method={isEditMode ? 'PUT' : 'POST'}
            initialData={isEditMode ? {
                nombre: initialData.nombre,
                tipo: initialData.tipo,
                fechaInicio: initialData.fecha_inicio?.split('T')[0],
                fechaFin: initialData.fecha_fin?.split('T')[0],
            } : {}}
            onClose={onClose}
            onSuccess={onCampaniaCreated}
            validate={campaniaSchema.validate}
            transformSubmitData={campaniaSchema.transformSubmitData}
        />
    );
}

export default FormCampania;
