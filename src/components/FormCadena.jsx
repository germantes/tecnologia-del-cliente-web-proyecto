import GenericForm from './GenericForm';
import { cadenaSchema } from './formSchemas';

function FormCadena({ onClose, existingCadenas, onCadenaCreated, initialData = null, showDelete, onDelete }) {
    const isEditMode = !!initialData;
    
    return (
        <GenericForm
            title={isEditMode ? 'Editar Cadena' : 'Crear Nueva Cadena'}
            fields={cadenaSchema.fields}
            apiEndpoint={
                isEditMode 
                    ? `${cadenaSchema.apiEndpoint}/${initialData.id_cadena}` 
                    : cadenaSchema.apiEndpoint
            }
            method={isEditMode ? 'PUT' : 'POST'}
            initialData={isEditMode ? {
                codigoCadena: initialData.codigo_cadena,
                establecimiento: initialData.establecimiento,
                nombreParticular: initialData.nombre_particular,
                empresa: initialData.empresa,
            } : {}}
            onClose={onClose}
            onSuccess={onCadenaCreated}
            validate={(formData) => {
                // En modo edición, excluir la cadena actual de la validación
                const recordsToCheck = isEditMode
                    ? existingCadenas.filter(c => c.id_cadena !== initialData.id_cadena)
                    : existingCadenas;
                return cadenaSchema.validate(formData, recordsToCheck);
            }}
            transformSubmitData={cadenaSchema.transformSubmitData}
            showDelete={showDelete}
            onDelete={onDelete}
        />
    );
}

export default FormCadena;
