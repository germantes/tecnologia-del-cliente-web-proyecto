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
        // Si existe un esquema para este 'type' (ej: entidades), volvemos a entidades.html. Si no, a index.html.
        backBtn.href = (typeof SCHEMAS !== 'undefined' && SCHEMAS[type]) ? `/html/${type}.html` : '/index.html';
    }

    const perfil = sessionStorage.getItem('perfil');
    const isAdmin = perfil === 'admin';
    const isManager = perfil === 'coordinador' || perfil === 'manager';
    const canAccess = isAdmin || isManager;
    const allowedResources = new Set(['usuarios', 'entidades', 'campanias', 'tiendas', 'turnos', 'voluntarios']);

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

            } else if (field.type === 'select_usuario') {
                const select = document.createElement('select');
                select.id = field.key; select.name = field.key;
                if (isReadOnly) { select.disabled = true; select.style.background = 'var(--color-surface-2)'; }

                const defaultOpt = document.createElement('option');
                defaultOpt.value = ''; defaultOpt.textContent = 'Sin contacto';
                select.appendChild(defaultOpt);

                usuariosDisponibles.forEach(u => {
                    const uid = u.id_usuario || u.idUsuario || u.id;
                    const unombre = u.nombre_completo || u.nombre || u.nombreUsuario || 'Sin nombre';
                    const option = document.createElement('option');
                    option.value = uid; option.textContent = unombre;
                    if (String(uid) === String(value)) option.selected = true;
                    select.appendChild(option);
                });
                fieldDiv.appendChild(select);

            } else if (field.type === 'select_entidad') {
                const select = document.createElement('select');
                select.id = field.key; select.name = field.key;
                if (isReadOnly) { select.disabled = true; select.style.background = 'var(--color-surface-2)'; }
                if (field.required && !isReadOnly) select.required = true;

                const defaultOpt = document.createElement('option');
                defaultOpt.value = ''; defaultOpt.textContent = 'Seleccione una entidad...';
                if (!value) defaultOpt.selected = true;
                select.appendChild(defaultOpt);

                entidadesDisponibles.forEach(e => {
                    const eid = e.id_entidad || e.idEntidad || e.id;
                    const enombre = e.nombre || e.nombre_completo || 'Sin nombre';
                    const option = document.createElement('option');
                    option.value = eid; option.textContent = enombre;
                    if (String(eid) === String(value)) option.selected = true;
                    select.appendChild(option);
                });
                fieldDiv.appendChild(select);

            } else {
                const inputType = field.type || (typeof value === 'number' && value !== '' ? 'number' : 'text');
                const input = document.createElement('input');
                input.type = inputType; input.id = field.key; input.name = field.key; input.value = String(value);
                if (isReadOnly) { input.readOnly = true; input.style.background = 'var(--color-surface-2)'; }
                // Al crear, mostrar un texto de ayuda en el placeholder del campo ID
                if (!id && (field.key.startsWith('id_') || field.key === 'id')) {
                    input.placeholder = 'Autogenerado';
                }
                if (field.required && !isReadOnly) input.required = true;
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
                        // Si sabemos de qué tipo es (ej: entidades), volvemos a su lista. Si no, al inicio.
                        window.location.href = (typeof SCHEMAS !== 'undefined' && SCHEMAS[type]) ? `/${type}.html` : '/index.html';
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