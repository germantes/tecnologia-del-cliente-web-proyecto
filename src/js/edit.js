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
        backBtn.href = (typeof SCHEMAS !== 'undefined' && SCHEMAS[type]) ? `${type}.html` : 'index.html';
    }

    const perfil = sessionStorage.getItem('perfil');
    const canAccess = perfil === 'admin' || perfil === 'coordinador';
    const allowedResources = new Set(['usuarios', 'entidades', 'campanias', 'tiendas', 'turnos', 'schedule', 'voluntarios']);

    if (!canAccess || !type || !id || !allowedResources.has(type)) {
        formFields.textContent = '';
        const p = document.createElement('p');
        p.style.color = 'var(--color-danger)';
        p.textContent = 'Error: acceso no autorizado, recurso no válido o falta el ID.';
        formFields.appendChild(p);
        return;
    }

    editTitle.textContent = `Editar ${type} #${id}`;

    let originalData = {};

    try {
        originalData = await getRecord(type, id);

        formFields.textContent = '';
        const coordinatorEditable = perfil === 'coordinador';
        const volunteerContactFields = new Set(['nombre', 'email', 'telefono']);

        // Leemos el esquema (si no existe, usamos un generador por defecto basado en los datos)
        const schema = typeof SCHEMAS !== 'undefined' && SCHEMAS[type]
            ? SCHEMAS[type]
            : Object.keys(originalData).map(key => ({ key, label: key.charAt(0).toUpperCase() + key.slice(1), type: typeof originalData[key] === 'number' ? 'number' : 'text' }));

        let usuariosDisponibles = [];
        if (schema.some(field => field.type === 'select_usuario')) {
            try { usuariosDisponibles = await getUsuarios(); } catch (e) { console.warn('No se pudieron cargar usuarios'); }
        }

        for (const field of schema) {
            const value = originalData[field.key] !== undefined ? originalData[field.key] : '';
            const fieldDiv = document.createElement('div');
            fieldDiv.className = 'field';

            const isReadOnly = field.readonly || (coordinatorEditable && type === 'voluntarios' && !volunteerContactFields.has(field.key));

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

            } else {
                const inputType = field.type || (typeof value === 'number' && value !== '' ? 'number' : 'text');
                const input = document.createElement('input');
                input.type = inputType; input.id = field.key; input.name = field.key; input.value = String(value);
                if (isReadOnly) { input.readOnly = true; input.style.background = 'var(--color-surface-2)'; }
                if (field.required && !isReadOnly) input.required = true;
                fieldDiv.appendChild(input);
            }

            formFields.appendChild(fieldDiv);
        }
        saveBtn.disabled = false;

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
            if (val === '') parsedVal = null; // Convierte campos vacíos a null para que Supabase no dé error de tipo
            else if (val === 'true') parsedVal = true;
            else if (val === 'false') parsedVal = false;
            else if (typeof originalData[key] === 'number') parsedVal = Number(val);

            updatedData[key] = parsedVal;
        }

        try {
            await updateRecord(type, id, updatedData);

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