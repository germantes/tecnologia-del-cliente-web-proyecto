// api.js — Funciones de comunicación con el servidor (json-server)
// Todas las funciones son asíncronas y devuelven una promesa con los datos

const API_BASE = 'http://localhost:3000';

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

// GET /usuarios — devuelve array de usuarios (solo admin)
async function getUsuarios() {
  const response = await fetch(`${API_BASE}/usuarios`, {
    headers: authHeaders()
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al cargar usuarios');
  return data;
}

// PUT /usuarios/:id — actualiza un usuario
async function putUsuario(id, datosActualizados) {
  const response = await fetch(`${API_BASE}/usuarios/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(datosActualizados)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al actualizar usuario');
  return data;
}

// POST /usuarios — crea un nuevo usuario
async function postUsuario(datos) {
  const response = await fetch(`${API_BASE}/usuarios`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(datos)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al crear usuario');
  return data;
}

// DELETE /usuarios/:id
async function deleteUsuario(id) {
  const response = await fetch(`${API_BASE}/usuarios/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Error al eliminar usuario');
  }
  return true;
}

// GET /campanias — devuelve planificación (admin y manager)
async function getCampanias() {
  const response = await fetch(`${API_BASE}/campanias`, {
    headers: authHeaders()
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al cargar planificación');
  return data;
}

// GET /entidades — devuelve array de entidades
async function getEntidades() {
  const response = await fetch(`${API_BASE}/entidades`, {
    headers: authHeaders()
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al cargar entidades');
  return data;
}

// GET /entidades — devuelve array de tiendas
async function getTiendas() {
  const response = await fetch(`${API_BASE}/tiendas`, {
    headers: authHeaders()
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al cargar entidades');
  return data;
}

// GET /entidades — devuelve array de turnos
async function getTurnos() {
  const response = await fetch(`${API_BASE}/turnos`, {
    headers: authHeaders()
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al cargar entidades');
  return data;
}

// POST /campanias — crea una nueva campania
async function postCampania(datos) {
  const response = await fetch(`${API_BASE}/campanias`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(datos)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al crear la entidad');
  return data;
}

// POST /tiendas — crea una nueva tienda
async function postTienda(datos) {
  const response = await fetch(`${API_BASE}/tiendas`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(datos)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al crear la entidad');
  return data;
}

// POST /turnos — crea un nuevo turno
async function postTurno(datos) {
  const response = await fetch(`${API_BASE}/turnos`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(datos)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al crear la entidad');
  return data;
}

// POST /entidades — crea una nueva entidad
async function postEntidad(datos) {
  const response = await fetch(`${API_BASE}/entidades`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(datos)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al crear la entidad');
  return data;
}

// PUT /entidades/:id — actualiza una entidad
async function putEntidad(id, datosActualizados) {
  const response = await fetch(`${API_BASE}/entidades/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(datosActualizados)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al actualizar la entidad');
  return data;
}

// DELETE /entidades/:id
async function deleteEntidad(id) {
  const response = await fetch(`${API_BASE}/entidades/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Error al eliminar la entidad');
  }
  return true;
}

// POST /schedule — crea una nueva entrada en la planificación (admin y manager)
async function postSchedule(datos) {
  const response = await fetch(`${API_BASE}/schedule`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(datos)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al crear la entrada en la planificación');
  return data;
}

// PUT /schedule/:id — actualiza una entrada de la planificación (admin y manager)
async function putSchedule(id, datosActualizados) {
  const response = await fetch(`${API_BASE}/schedule/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(datosActualizados)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error al actualizar la planificación');
  return data;
}

// DELETE /schedule/:id (admin y manager)
async function deleteSchedule(id) {
  const response = await fetch(`${API_BASE}/schedule/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Error al eliminar de la planificación');
  }
  return true;
}

// GET /me — devuelve datos del usuario autenticado
async function getMe() {
  const response = await fetch(`${API_BASE}/me`, {
    headers: authHeaders()
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Error');
  return data;
}
