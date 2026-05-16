// api.js — Funciones de comunicación con el servidor
// Todas las funciones son asíncronas y devuelven una promesa con los datos

// Usar la URL de la API desde window.API_URL (inyectada por index.html) o la por defecto
const API_BASE = window.API_URL || 'http://localhost:3000';

// Obtiene el token del sessionStorage
function getToken() {
  return sessionStorage.getItem('token');
}

// Cabeceras con autorización
function authHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getToken(),
    ...extra
  };
}

// --- FUNCIONES GENÉRICAS (El motor de la API) ---

// Función para peticiones de escritura (POST, PUT, PATCH, DELETE)
async function apiRequest(method, resource, data = null, id = null) {
  const url = id ? `${API_BASE}/${resource}/${id}` : `${API_BASE}/${resource}`;

  const options = {
    method: method,
    headers: authHeaders()
  };

  if (data) options.body = JSON.stringify(data);

  const response = await fetch(url, options);

  // DELETE suele devolver 200/204 sin cuerpo
  if (method === 'DELETE' && response.ok) return true;

  const responseData = await response.json();
  if (!response.ok) throw new Error(responseData.message || `Error en la operación ${method}`);
  return responseData;
}

// --- REUTILIZACIÓN PARA TUS CASOS ESPECÍFICOS ---

// Crear cualquier cosa (Colaborador, Capitán, Tienda...)
const createRecord = (resource, data) => apiRequest('POST', resource, data);

// Actualizar cualquier cosa (Permite al Coordinador solo enviar campos de contacto)
const updateRecord = (resource, id, data) => apiRequest('PUT', resource, data, id);

// Borrar cualquier cosa
const deleteRecord = (resource, id) => apiRequest('DELETE', resource, null, id);


// --- FUNCIONES GENÉRICAS DE LECTURA ---

async function getRecords(resource, queryParams = {}) {
  let url = `${API_BASE}/${resource}`;
  const queryString = Object.entries(queryParams)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  if (queryString) url += `?${queryString}`;

  const response = await fetch(url, {
    headers: authHeaders()
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || `Error al cargar ${resource}`);
  return data;
}

async function getRecord(resource, id) {
  return apiRequest('GET', resource, null, id);
}

// Ahora estas funciones son "alias" de las genéricas
async function getUsuarios(params = {}) { return getRecords('usuarios', params); }
async function getEntidades(params = {}) { return getRecords('entidades', params); }
async function getCampanias(params = {}) { return getRecords('campanias', params); }
async function getTiendas(params = {}) { return getRecords('tiendas', params); }
async function getTurnos(params = {}) { return getRecords('turnos', params); }
async function getVoluntarios(params = {}) { return getRecords('voluntarios', params); }
async function getSchedule(params = {}) { return getRecords('schedule', params); }
async function getMe() { return getRecord('me'); }

async function postUsuario(datos) { return createRecord('usuarios', datos); }
async function putUsuario(id, datos) { return updateRecord('usuarios', id, datos); }
async function deleteUsuario(id) { return deleteRecord('usuarios', id); }

async function postVoluntario(datos) { return createRecord('voluntarios', datos); }
async function putVoluntario(id, datos) { return updateRecord('voluntarios', id, datos); }
async function deleteVoluntario(id) { return deleteRecord('voluntarios', id); }

async function postEntidad(datos) { return createRecord('entidades', datos); }
async function putEntidad(id, datos) { return updateRecord('entidades', id, datos); }
async function deleteEntidad(id) { return deleteRecord('entidades', id); }

async function postTienda(datos) { return createRecord('tiendas', datos); }
async function putTienda(id, datos) { return updateRecord('tiendas', id, datos); }
async function deleteTienda(id) { return deleteRecord('tiendas', id); }

async function postTurno(datos) { return createRecord('turnos', datos); }
async function putTurno(id, datos) { return updateRecord('turnos', id, datos); }
async function deleteTurno(id) { return deleteRecord('turnos', id); }

async function postCampania(datos) { return createRecord('campanias', datos); }
async function putCampania(id, datos) { return updateRecord('campanias', id, datos); }
async function deleteCampania(id) { return deleteRecord('campanias', id); }

async function postSchedule(datos) { return createRecord('schedule', datos); }
async function putSchedule(id, datos) { return updateRecord('schedule', id, datos); }
async function deleteSchedule(id) { return deleteRecord('schedule', id); }

// POST /auth/login — devuelve { success, token, user }
async function login(nombreUsuario, contrasena) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombreUsuario, contrasena })
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || 'Error de autenticación');
  return data;
}


async function inicializarVistaCapitanes() {
  const user = JSON.parse(sessionStorage.getItem('usuario'));
  const perfil = sessionStorage.getItem('perfil');

  let capitanes;
  if (perfil === 'admin') {
    // ADMIN: Ve todos
    capitanes = await getCapitanes();
  } else if (perfil === 'coordinador') {
    // COORDINADOR: Solo los de su zona
    capitanes = await getCapitanes(user.zonaId);
  }
  renderTabla(capitanes);
}