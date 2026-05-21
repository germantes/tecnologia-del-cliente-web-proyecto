// api.js — Funciones de comunicación con el servidor
// Todas las funciones son asíncronas y devuelven una promesa con los datos

// Usar la URL de la API desde window.API_URL (inyectada por index.html) o la por defecto
const API_BASE = window.API_URL || 'http://localhost:3000';

// Obtiene el token del sessionStorage
function getToken() {
  const token = sessionStorage.getItem('token');
  if (!token) {
    // Si no hay token en sessionStorage, redirigimos al login y evitamos hacer el fetch
    window.location.href = '/html/index.html';
    throw new Error('Sesión expirada o no iniciada. Redirigiendo al login...');
  }
  return token;
}

// Cabeceras con autorización
function authHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getToken(),
    ...extra
  };
}

function apiResource(resource) {
  const apiResources = {
    voluntarios: 'api/voluntarios',
    turnos: 'api/turnos',
    schedule: 'api/schedule',
    cp: 'cp'
  };

  return apiResources[resource] || resource;
}

// --- FUNCIONES GENÉRICAS (El motor de la API) ---

// Función para peticiones de escritura (POST, PUT, PATCH, DELETE)
async function apiRequest(method, resource, data = null, id = null) {
  const apiPath = apiResource(resource);
  const url = id ? `${API_BASE}/${apiPath}/${id}` : `${API_BASE}/${apiPath}`;

  const options = {
    method: method,
    headers: authHeaders()
  };

  if (data) options.body = JSON.stringify(data);

  const response = await fetch(url, options);

  // DELETE suele devolver 200/204 sin cuerpo
  if (method === 'DELETE' && response.ok) return true;

  const responseData = await response.json();
  const errorMsg = responseData.detail ? `${responseData.message}: ${responseData.detail}` : responseData.message;
  if (!response.ok) throw new Error(errorMsg || `Error en la operación ${method}`);
  return responseData;
}

// --- REUTILIZACIÓN PARA CASOS ESPECÍFICOS ---

// Crear cualquier cosa (Colaborador, Capitán, Tienda...)
const createRecord = (resource, data) => apiRequest('POST', resource, data);

// Actualizar cualquier cosa (Permite al Coordinador solo enviar campos de contacto)
const updateRecord = (resource, id, data) => apiRequest('PUT', resource, data, id);

// Borrar cualquier cosa
const deleteRecord = (resource, id) => apiRequest('DELETE', resource, null, id);


// --- FUNCIONES GENÉRICAS DE LECTURA ---

async function getRecords(resource, queryParams = {}) {
  let url = `${API_BASE}/${apiResource(resource)}`;
  const queryString = Object.entries(queryParams)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  if (queryString) url += `?${queryString}`;

  const response = await fetch(url, {
    headers: authHeaders()
  });

  let data;
  try {
    data = await response.json();
  } catch (e) {
    // Si la respuesta no es JSON, probablemente es un error del servidor (HTML)
    throw new Error(`El servidor devolvió HTML en lugar de JSON. Estado: ${response.status}. Verifica que el servidor esté corriendo y la URL es correcta.`);
  }
  
  if (!response.ok) throw new Error(data.message || `Error al cargar ${resource}`);
  return data;
}

async function getRecord(resource, id) {
  return apiRequest('GET', resource, null, id);
}

// Ahora estas funciones son "alias" de las genéricas
async function getUsuarios(params = {}) { return getRecords('usuarios', params); }
async function getEntidades(params = {}) { return getRecords('api/entidades', params); }
async function getCampanias(params = {}) { return getRecords('campanias', params); }
async function getTiendas(params = {}) { return getRecords('tiendas', params); }
async function getTurnos(params = {}) { return getRecords('api/turnos', params); }
async function getVoluntarios(params = {}) { return getRecords('api/voluntarios', params); }
async function getSchedule(params = {}) { return getRecords('api/schedule', params); }
async function getMe() { return getRecord('me'); }
async function getZones(params = {}) { return getRecords('cp', params); }
async function getZonesByCompany(idCampania) { return getRecords('api/zonas_por_campania', { idCampania }); }
async function getCampaignsByZone(idZona) { return getRecords('api/campanias_por_zona', { idZona }); }

async function postUsuario(datos) { return createRecord('usuarios', datos); }
async function putUsuario(id, datos) { return updateRecord('usuarios', id, datos); }
async function deleteUsuario(id) { return deleteRecord('usuarios', id); }

async function postVoluntario(datos) { return createRecord('api/voluntarios', datos); }
async function putVoluntario(id, datos) { return updateRecord('api/voluntarios', id, datos); }
async function deleteVoluntario(id) { return deleteRecord('api/voluntarios', id); }

async function postEntidad(datos) { return createRecord('entidades', datos); }
async function putEntidad(id, datos) { return updateRecord('entidades', id, datos); }
async function deleteEntidad(id) { return deleteRecord('entidades', id); }

async function postTienda(datos) { return createRecord('tiendas', datos); }
async function putTienda(id, datos) { return updateRecord('tiendas', id, datos); }
async function deleteTienda(id) { return deleteRecord('tiendas', id); }

async function postTurno(datos) { return createRecord('api/turnos', datos); }
async function putTurno(id, datos) { return updateRecord('api/turnos', id, datos); }
async function deleteTurno(id) { return deleteRecord('api/turnos', id); }

async function postCampania(datos) { return createRecord('campanias', datos); }
async function putCampania(id, datos) { return updateRecord('campanias', id, datos); }
async function deleteCampania(id) { return deleteRecord('campanias', id); }

async function postSchedule(datos) { return createRecord('api/schedule', datos); }
async function putSchedule(id, datos) { return updateRecord('api/schedule', id, datos); }
async function deleteSchedule(id) { return deleteRecord('api/schedule', id); }

// POST /auth/login — devuelve { success, token, user }
async function login(email, password) {

  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
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
