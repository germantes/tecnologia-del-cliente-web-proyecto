document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const id = urlParams.get('id');

    const formFields = document.getElementById('form-fields');
    const editTitle = document.getElementById('edit-title');
    const saveBtn = document.getElementById('save-btn');
    const editForm = document.getElementById('edit-form');
    const alertContainer = document.getElementById('alert-container');

    // Buscar el botón de volver
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        // Apuntamos correctamente a la carpeta /html/
        backBtn.href = (typeof SCHEMAS !== 'undefined' && SCHEMAS[type]) ? `/html/${type}.html` : '/html/index.html';
    }

    const perfil = sessionStorage.getItem('perfil');
    const isAdmin = perfil === 'ADMINISTRADOR';
    const isManager = perfil === 'COORDINADOR';
    const canAccess = isAdmin || isManager;
    const allowedResources = new Set(['usuarios', 'entidades', 'campanias', 'tiendas', 'turnos', 'voluntarios', 'zonas']);

    // Al quitar la verificación de "!id", permitimos usar este script para la Creación.
    if (!canAccess || !type || !allowedResources.has(type)) {
        formFields.textContent = '';
        const p = document.createElement('p');
        p.style.color = 'var(--color-danger)';
        p.textContent = 'Error: acceso no autorizado o recurso no válido.';
        formFields.appendChild(p);
        return;
    }

    editTitle.textContent = id ? `Editar ${type} #${id}` : `Nuevo ${type}`;

    let originalData = {};

    try {
        if (id) {
            originalData = await getRecord(type, id);
        }

        formFields.textContent = '';
        const coordinatorEditable = isManager;
        const volunteerContactFields = new Set(['nombre', 'email', 'telefono']);

        // Leemos el esquema (si no existe, usamos un generador por defecto basado en los datos)
        const schema = typeof SCHEMAS !== 'undefined' && SCHEMAS[type]
            ? SCHEMAS[type]
            : Object.keys(originalData).map(key => ({ key, label: key.charAt(0).toUpperCase() + key.slice(1), type: typeof originalData[key] === 'number' ? 'number' : 'text' }));

        let usuariosDisponibles = [];
        if (schema.some(field => field.type === 'select_usuario')) {
            try { usuariosDisponibles = await getUsuarios(); } catch (e) { console.warn('No se pudieron cargar usuarios'); }
        }

        let entidadesDisponibles = [];
        if (schema.some(field => field.type === 'select_entidad')) {
            try { entidadesDisponibles = await getEntidades(); } catch (e) { console.warn('No se pudieron cargar entidades'); }
        }

        let tiendasDisponibles = [];
        if (schema.some(field => field.type === 'select_tienda')) {
            try { tiendasDisponibles = typeof getTiendas === 'function' ? await getTiendas() : await getRecords('tiendas'); } catch (e) { console.warn('No se pudieron cargar tiendas'); }
        }

        let campaniasDisponibles = [];
        if (schema.some(field => field.type === 'select_campania')) {
            try { campaniasDisponibles = typeof getCampanias === 'function' ? await getCampanias() : await getRecords('campanias'); } catch (e) { console.warn('No se pudieron cargar campañas'); }
        }

        let zonasDisponibles = [];
        if (schema.some(field => field.type === 'select_zona')) {
            try { zonasDisponibles = typeof getZonas === 'function' ? await getZonas() : await getRecords('cp'); } catch (e) { console.warn('No se pudieron cargar zonas'); }
        }

        let cadenasDisponibles = [];
        if (schema.some(field => field.type === 'select_cadena')) {
            try {
                const dataCadenas = typeof getCadenas === 'function' ? await getCadenas() : await getRecords('cadenas');
                cadenasDisponibles = Array.from(new Map(dataCadenas.map(cad => [cad.establecimiento, cad])).values());
            } catch (e) { console.warn('No se pudieron cargar cadenas'); }
        }

        // Los roles los voy a hardcodear aqui porque en un principio no habría otros aparte de estos.
        // No puedo hacer un fetch porque no hay un endpoint como tal para recuperar los roles ya que no son una tabla.

        let rolesDisponibles = ["ADMINISTRADOR", "COORDINADOR", "CAPITAN", "RESPONSABLE-ENTIDAD", "RESPONSABLE-TIENDA"];

        for (const field of schema) {
            const value = originalData[field.key] !== undefined ? originalData[field.key] : '';
            const fieldDiv = document.createElement('div');
            fieldDiv.className = 'field';

            let isReadOnly = field.readonly || (coordinatorEditable && type === 'voluntarios' && !volunteerContactFields.has(field.key));

            const label = document.createElement('label');
            label.htmlFor = field.key;
            label.textContent = field.label;
            fieldDiv.appendChild(label);


            if (field.type === 'boolean') {
                const esVinculado = (value === true || String(value).toLowerCase() === 'true' || value === 1);
                const select = document.createElement('select');
                select.id = field.key; select.name = field.key;
                if (isReadOnly) { select.disabled = true; select.style.background = 'var(--color-surface-2)'; }

                const optTrue = document.createElement('option');
                optTrue.value = 'true'; optTrue.textContent = 'Sí'; optTrue.selected = esVinculado;

                const optFalse = document.createElement('option');
                optFalse.value = 'false'; optFalse.textContent = 'No'; optFalse.selected = !esVinculado;

                select.append(optTrue, optFalse);
                fieldDiv.appendChild(select);

            } else if (field.type && field.type.startsWith('select_')) {
                const select = document.createElement('select');
                select.id = field.key; select.name = field.key;
                if (isReadOnly) { select.disabled = true; select.style.background = 'var(--color-surface-2)'; }
                if (field.required && !isReadOnly) select.required = true;

                const defaultOpt = document.createElement('option');
                defaultOpt.value = ''; defaultOpt.textContent = `Seleccione ${field.label}...`;
                if (!value) defaultOpt.selected = true;
                select.appendChild(defaultOpt);

                let optionsData = [];
                if (field.type === 'select_usuario') optionsData = usuariosDisponibles;
                else if (field.type === 'select_entidad') optionsData = entidadesDisponibles;
                else if (field.type === 'select_tienda') optionsData = tiendasDisponibles;
                else if (field.type === 'select_campania') optionsData = campaniasDisponibles;
                else if (field.type === 'select_zona') optionsData = zonasDisponibles;
                else if (field.type === 'select_rol') optionsData = rolesDisponibles;
                else if (field.type === 'select_cadena') optionsData = cadenasDisponibles;

                optionsData.forEach(item => {
                    const resourceType = field.type.replace('select_', '');
                    let itemId, itemName;
                    // Esto voy a intentar refactorizarlo luego, seguro que se puede hacer de otra forma
                    if (resourceType === 'rol') {
                        itemId = item;
                        itemName = item;
                        // SI ES COORDINADOR O CAPI, ENTONCES HAY ZONA, SI NO, NO (o eso creo).
                    } else if (resourceType === 'zona') {
                        itemId = item.cp || item.id_cp || item;
                        itemName = item.localidad ? `${itemId} - ${item.localidad}` : String(itemId);
                        // else if (resourceType === 'cadena') {
                        //     itemId = item.id_cadena || item.idCadena || item.id;
                        //     itemName = item.establecimiento || `ID: ${itemId}`;
                    } else {
                        itemId = item[`id_${resourceType}`] || item[`id${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}`] || item.id || Object.values(item)[0];
                        itemName = item.nombre_completo || item.nombre || item.domicilio || item.localidad || item.establecimiento || `ID: ${itemId}`;
                        if (resourceType === 'tienda') itemName = `${item.domicilio || ''}`;
                    }

                    const option = document.createElement('option');
                    option.value = itemId;
                    option.textContent = itemName;

                    // Evitar fallos de selección si el valor devuelto por la API es un objeto (ej. un JOIN de Supabase)
                    let safeValue = value;
                    if (value !== null && typeof value === 'object') {
                        safeValue = value.id_cadena || value.idCadena || value.cp || value.id_cp || value.id_zona || value.id || Object.values(value)[0];
                    }

                    if (String(itemId) === String(safeValue)) option.selected = true;
                    select.appendChild(option);
                });
                fieldDiv.appendChild(select);

            } else {
                const inputType = field.type || (typeof value === 'number' && value !== '' ? 'number' : 'text');
                const input = document.createElement('input');
                input.type = inputType; input.id = field.key; input.name = field.key;
                if (isReadOnly) { input.readOnly = true; input.style.background = 'var(--color-surface-2)'; }
                // Al crear, mostrar un texto de ayuda en el placeholder del campo ID
                if (!id && (field.key.startsWith('id_') || field.key === 'id')) {
                    input.placeholder = 'Autogenerado';
                }

                if (inputType === 'password') {
                    input.value = ''; // Nunca mostramos el hash de la BD
                    if (id) input.placeholder = 'Dejar en blanco para mantener la actual';
                } else {
                    input.value = String(value);
                }

                if (field.required && !isReadOnly) input.required = true;
                if (id && inputType === 'password') input.required = false; // No obligar a rellenar si estamos editando
                fieldDiv.appendChild(input);
            }

            formFields.appendChild(fieldDiv);
        }
        saveBtn.disabled = false;

        // Agregar botón de eliminar si es admin y estamos editando un registro existente
        if (isAdmin && id) {
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'btn btn-danger';
            deleteBtn.textContent = 'Eliminar';
            deleteBtn.style.marginLeft = '10px';
            deleteBtn.addEventListener('click', async () => {
                if (confirm(`¿Estás seguro de que deseas eliminar este registro de ${type}?`)) {
                    try {
                        // Validación preventiva dinámica basada en los esquemas (SCHEMAS)
                        if (typeof SCHEMAS !== 'undefined' && SCHEMAS[type]) {
                            // 1. Identificamos la clave primaria del tipo actual (ej. 'id_entidad' para 'entidades')
                            const pkField = SCHEMAS[type].find(f => f.key.startsWith('id_') || f.key === 'id')?.key;

                            if (pkField) {
                                // 2. Buscamos qué otros esquemas usan esta clave como clave foránea
                                for (const [otherType, otherSchema] of Object.entries(SCHEMAS)) {
                                    if (otherType === type) continue;

                                    const isDependent = otherSchema.some(f => f.key === pkField);
                                    if (isDependent) {
                                        const fnName = `get${otherType.charAt(0).toUpperCase()}${otherType.slice(1)}`;
                                        const camelCasePk = pkField.replace(/_([a-z])/g, g => g[1].toUpperCase()); // Convierte 'id_entidad' a 'idEntidad'

                                        // Llamamos a la API usando la función específica (ej. getVoluntarios) o el fallback
                                        const getRecordsFn = typeof window[fnName] === 'function' ? window[fnName] : (params) => getRecords(otherType, params);
                                        const dependientes = await getRecordsFn({ [camelCasePk]: id }).catch(() => []);

                                        if (dependientes && dependientes.length > 0) {
                                            alert(`No se puede eliminar. Hay ${dependientes.length} registro(s) en '${otherType}' que dependen de este elemento. Reasígnelos o elimínelos primero.`);
                                            return; // Detenemos la eliminación
                                        }
                                    }
                                }
                            }
                        }

                        await deleteRecord(type, id);
                        window.location.href = (typeof SCHEMAS !== 'undefined' && SCHEMAS[type]) ? `/html/${type}.html` : '/html/index.html';
                    } catch (err) {
                        alert('Error al eliminar: ' + err.message);
                    }
                }
            });
            saveBtn.parentNode.appendChild(deleteBtn);
        }
    } catch (err) {
        formFields.textContent = '';
        const p = document.createElement('p');
        p.style.color = 'var(--color-danger)';
        p.textContent = `Error: ${err.message}`;
        formFields.appendChild(p);
        return;
    }

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        saveBtn.disabled = true;
        const originalBtnText = saveBtn.textContent;
        saveBtn.textContent = ' Guardando...';
        const spinner = document.createElement('span');
        spinner.className = 'btn-spinner';
        saveBtn.prepend(spinner);

        alertContainer.textContent = '';

        const formData = new FormData(editForm);
        const updatedData = {}; // Solo enviamos lo que hay en el form (evita enviar campos virtuales cacheados)

        for (const [key, val] of formData.entries()) {
            let parsedVal = val;
            if (val === '') {
                // Al crear, omitimos los campos ID vacíos para evitar errores de llave primaria
                if (!id && (key.startsWith('id_') || key === 'id')) continue;
                // Si estamos editando y la contraseña está vacía, la omitimos para no borrar la actual
                if (id && key === 'password') continue;
                parsedVal = null; // Convierte campos vacíos a null para que Supabase no dé error de tipo
            } else if (val === 'true') parsedVal = true;
            else if (val === 'false') parsedVal = false;
            else if (typeof originalData[key] === 'number') parsedVal = Number(val);

            updatedData[key] = parsedVal;
        }

        try {
            if (id) {
                await updateRecord(type, id, updatedData);
            } else {
                await createRecord(type, updatedData);
            }

            alertContainer.textContent = '';
            const successAlert = document.createElement('div');
            successAlert.className = 'alert alert-success';
            successAlert.textContent = 'Guardado correctamente.';
            alertContainer.appendChild(successAlert);
        } catch (err) {
            alertContainer.textContent = '';
            const errorAlert = document.createElement('div');
            errorAlert.className = 'alert alert-error';
            errorAlert.textContent = err.message;
            alertContainer.appendChild(errorAlert);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = originalBtnText;
        }
    });
});