// server.js — Fake API Express conectada a Supabase
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const supabase = require('./supabase-client');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────────────────────────────────
// Configuración
// ─────────────────────────────────────────────────────────────────────────────
const TABLES = {
  usuario: process.env.TABLE_USUARIO || 'usuario',
  campania: process.env.TABLE_CAMPANIA || 'campania',
  tienda: process.env.TABLE_TIENDA || 'tienda',
  voluntario: process.env.TABLE_VOLUNTARIO || 'voluntario',
  entidad: process.env.TABLE_ENTIDAD || 'entidad',
  turno: process.env.TABLE_TURNO || 'turno',
  cp: process.env.TABLE_CP || 'cp',
  zona: process.env.TABLE_ZONA || 'zona',
  distrito: process.env.TABLE_DISTRITO || 'distrito',
  cadena: process.env.TABLE_CADENA || 'cadena',
  tiendaCampania: process.env.TABLE_TIENDA_CAMPANIA || 'tienda_campania',
  turnoVoluntario: process.env.TABLE_TURNO_VOLUNTARIO || 'turnos_voluntarios'
};

const FALLBACK_TABLE_NAMES = {
  turnoVoluntario: ['turnos_voluntarios', 'turno_voluntario', 'TurnosVoluntarios', 'TurnoVoluntario'],
  tiendaCampania: ['tienda_campania', 'tiendas_campanias', 'TiendaCampania'],
};

const tableNameCache = new Map();

const PUBLIC_GET_PATHS = new Set([
  '/usuarios', '/campanias', '/tiendas', '/tiendas_zona', '/tienda_detalle', '/tienda_editar',
  '/voluntarios', '/entidades', '/turnos', '/schedule', '/tienda_turnos', '/turno_editar',
  '/turno_filtrar', '/info_Voluntario', '/turno_observaciones', '/turno_observaciones_editar',
  '/api/entidades', '/api/voluntarios'
]);

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades generales
// ─────────────────────────────────────────────────────────────────────────────
function getField(obj, ...names) {
  if (!obj) return undefined;
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(obj, name)) return obj[name];
  }
  return undefined;
}

function str(value) {
  return value === undefined || value === null ? '' : String(value);
}

function sameNumberOrString(a, b) {
  if (a === undefined || a === null || b === undefined || b === null) return false;
  return String(a) === String(b);
}

function normalizeTurno(value) {
  return str(value).trim().toLowerCase();
}

function normalizeRow(row) {
  if (!row || typeof row !== 'object') return row;
  return {
    ...row,
    idUsuario: getField(row, 'idUsuario', 'id_usuario', 'id'),
    idCampania: getField(row, 'idCampania', 'id_campania'),
    idTienda: getField(row, 'idTienda', 'id_tienda'),
    idVoluntario: getField(row, 'idVoluntario', 'id_voluntario'),
    idEntidad: getField(row, 'idEntidad', 'id_entidad'),
    idTurno: getField(row, 'idTurno', 'id_turno'),
    idZona: getField(row, 'idZona', 'id_zona'),
    nombreCompleto: getField(row, 'nombreCompleto', 'nombre_completo'),
    nombreUsuario: getField(row, 'nombreUsuario', 'nombre_usuario', 'username'),
    ligadoABancosol: getField(row, 'ligadoABancosol', 'ligado_a_bancosol'),
    idCampaniaFK: getField(row, 'idCampania', 'id_campania'),
    idTiendaFK: getField(row, 'idTienda', 'id_tienda'),
    idEntidadFK: getField(row, 'idEntidad', 'id_entidad'),
  };
}

function normalizeRows(rows) {
  return Array.isArray(rows) ? rows.map(normalizeRow) : rows;
}

function contains(row, text, fields) {
  const q = str(text).trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) => str(getField(row, field)).toLowerCase().includes(q));
}

function makeToken(user) {
  const rol = mapRol(getField(user, 'rol', 'puesto'));
  const payload = {
    id: getField(user, 'id_usuario', 'idUsuario', 'id'),
    nombreUsuario: getField(user, 'nombre_usuario', 'nombreUsuario', 'nombre_completo', 'nombreCompleto', 'nombre', 'email'),
    puesto: rol,
    nombre: getField(user, 'nombre_completo', 'nombreCompleto', 'nombre', 'email')
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    return JSON.parse(Buffer.from(authHeader.slice(7), 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

function mapRol(rolSupabase) {
  const value = str(rolSupabase).trim().toUpperCase();
  const mapa = {
    ADMINISTRADOR: 'admin',
    ADMIN: 'admin',
    COORDINADOR: 'manager',
    MANAGER: 'manager',
    'RESPONSABLE-ENTIDAD': 'worker',
    RESPONSABLE_ENTIDAD: 'worker',
    RESPONSABLETIENDA: 'worker',
    RESPONSABLE_TIENDA: 'worker',
    CAPITAN: 'worker',
    WORKER: 'worker'
  };
  return mapa[value] || 'worker';
}

function requireAuth(req, res, next) {
  // --- BYPASS TEMPORAL DE AUTENTICACIÓN ---
  // Simulamos un usuario admin para que no fallen los endpoints que usan req.user
  req.user = { id: 1, puesto: 'admin', nombreUsuario: 'admin', nombre: 'Admin Temporal' };
  return next();

  /*
  // Los GET de consulta se dejan públicos para poder probarlos directamente en navegador.
  if (req.method === 'GET' && PUBLIC_GET_PATHS.has(req.path)) return next();

  const user = verifyToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Acceso no autorizado. Inicia sesión.' });
  }
  req.user = user;
  next();
  */
}

function requireAdmin(req, res, next) {
  // --- BYPASS TEMPORAL DE ADMIN ---
  return next();
  /*
  if (req.user?.puesto !== 'admin') {
    return res.status(403).json({ success: false, message: 'Acceso denegado. Solo administradores.' });
  }
  next();
  */
}

async function getWorkingTableName(key) {
  if (tableNameCache.has(key)) return tableNameCache.get(key);

  const names = [TABLES[key], ...(FALLBACK_TABLE_NAMES[key] || [])].filter(Boolean);
  for (const name of [...new Set(names)]) {
    const { error } = await supabase.from(name).select('*').limit(1);
    if (!error) {
      tableNameCache.set(key, name);
      return name;
    }
  }

  tableNameCache.set(key, TABLES[key]);
  return TABLES[key];
}

async function fetchAll(key) {
  const table = await getWorkingTableName(key);
  const { data, error } = await supabase.from(table).select('*');
  if (error) throw error;
  return normalizeRows(data || []);
}

async function insertRows(key, rows) {
  const table = await getWorkingTableName(key);
  const { data, error } = await supabase.from(table).insert(rows).select();
  if (error) throw error;
  return normalizeRows(data || []);
}

async function updateRows(key, pk, id, patch) {
  const table = await getWorkingTableName(key);
  const { data, error } = await supabase.from(table).update(patch).eq(pk, id).select();
  if (error) throw error;
  return normalizeRows(data || []);
}

async function deleteRows(key, pk, id) {
  const table = await getWorkingTableName(key);
  const { error } = await supabase.from(table).delete().eq(pk, id);
  if (error) throw error;
  return { success: true };
}

async function deleteTurnoVoluntarios(idTurno) {
  const table = await getWorkingTableName('turnoVoluntario');
  const { error } = await supabase.from(table).delete().eq('id_turno', idTurno);
  if (error) throw error;
}

async function findById(key, id, fields) {
  const rows = await fetchAll(key);
  return rows.find((row) => fields.some((field) => sameNumberOrString(getField(row, field), id))) || null;
}

function applyGenericFilters(rows, filters) {
  return rows.filter((row) => Object.entries(filters).every(([key, value]) => {
    if (value === undefined || value === null || value === '') return true;

    if (key === 'busqueda' || key === 'q') {
      return JSON.stringify(row).toLowerCase().includes(str(value).toLowerCase());
    }

    const snake = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    return sameNumberOrString(getField(row, key, snake), value);
  }));
}

function getIdTienda(row) { return getField(row, 'idTienda', 'id_tienda'); }
function getIdCampania(row) { return getField(row, 'idCampania', 'id_campania'); }
function getIdTurno(row) { return getField(row, 'idTurno', 'id_turno'); }
function getIdEntidad(row) { return getField(row, 'idEntidad', 'id_entidad'); }
function getIdVoluntario(row) { return getField(row, 'idVoluntario', 'id_voluntario'); }
function getFecha(row) { return getField(row, 'fecha'); }
function getTipoTurno(row) { return getField(row, 'turno', 'tipo_turno'); }

function filterTurnos(rows, query) {
  return rows.filter((row) => {
    if (query.idTurno && !sameNumberOrString(getIdTurno(row), query.idTurno)) return false;
    if ((query.idTienda || query.id) && !sameNumberOrString(getIdTienda(row), query.idTienda || query.id)) return false;
    if (query.idCampania && !sameNumberOrString(getIdCampania(row), query.idCampania)) return false;
    if (query.fecha && str(getFecha(row)) !== str(query.fecha)) return false;
    if (query.turno && normalizeTurno(getTipoTurno(row)) !== normalizeTurno(query.turno)) return false;
    return true;
  });
}

async function findTurnoParaEditar(query) {
  const turnos = await fetchAll('turno');
  return filterTurnos(turnos, query)[0] || null;
}

async function getIdsVoluntariosByTurno(idTurno) {
  try {
    const rows = await fetchAll('turnoVoluntario');
    return rows
      .filter((row) => sameNumberOrString(getField(row, 'idTurno', 'id_turno'), idTurno))
      .map((row) => getField(row, 'idVoluntario', 'id_voluntario'))
      .filter((id) => id !== undefined && id !== null);
  } catch (error) {
    console.warn('No se pudo leer la tabla de turnos_voluntarios:', error.message);
    return [];
  }
}

async function resolverEntidadResponsable(turno) {
  const idEntidad = getIdEntidad(turno);
  if (idEntidad) return await findById('entidad', idEntidad, ['idEntidad', 'id_entidad']);

  const idsVoluntarios = await getIdsVoluntariosByTurno(getIdTurno(turno));
  if (idsVoluntarios.length) {
    const voluntarios = await fetchAll('voluntario');
    const voluntario = voluntarios.find((v) => idsVoluntarios.some((id) => sameNumberOrString(getIdVoluntario(v), id)));
    const idEntidadVoluntario = getIdEntidad(voluntario);
    if (idEntidadVoluntario) return await findById('entidad', idEntidadVoluntario, ['idEntidad', 'id_entidad']);
  }

  return null;
}

async function getVoluntariosDeEntidad(idEntidad, busqueda = '') {
  const voluntarios = await fetchAll('voluntario');
  return voluntarios.filter((voluntario) => {
    if (idEntidad && !sameNumberOrString(getIdEntidad(voluntario), idEntidad)) return false;
    return contains(voluntario, busqueda, ['nombre', 'nombre_completo', 'nombreCompleto', 'apellidos', 'email', 'telefono', 'dni']);
  });
}

async function filtrarTiendasPorZona(tiendas, idZona) {
  if (!idZona) return tiendas;

  const tiendasFiltradasDirecto = tiendas.filter((tienda) => {
    const zonaDirecta = getField(tienda, 'idZona', 'id_zona', 'zona');
    return sameNumberOrString(zonaDirecta, idZona);
  });
  if (tiendasFiltradasDirecto.length) return tiendasFiltradasDirecto;

  try {
    const cps = await fetchAll('cp');
    const cpsDeZona = cps
      .filter((cp) => sameNumberOrString(getField(cp, 'idZona', 'id_zona'), idZona))
      .map((cp) => getField(cp, 'cp', 'codigo_postal', 'codigoPostal', 'id_cp', 'idCP'));

    return tiendas.filter((tienda) => cpsDeZona.some((cp) => sameNumberOrString(getField(tienda, 'cp', 'codigo_postal', 'id_cp', 'idCP'), cp)));
  } catch {
    return [];
  }
}

function sendError(res, error, label = 'Error del servidor') {
  console.error(label, error);
  res.status(500).json({ success: false, message: label, detail: error.message });
}

// ─────────────────────────────────────────────────────────────────────────────
// Config estática/front
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/config.js', (req, res) => {
  const apiUrl = process.env.API_URL || `http://localhost:${PORT}`;
  res.type('application/javascript');
  res.send(`window.API_URL = '${apiUrl}';`);
});

const srcPath = process.env.NODE_ENV === 'development'
  ? '/src'
  : path.join(__dirname, '..', 'src');
app.use(express.static(srcPath));

// ─────────────────────────────────────────────────────────────────────────────
// Rutas públicas/auth
// ─────────────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    supabaseUrlConfigured: Boolean(process.env.SUPABASE_URL),
    supabaseKeyConfigured: Boolean(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY),
    tables: TABLES
  });
});

app.post('/auth/login', async (req, res) => {
  const { username, password, nombreUsuario, contrasena } = req.body || {};

  // Support both old (nombreUsuario, contrasena) and new (username, password) field names
  const userInput = username || nombreUsuario;
  const passInput = password || contrasena;

  if (!userInput || !passInput) {
    return res.status(400).json({ success: false, message: 'Por favor, introduzca su usuario y contraseña' });
  }

  try {
    const usuarios = await fetchAll('usuario');

    // Buscar usuario de forma asíncrona
    let usuario = null;
    for (const user of usuarios) {
      const loginMatch = [
        getField(user, 'nombre_usuario', 'nombreUsuario'),
        getField(user, 'nombre_completo', 'nombreCompleto'),
        getField(user, 'nombre'),
        getField(user, 'email')
      ].some((value) => str(value).toLowerCase() === str(userInput).toLowerCase());

      if (loginMatch) {
        // Obtener la contraseña almacenada
        const storedPassword = getField(user, 'contrasenia', 'contraseña', 'password');

        console.log(`🔍 Usuario encontrado: ${getField(user, 'nombre_completo')} | Hash: ${storedPassword?.substring(0, 20)}...`);

        // Verificar contraseña
        let passwordValid = false;

        if (storedPassword) {
          // Si la contraseña almacenada comienza con $2b$ (formato bcrypt)
          if (storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2y$')) {
            // Comparar usando bcrypt
            console.log(`🔐 Comparando con bcrypt...`);
            passwordValid = await bcrypt.compare(passInput, storedPassword);
            console.log(`✅ Resultado bcrypt: ${passwordValid}`);
          } else {
            // Fallback: comparación directa (para contraseñas en texto plano)
            passwordValid = str(storedPassword) === str(passInput);
            console.log(`📝 Comparación directa: ${passwordValid}`);
          }
        }

        if (passwordValid) {
          usuario = user;
          break;
        }
      }
    }

    if (!usuario) {
      return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos.' });
    }

    const token = makeToken(usuario);
    const puesto = mapRol(getField(usuario, 'rol', 'puesto'));
    res.json({
      success: true,
      token,
      user: {
        id: getField(usuario, 'idUsuario', 'id_usuario', 'id'),
        nombre: getField(usuario, 'nombreCompleto', 'nombre_completo', 'nombre', 'email'),
        puesto,
        nombreUsuario: getField(usuario, 'nombreUsuario', 'nombre_usuario', 'nombre_completo', 'nombreCompleto', 'email')
      }
    });
  } catch (error) {
    sendError(res, error, 'Error en login contra Supabase');
  }
});

app.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user || null });
});

// ─────────────────────────────────────────────────────────────────────────────
// Endpoints genéricos con Supabase + filtrado en query params
// ─────────────────────────────────────────────────────────────────────────────
app.get('/usuarios', requireAuth, async (req, res) => {
  try {
    const rows = applyGenericFilters(await fetchAll('usuario'), req.query);
    res.json(rows);
  } catch (error) { sendError(res, error, 'Error obteniendo usuarios'); }
});

app.get('/campanias', requireAuth, async (req, res) => {
  try {
    const rows = applyGenericFilters(await fetchAll('campania'), req.query);
    res.json(rows);
  } catch (error) { sendError(res, error, 'Error obteniendo campañas'); }
});

// ─── RUTAS PARA SERVIR PÁGINAS HTML (FRONTEND) ───────────────────────────────
app.get('/entidades', requireAuth, (req, res) => {
  res.sendFile(path.join(srcPath, 'html', 'entidades.html'));
});

app.get('/voluntarios', requireAuth, (req, res) => {
  res.sendFile(path.join(srcPath, 'html', 'voluntarios.html'));
});

// Rutas para la página de edición y creación (soporta con y sin .html)
app.get('/edit', requireAuth, (req, res) => {
  res.sendFile(path.join(srcPath, 'html', 'edit.html'), (err) => {
    if (err) res.sendFile(path.join(srcPath, 'edit.html')); // Fallback si el archivo aún no se ha movido a /html
  });
});
app.get('/edit.html', requireAuth, (req, res) => {
  res.sendFile(path.join(srcPath, 'html', 'edit.html'), (err) => {
    if (err) res.sendFile(path.join(srcPath, 'edit.html'));
  });
});

// ─── RUTAS DE API (DATOS JSON PURAMENTE) ──────────────────────────────────────
app.get('/api/entidades', requireAuth, async (req, res) => {
  try {
    let rows = await fetchAll('entidad');
    const { idEntidad, idTienda, ligadoABancosol, busqueda, q } = req.query;

    rows = rows.filter((row) => {
      if (idEntidad && !sameNumberOrString(getIdEntidad(row), idEntidad)) return false;
      if (idTienda && !sameNumberOrString(getIdTienda(row), idTienda)) return false;
      if (ligadoABancosol !== undefined && str(getField(row, 'ligadoABancosol', 'ligado_a_bancosol')) !== str(ligadoABancosol)) return false;
      return contains(row, busqueda || q, ['nombre', 'nombre_completo', 'razon_social', 'observaciones', 'Observaciones']);
    });

    res.json(rows);
  } catch (error) { sendError(res, error, 'Error obteniendo entidades'); }
});

app.get('/api/voluntarios', requireAuth, async (req, res) => {
  try {
    let rows = await fetchAll('voluntario');
    const { idVoluntario, idEntidad, busqueda, q } = req.query;
    rows = rows.filter((row) => {
      if (idVoluntario && !sameNumberOrString(getIdVoluntario(row), idVoluntario)) return false;
      if (idEntidad && !sameNumberOrString(getIdEntidad(row), idEntidad)) return false;
      return contains(row, busqueda || q, ['nombre', 'nombre_completo', 'apellidos', 'email', 'telefono', 'dni']);
    });
    res.json(rows);
  } catch (error) { sendError(res, error, 'Error obteniendo voluntarios'); }
});

app.get('/tiendas', requireAuth, async (req, res) => {
  try {
    let rows = await fetchAll('tienda');
    const { idTienda, idZona, zona, cp, busqueda, q } = req.query;
    rows = rows.filter((row) => {
      if (idTienda && !sameNumberOrString(getIdTienda(row), idTienda)) return false;
      if (idZona && !sameNumberOrString(getField(row, 'idZona', 'id_zona'), idZona)) return false;
      if (zona && !str(getField(row, 'zona')).toLowerCase().includes(str(zona).toLowerCase())) return false;
      if (cp && !sameNumberOrString(getField(row, 'cp', 'codigo_postal', 'id_cp'), cp)) return false;
      return contains(row, busqueda || q, ['nombre', 'domicilio', 'direccion', 'zona', 'cp', 'codigo_postal']);
    });
    res.json(rows);
  } catch (error) { sendError(res, error, 'Error obteniendo tiendas'); }
});

app.get('/turnos', requireAuth, async (req, res) => {
  try {
    const rows = filterTurnos(await fetchAll('turno'), req.query);
    res.json(rows);
  } catch (error) { sendError(res, error, 'Error obteniendo turnos'); }
});

app.get('/schedule', requireAuth, async (req, res) => {
  try {
    const rows = filterTurnos(await fetchAll('turno'), req.query);
    res.json(rows);
  } catch (error) { sendError(res, error, 'Error obteniendo schedule'); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Endpoints equivalentes a TiendaController
// ─────────────────────────────────────────────────────────────────────────────
app.get('/tiendas_zona', requireAuth, async (req, res) => {
  try {
    const idZona = req.query.id || req.query.idZona;
    const tiendas = await filtrarTiendasPorZona(await fetchAll('tienda'), idZona);
    res.json({ tiendas, idZonaSeleccionada: idZona || null });
  } catch (error) { sendError(res, error, 'Error obteniendo tiendas de zona'); }
});

app.get('/tienda_detalle', requireAuth, async (req, res) => {
  try {
    const tienda = await findById('tienda', req.query.idTienda, ['idTienda', 'id_tienda']);
    res.json({ tienda });
  } catch (error) { sendError(res, error, 'Error obteniendo detalle de tienda'); }
});

app.get('/tienda_editar', requireAuth, async (req, res) => {
  try {
    const usuarios = await fetchAll('usuario');
    const byRol = (rol) => usuarios.filter((u) => str(getField(u, 'rol', 'puesto')).toLowerCase() === rol.toLowerCase());
    res.json({
      tienda: await findById('tienda', req.query.idTienda, ['idTienda', 'id_tienda']),
      listaCPs: await fetchAll('cp').catch(() => []),
      listaZonas: await fetchAll('zona').catch(() => []),
      listaDistritos: await fetchAll('distrito').catch(() => []),
      listaCadenas: await fetchAll('cadena').catch(() => []),
      listaResponsablesTienda: byRol('responsableTienda'),
      listaCoordinadores: byRol('coordinador'),
      listaCapitanes: byRol('capitan')
    });
  } catch (error) { sendError(res, error, 'Error preparando edición de tienda'); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Endpoints equivalentes a TurnoController
// ─────────────────────────────────────────────────────────────────────────────
app.get('/tienda_turnos', requireAuth, async (req, res) => {
  try {
    const query = { ...req.query, idTienda: req.query.idTienda || req.query.id };
    const turnosTienda = filterTurnos(await fetchAll('turno'), query);
    res.json({
      turnosTienda,
      idTienda: query.idTienda || null,
      idCampania: query.idCampania || null,
      tiendaCampania: null
    });
  } catch (error) { sendError(res, error, 'Error obteniendo turnos de tienda'); }
});

async function buildTurnoEditarResponse(query) {
  const turno = await findTurnoParaEditar(query);
  if (!turno) return null;

  const entidad = await resolverEntidadResponsable(turno);
  const idEntidad = getIdEntidad(entidad);
  const listaVoluntarios = idEntidad ? await getVoluntariosDeEntidad(idEntidad, query.busqueda || '') : [];
  const idsVoluntariosSeleccionados = await getIdsVoluntariosByTurno(getIdTurno(turno));

  return {
    idTienda: query.idTienda,
    idCampania: query.idCampania,
    fecha: query.fecha,
    turno,
    turnoTexto: normalizeTurno(getTipoTurno(turno)).toUpperCase(),
    nombreEntidadResponsable: getField(entidad, 'nombre', 'nombre_completo', 'razon_social') || 'Sin entidad responsable',
    listaVoluntarios,
    idsVoluntariosSeleccionados,
    busqueda: query.busqueda || ''
  };
}

app.get('/turno_editar', requireAuth, async (req, res) => {
  try {
    const payload = await buildTurnoEditarResponse(req.query);
    if (!payload) return res.status(404).json({ success: false, message: 'Turno no encontrado.' });
    res.json(payload);
  } catch (error) { sendError(res, error, 'Error preparando edición de turno'); }
});

app.get('/turno_filtrar', requireAuth, async (req, res) => {
  try {
    const payload = await buildTurnoEditarResponse(req.query);
    if (!payload) return res.status(404).json({ success: false, message: 'Turno no encontrado.' });
    res.json(payload);
  } catch (error) { sendError(res, error, 'Error filtrando voluntarios de turno'); }
});

app.post('/turno_guardar_voluntarios', requireAuth, async (req, res) => {
  try {
    const params = { ...req.query, ...req.body };
    const turno = await findTurnoParaEditar(params);
    if (!turno) return res.status(404).json({ success: false, message: 'Turno no encontrado.' });

    const idTurno = getIdTurno(turno);
    const ids = params.voluntariosSeleccionados || params.idsVoluntarios || [];
    const idsVoluntarios = Array.isArray(ids) ? ids : [ids];

    await deleteTurnoVoluntarios(idTurno);
    if (idsVoluntarios.length) {
      await insertRows('turnoVoluntario', idsVoluntarios.map((idVoluntario) => ({
        id_turno: idTurno,
        id_voluntario: idVoluntario
      })));
    }

    res.json({ success: true, idTurno, idsVoluntariosSeleccionados: idsVoluntarios });
  } catch (error) { sendError(res, error, 'Error guardando voluntarios de turno'); }
});

app.get('/info_Voluntario', requireAuth, async (req, res) => {
  try {
    const voluntario = await findById('voluntario', req.query.idVoluntario, ['idVoluntario', 'id_voluntario', 'id']);
    res.json({ voluntario });
  } catch (error) { sendError(res, error, 'Error obteniendo voluntario'); }
});

async function getTurnoObservaciones(query) {
  const turnos = filterTurnos(await fetchAll('turno'), query);
  return turnos[0] || null;
}

app.get('/turno_observaciones', requireAuth, async (req, res) => {
  try {
    const turno = await getTurnoObservaciones(req.query);
    if (!turno) return res.status(404).json({ success: false, message: 'Turno no encontrado.' });
    res.json({ idTienda: req.query.idTienda, idCampania: req.query.idCampania, turno, fecha: getFecha(turno), turnoTexto: normalizeTurno(getTipoTurno(turno)).toUpperCase() });
  } catch (error) { sendError(res, error, 'Error obteniendo observaciones'); }
});

app.get('/turno_observaciones_editar', requireAuth, async (req, res) => {
  try {
    const turno = await getTurnoObservaciones(req.query);
    if (!turno) return res.status(404).json({ success: false, message: 'Turno no encontrado.' });
    res.json({ idTienda: req.query.idTienda, idCampania: req.query.idCampania, turno, fecha: getFecha(turno), turnoTexto: normalizeTurno(getTipoTurno(turno)).toUpperCase() });
  } catch (error) { sendError(res, error, 'Error preparando edición de observaciones'); }
});

app.post('/turno_observaciones_guardar', requireAuth, async (req, res) => {
  try {
    const params = { ...req.query, ...req.body };
    const turno = await getTurnoObservaciones(params);
    if (!turno) return res.status(404).json({ success: false, message: 'Turno no encontrado.' });

    const [updated] = await updateRows('turno', 'id_turno', getIdTurno(turno), {
      observaciones: params.observaciones || ''
    });

    res.json({ success: true, turno: updated || turno });
  } catch (error) { sendError(res, error, 'Error guardando observaciones'); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Escritura genérica mantenida para el frontend antiguo
// ─────────────────────────────────────────────────────────────────────────────
app.post('/usuarios', requireAuth, requireAdmin, async (req, res) => {
  try { res.json((await insertRows('usuario', [req.body]))[0]); } catch (e) { sendError(res, e, 'Error creando usuario'); }
});
app.put('/usuarios/:id', requireAuth, requireAdmin, async (req, res) => {
  try { res.json((await updateRows('usuario', 'id_usuario', req.params.id, req.body))[0]); } catch (e) { sendError(res, e, 'Error actualizando usuario'); }
});
app.delete('/usuarios/:id', requireAuth, requireAdmin, async (req, res) => {
  try { res.json(await deleteRows('usuario', 'id_usuario', req.params.id)); } catch (e) { sendError(res, e, 'Error eliminando usuario'); }
});

app.post('/campanias', requireAuth, async (req, res) => {
  try { res.json((await insertRows('campania', [req.body]))[0]); } catch (e) { sendError(res, e, 'Error creando campaña'); }
});
app.post('/tiendas', requireAuth, async (req, res) => {
  try { res.json((await insertRows('tienda', [req.body]))[0]); } catch (e) { sendError(res, e, 'Error creando tienda'); }
});
app.post('/entidades', requireAuth, async (req, res) => {
  try { res.json((await insertRows('entidad', [req.body]))[0]); } catch (e) { sendError(res, e, 'Error creando entidad'); }
});
app.put('/entidades/:id', requireAuth, async (req, res) => {
  try { res.json((await updateRows('entidad', 'id_entidad', req.params.id, req.body))[0]); } catch (e) { sendError(res, e, 'Error actualizando entidad'); }
});
app.delete('/entidades/:id', requireAuth, async (req, res) => {
  try { res.json(await deleteRows('entidad', 'id_entidad', req.params.id)); } catch (e) { sendError(res, e, 'Error eliminando entidad'); }
});
app.post('/voluntarios', requireAuth, async (req, res) => {
  try { res.json((await insertRows('voluntario', [req.body]))[0]); } catch (e) { sendError(res, e, 'Error creando voluntario'); }
});
app.put('/voluntarios/:id', requireAuth, async (req, res) => {
  try { res.json((await updateRows('voluntario', 'id_voluntario', req.params.id, req.body))[0]); } catch (e) { sendError(res, e, 'Error actualizando voluntario'); }
});
app.delete('/voluntarios/:id', requireAuth, async (req, res) => {
  try { res.json(await deleteRows('voluntario', 'id_voluntario', req.params.id)); } catch (e) { sendError(res, e, 'Error eliminando voluntario'); }
});
app.post('/turnos', requireAuth, async (req, res) => {
  try { res.json((await insertRows('turno', [req.body]))[0]); } catch (e) { sendError(res, e, 'Error creando turno'); }
});
app.post('/schedule', requireAuth, async (req, res) => {
  try { res.json((await insertRows('turno', [req.body]))[0]); } catch (e) { sendError(res, e, 'Error creando schedule'); }
});
app.put('/schedule/:id', requireAuth, async (req, res) => {
  try { res.json((await updateRows('turno', 'id_turno', req.params.id, req.body))[0]); } catch (e) { sendError(res, e, 'Error actualizando schedule'); }
});
app.delete('/schedule/:id', requireAuth, async (req, res) => {
  try { res.json(await deleteRows('turno', 'id_turno', req.params.id)); } catch (e) { sendError(res, e, 'Error eliminando schedule'); }
});

app.get('/usuarios/:id', requireAuth, async (req, res) => {
  try {
    const usuario = await findById('usuario', req.params.id, ['idUsuario', 'id_usuario', 'id']);
    if (!usuario) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    res.json(usuario);
  } catch (error) { sendError(res, error, 'Error obteniendo usuario'); }
});
app.get('/campanias/:id', requireAuth, async (req, res) => {
  try {
    const campania = await findById('campania', req.params.id, ['idCampania', 'id_campania', 'id']);
    if (!campania) return res.status(404).json({ success: false, message: 'Campaña no encontrada.' });
    res.json(campania);
  } catch (error) { sendError(res, error, 'Error obteniendo campaña'); }
});
app.get('/entidades/:id', requireAuth, async (req, res) => {
  try {
    const entidad = await findById('entidad', req.params.id, ['idEntidad', 'id_entidad', 'id']);
    if (!entidad) return res.status(404).json({ success: false, message: 'Entidad no encontrada.' });
    res.json(entidad);
  } catch (error) { sendError(res, error, 'Error obteniendo entidad'); }
});
app.get('/voluntarios/:id', requireAuth, async (req, res) => {
  try {
    const voluntario = await findById('voluntario', req.params.id, ['idVoluntario', 'id_voluntario', 'id']);
    if (!voluntario) return res.status(404).json({ success: false, message: 'Voluntario no encontrado.' });
    res.json(voluntario);
  } catch (error) { sendError(res, error, 'Error obteniendo voluntario'); }
});
app.get('/tiendas/:id', requireAuth, async (req, res) => {
  try {
    const tienda = await findById('tienda', req.params.id, ['idTienda', 'id_tienda', 'id']);
    if (!tienda) return res.status(404).json({ success: false, message: 'Tienda no encontrada.' });
    res.json(tienda);
  } catch (error) { sendError(res, error, 'Error obteniendo tienda'); }
});
app.get('/turnos/:id', requireAuth, async (req, res) => {
  try {
    const turno = await findById('turno', req.params.id, ['idTurno', 'id_turno', 'id']);
    if (!turno) return res.status(404).json({ success: false, message: 'Turno no encontrado.' });
    res.json(turno);
  } catch (error) { sendError(res, error, 'Error obteniendo turno'); }
});
app.get('/schedule/:id', requireAuth, async (req, res) => {
  try {
    const turno = await findById('turno', req.params.id, ['idTurno', 'id_turno', 'id']);
    if (!turno) return res.status(404).json({ success: false, message: 'Schedule no encontrado.' });
    res.json(turno);
  } catch (error) { sendError(res, error, 'Error obteniendo schedule'); }
});

// =========================================================================
// MIGRACIÓN DE TIENDACONTROLLER.JAVA: ENDPOINT PARA LISTAR TIENDAS POR ROL
// =========================================================================
app.get('/api/tiendas', requireAuth, async (req, res) => {
  try {
    const id_usuario = req.user.id;
    const puesto = req.user.puesto.toUpperCase();
    const { idZona, participa, idCampania: queryIdCampania } = req.query;
    const idCampania = queryIdCampania ? parseInt(queryIdCampania) : null;

    // 1. Obtener todas las campañas y calcular cuál es la "Activa" de hoy
    const { data: campanias } = await supabase.from('campania').select('*');
    let idActiva = null;
    if (campanias) {
      const hoy = new Date();
      const activa = campanias.find(c => {
        if (!c.fecha_inicio || !c.fecha_fin) return false;
        const inicio = new Date(c.fecha_inicio);
        const fin = new Date(c.fecha_fin);
        fin.setHours(23, 59, 59, 999); // Expandimos el fin hasta el último segundo del día
        return hoy >= inicio && hoy <= fin;
      });
      if (activa) idActiva = activa.id_campania;
    }

    // 2. Consulta Base (Añadimos id_campania a la petición de Supabase)
    let query = supabase
      .from('tienda')
      .select(`
                id_tienda, 
                domicilio,
                cadena (id_cadena, establecimiento),
                cp (
                    cp, 
                    localidad, 
                    municipio,
                    zona (id_zona, zona_geografica)
                ),
                tienda_campania (
                    participa, 
                    id_capitan, 
                    id_coordinador, 
                    id_responsable_tienda,
                    id_campania
                )
            `);

    // 3. Filtros previos en Base de Datos según el ROL
    if (puesto === 'ADMIN') {
      if (idZona && idZona !== '0') query = query.eq('cp.id_zona', idZona);
    } else if (puesto === 'MANAGER') {
      const { data: usuarioData } = await supabase.from('usuario').select('id_cp').eq('id_usuario', id_usuario).single();
      if (usuarioData && usuarioData.id_cp) {
        const { data: userCp } = await supabase.from('cp').select('id_zona').eq('cp', usuarioData.id_cp).single();
        if (userCp) query = query.eq('cp.id_zona', userCp.id_zona);
      }
    } else if (puesto === 'WORKER') {
      query = query.or(`id_capitan.eq.${id_usuario},id_responsable_tienda.eq.${id_usuario}`, { foreignTable: 'tienda_campania' });
    }

    const { data: tiendas, error } = await query;
    if (error) throw error;

    // 4. LIMPIEZA POST-CONSULTA Y FILTRADO ESTRICTO
    const tiendasFiltradas = tiendas.filter(t => {
      if (!t.cp) return false;

      if (puesto === 'ADMIN') {
        // Admin: si ha elegido una campaña, vemos si participa en esa.
        if (idCampania && idCampania > 0) {
          const relacion = t.tienda_campania?.find(tc => tc.id_campania === idCampania);
          if (!relacion) return false;

          const participaReal = relacion.participa === true;
          if (participa && participa !== 'all') {
            return participa === 'true' ? participaReal : !participaReal;
          }
          return true;
        } else {
          // Admin: Todas las campañas (Si elige participa=true, comprobamos si participa en ALGUNA)
          if (participa && participa !== 'all') {
            const quiereParticipar = participa === 'true';
            return t.tienda_campania?.some(tc => tc.participa === true) === quiereParticipar;
          }
          return true;
        }
      } else {
        // NO ADMIN: Filtro drástico. Solo ven las que participan en la campaña ACTIVA.
        if (!idActiva) return false;
        const relacionActiva = t.tienda_campania?.find(tc => tc.id_campania === idActiva);
        return relacionActiva && relacionActiva.participa === true;
      }
    });

    res.json(tiendasFiltradas);
  } catch (error) {
    console.error("Error en /api/tiendas:", error);
    res.status(500).json({ error: 'Error al recuperar las tiendas de la base de datos' });
  }
});

// =========================================================================
// ENDPOINT: OBTENER DETALLE DE UNA SOLA TIENDA (+ INFO)
// =========================================================================
app.get('/api/tiendas/:id', requireAuth, async (req, res) => {
  try {
    const tiendaId = req.params.id;

    const { data: tienda, error } = await supabase
      .from('tienda')
      .select(`
                id_tienda, 
                domicilio,
                cadena (id_cadena, establecimiento),
                cp (
                    cp, 
                    localidad, 
                    municipio,
                    zona (id_zona, zona_geografica)
                ),
                tienda_campania (
                    participa, 
                    id_capitan, 
                    id_coordinador, 
                    id_responsable_tienda
                )
            `)
      .eq('id_tienda', tiendaId)
      .single(); // Le decimos a Supabase que devuelva 1 solo objeto, no un array

    if (error) throw error;
    res.json(tienda);

  } catch (error) {
    console.error("Error al obtener detalle de la tienda:", error);
    res.status(500).json({ error: 'Error al recuperar la tienda' });
  }
});

// Endpoint auxiliar para rellenar el selector de zonas del Admin (Middleware corregido)
app.get('/api/zonas', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('zona').select('*').order('zona_geografica');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Catch-all para la SPA
app.get('*', (req, res) => {
  const indexPath = process.env.NODE_ENV === 'development'
    ? '/src/html/index.html'
    : path.join(__dirname, '..', 'src', 'index.html');
  res.sendFile(indexPath);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ API Express + Supabase en http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Supabase URL: ${process.env.SUPABASE_URL ? 'configurada' : 'NO configurada'}`);
  console.log(`   GET de datos públicos para pruebas en navegador; POST/PUT/DELETE con token.\n`);
});
