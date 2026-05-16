document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const id = urlParams.get('id');

    const formFields = document.getElementById('form-fields');
    const editTitle = document.getElementById('edit-title');
    const saveBtn = document.getElementById('save-btn');
    const editForm = document.getElementById('edit-form');
    const alertContainer = document.getElementById('alert-container');

    const perfil = sessionStorage.getItem('perfil');
    const canAccess = perfil === 'admin' || perfil === 'coordinador';
    const allowedResources = new Set(['usuarios', 'entidades', 'campanias', 'tiendas', 'turnos', 'schedule', 'voluntarios']);

    if (!canAccess || !type || !id || !allowedResources.has(type)) {
        formFields.innerHTML = '<p style="color:var(--color-danger)">Error: acceso no autorizado, recurso no válido o falta el ID.</p>';
        return;
    }

    editTitle.textContent = `Editar ${type} #${id}`;

    let originalData = {};

    try {
        originalData = await getRecord(type, id);

        formFields.innerHTML = '';
        const coordinatorEditable = perfil === 'coordinador';
        const volunteerContactFields = new Set(['nombre', 'email', 'telefono']);

        for (const key of Object.keys(originalData)) {
            const value = originalData[key];
            const fieldDiv = document.createElement('div');
            fieldDiv.className = 'field';

            const isId = key === 'id' || key === 'idVoluntario';
            const isReadOnlyForCoordinator = coordinatorEditable && type === 'voluntarios' && !volunteerContactFields.has(key);
            const inputType = typeof value === 'number' ? 'number' : 'text';
            const readonlyAttr = isId || isReadOnlyForCoordinator ? 'readonly' : '';
            const styleAttr = isId || isReadOnlyForCoordinator ? 'style="background:var(--color-surface-2)"' : '';
            const requiredAttr = readonlyAttr ? '' : 'required';

            fieldDiv.innerHTML = `
        <label for="${key}">${key.charAt(0).toUpperCase() + key.slice(1)}</label>
        <input type="${inputType}" 
               id="${key}" name="${key}" value="${String(value)}" 
               ${readonlyAttr} ${styleAttr} ${requiredAttr}>
      `;
            formFields.appendChild(fieldDiv);
        }
        saveBtn.disabled = false;

    } catch (err) {
        formFields.innerHTML = `<p style="color:var(--color-danger)">Error: ${err.message}</p>`;
        return;
    }

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        saveBtn.disabled = true;
        const originalBtnHtml = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="btn-spinner"></span> Guardando...';
        alertContainer.innerHTML = '';

        const formData = new FormData(editForm);
        const updatedData = { ...originalData };

        for (const [key, val] of formData.entries()) {
            updatedData[key] = typeof originalData[key] === 'number' ? Number(val) : val;
        }

        try {
            await updateRecord(type, id, updatedData);
            alertContainer.innerHTML = '<div class="alert alert-success">Guardado correctamente.</div>';
        } catch (err) {
            alertContainer.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnHtml;
        }
    });
});