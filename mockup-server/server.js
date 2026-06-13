// server.js — Fake API Express conectada a Supabase
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const supabase = require('./supabase-client');
const bcrypt = require('bcryptjs');

// Importamos la librería jsonwebtoken para firmar y verificar tokens JWT.
const jwt = require('jsonwebtoken');

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
  turnoVoluntario: process.env.TABLE_TURNO_VOLUNTARIO || 'turnos_voluntarios',
  contactoAdicional: process.env.TABLE_CONTACTO_ADICIONAL || 'contacto_adicional',
  sugerenciaCambio: process.env.TABLE_SUGERENCIA_CAMBIO || 'sugerencia_cambio'
};

const FALLBACK_TABLE_NAMES = {
  turnoVoluntario: ['turnos_voluntarios', 'turno_voluntario', 'TurnosVoluntarios', 'TurnoVoluntario'],
  tiendaCampania: ['tienda_campania', 'tiendas_campanias', 'TiendaCampania'],
};

// Mapa de tipo de entidad a su clave primaria
const PK_MAP = {
  usuario: 'id_usuario',
  campania: 'id_campania',
  tienda: 'id_tienda',
  voluntario: 'id_voluntario',
  entidad: 'id_entidad',
  turno: 'id_turno',
};

const tableNameCache = new Map();
const SUPABASE_PAGE_SIZE = 1000;

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

async function getIdCampaniaActiva() {
  const campanias = await fetchAll('campania');
  const hoy = new Date();
  const activa = campanias.find(c => {
    if (!c.fecha_inicio || !c.fecha_fin) return false;
    const inicio = new Date(c.fecha_inicio);
    const fin = new Date(c.fecha_fin);
    fin.setHours(23, 59, 59, 999);
    return hoy >= inicio && hoy <= fin;
  });
  return activa ? getIdCampania(activa) : null;
}

function parseDatosPropuestos(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  try {
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed);
  } catch { /* not JSON */ }

  const lines = trimmed.split(/\r?\n/);
  const result = {};
  let canParse = true;

  for (const line of lines) {
    const sep = line.indexOf(':') !== -1 ? line.indexOf(':') : line.indexOf('=');
    if (sep === -1) { canParse = false; break; }
    result[line.slice(0, sep).trim()] = line.slice(sep + 1).trim();
  }

  if (canParse && Object.keys(result).length > 0) return result;
  return null;
}

function normalizeRow(row) {
  return row;
}

function normalizeRows(rows) {
  return Array.isArray(rows) ? rows.map(normalizeRow) : rows;
}

function contains(row, text, fields) {
  const q = str(text).trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) => str(getField(row, field)).toLowerCase().includes(q));
}

// Modificamos el middleware requireAuth para soportar JWT y mantener retrocompatibilidad
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Falta token de autorización' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    //  Debe intentar primero verificar el token como un JWT usando jwt.verify.
    // Esta función decodifica el JWT comprobando la firma con el secreto.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    //  Si tiene éxito, extrae el id y el puesto del payload del token y los inyecta en req.user.
    req.user = {
      id: decoded.id,
      puesto: decoded.puesto
    };
    return next();
  } catch (error) {
    console.error("Error validando token simulado", error);
  }

  return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
}

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

function requireAdmin(req, res, next) {
  // --- BYPASS TEMPORAL DE ADMIN ---
  return next();
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
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + SUPABASE_PAGE_SIZE - 1;
    const { data, error } = await supabase.from(table).select('*').range(from, to);
    if (error) throw error;

    const page = data || [];
    rows.push(...page);

    if (page.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }

  return normalizeRows(rows);
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

function getIdTienda(row) { return getField(row, 'id_tienda'); }
function getIdCampania(row) { return getField(row, 'id_campania'); }
function getIdTurno(row) { return getField(row, 'id_turno'); }
function getIdEntidad(row) { return getField(row, 'id_entidad'); }
function getIdVoluntario(row) { return getField(row, 'id_voluntario'); }
function getNombreEntidad(row) { return getField(row, 'nombre'); }
function getFecha(row) { return getField(row, 'fecha'); }
function getTipoTurno(row) { return getField(row, 'turno'); }

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
  if (query.idTurno) {
    return turnos.find((turno) => sameNumberOrString(getIdTurno(turno), query.idTurno)) || null;
  }
  return filterTurnos(turnos, query)[0] || null;
}

async function getIdsVoluntariosByTurno(idTurno) {
  try {
    const rows = await fetchAll('turnoVoluntario');
    return rows
      .filter((row) => sameNumberOrString(row.id_turno, idTurno))
      .map((row) => row.id_voluntario)
      .filter((id) => id !== undefined && id !== null);
  } catch (error) {
    console.warn('No se pudo leer la tabla de turnos_voluntarios:', error.message);
    return [];
  }
}

async function resolverEntidadResponsable(turno) {
  const idEntidad = getIdEntidad(turno);
  if (!idEntidad) return null;
  return await findById('entidad', idEntidad, ['id_entidad']);
}

async function getVoluntariosDeEntidad(idEntidad, busqueda = '') {
  const voluntarios = await fetchAll('voluntario');

  return voluntarios.filter((voluntario) => {
    if (idEntidad && !sameNumberOrString(voluntario.id_entidad, idEntidad)) return false;
    return contains(voluntario, busqueda, ['nombre', 'apellido_1', 'apellido_2', 'email']);
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

async function construirUsuarioSesion(usuario) {
  const idUsuario = getField(usuario, 'idUsuario', 'id_usuario', 'id');

  return {
    id: idUsuario,
    nombre: getField(usuario, 'nombreCompleto', 'nombre_completo', 'nombre', 'email'),
    puesto: getField(usuario, 'rol', 'puesto'),
    nombreUsuario: getField(usuario, 'nombreUsuario', 'nombre_usuario', 'nombre_completo', 'nombreCompleto', 'email')
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Config estática/front (RUTAS CORREGIDAS A /public)
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/config.js', (req, res) => {
  const apiUrl = process.env.API_URL || `http://localhost:${PORT}`;
  res.type('application/javascript');
  res.send(`window.API_URL = '${apiUrl}';`);
});

// Definimos la ruta absoluta hacia la carpeta "public" mapeada por Docker
const publicPath = path.join(__dirname, '..', 'public');

// Exponemos la carpeta public en la raíz, y cada subcarpeta de forma explícita
app.use(express.static(publicPath));
app.use('/html', express.static(path.join(publicPath, 'html')));
app.use('/css', express.static(path.join(publicPath, 'css')));
app.use('/js', express.static(path.join(publicPath, 'js')));
app.use('/componentes', express.static(path.join(publicPath, 'componentes')));

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
  const email = req.body?.email;
  const password = req.body?.password;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Por favor, introduzca su email y contraseña' });
  }

  try {
    const usuarios = await fetchAll('usuario');

    // Buscar usuario por email solamente
    let usuario = null;
    for (const user of usuarios) {
      const loginMatch = str(getField(user, 'email')).toLowerCase() === str(email).toLowerCase();

      if (loginMatch) {
        // Obtener la contraseña almacenada
        const storedPassword = getField(user, 'contrasenia');

        console.log(`🔍 Usuario encontrado: ${getField(user, 'nombre_completo')} | Hash: ${storedPassword?.substring(0, 20)}...`);

        // Verificar contraseña
        let passwordValid = false;

        if (storedPassword) {
          // Si la contraseña almacenada comienza con $2b$ (formato bcrypt)
          if (storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2y$')) {
            passwordValid = await bcrypt.compare(password, storedPassword);
          } else {
            // Fallback: comparación directa (para contraseñas en texto plano)
            passwordValid = str(storedPassword) === str(password);
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

    const usuarioSesion = await construirUsuarioSesion(usuario);

    // El payload del JWT DEBE incluir el id, el rol (o puesto) normalizado a mayúsculas, y el nombre del usuario.
    const payload = {
      id: usuarioSesion.id,
      puesto: str(usuarioSesion.puesto).toUpperCase(),
      nombre: usuarioSesion.nombre
    };

    // Generamos y firmamos el JWT con el secreto y un tiempo de expiración
    const jwtToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({
      success: true,
      token: jwtToken

    });
    // user: usuarioSesion
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

app.get('/api/campanias', requireAuth, async (req, res) => {
  try {
    const rows = applyGenericFilters(await fetchAll('campania'), req.query);
    res.json(rows);
  } catch (error) {
    sendError(res, error, 'Error obteniendo campañas desde /api');
  }
});

app.get('/api/campania_activa', requireAuth, async (req, res) => {
  console.log("campania activa request.....")
  try {
    const campanias = await fetchAll('campania');
    const idActiva = await getIdCampaniaActiva();
    // aplicar el filtrado a campanias para quedarse solo con la activa si la hay
    const rows = campanias.filter(c => c.id_campania === idActiva);

    res.json(rows);
  } catch (error) {
    sendError(res, error, 'Error obteniendo campañas desde /api');
  }
});

// ─── RUTAS PARA SERVIR PÁGINAS HTML (FRONTEND) ───────────────────────────────
app.get('/entidades', (req, res) => {
  res.sendFile(path.join(publicPath, 'html', 'entidades.html'));
});

app.get('/voluntarios', (req, res) => {
  res.sendFile(path.join(publicPath, 'html', 'voluntarios.html'));
});

app.get('/turnos_modificar', (req, res) => {
  res.sendFile(path.join(publicPath, 'html', 'turnos_modificar.html'));
});

// Rutas para la página de edición y creación (soporta con y sin .html)
app.get('/edit', (req, res) => {
  res.sendFile(path.join(publicPath, 'html', 'edit.html'));
});
app.get('/edit.html', (req, res) => {
  res.sendFile(path.join(publicPath, 'html', 'edit.html'));
});

app.get('/tienda_turnos', (req, res) => {
  res.sendFile(path.join(publicPath, 'html', 'tienda_turnos.html'));
});

// ─── RUTAS DE API (DATOS JSON PURAMENTE) ──────────────────────────────────────

app.get('/api/entidades', requireAuth, async (req, res) => {
  try {
    let rows = await fetchAll('entidad');
    const { idEntidad, idUsuarioContacto, id_usuario_contacto, vinculadoBancosol, busqueda, q } = req.query;
    let idCampania = req.query.idCampania;
    const usuarioContacto = idUsuarioContacto || id_usuario_contacto;
    const rolUsuario = req.user?.puesto;

    // ── Filtros por rol ──────────────────────────────────────────────────
    if (rolUsuario === 'COORDINADOR') {
      idCampania = await getIdCampaniaActiva();
    }

    // ── Filtro por campaña ───────────────────────────────────────────────
    if (idCampania) {
      const turnos = await fetchAll('turno');
      const turnosCampania = turnos.filter(t => sameNumberOrString(getIdCampania(t), idCampania));
      const idsEntidadesCampania = new Set(
        turnosCampania
          .filter(t => getIdEntidad(t))
          .map(t => getIdEntidad(t))
      );
      rows = rows.filter(e => idsEntidadesCampania.has(getIdEntidad(e)));
    } else if (rolUsuario === 'COORDINADOR') {
      rows = [];
    }

    // ── Filtros comunes ──────────────────────────────────────────────────
    rows = rows.filter((row) => {
      if (idEntidad && !sameNumberOrString(getIdEntidad(row), idEntidad)) return false;
      if (usuarioContacto && !sameNumberOrString(row.id_usuario_contacto, usuarioContacto)) return false;
      if (vinculadoBancosol !== undefined && str(row.vinculado_bancosol) !== str(vinculadoBancosol)) return false;
      return contains(row, busqueda || q, ['codigo_bancosol', 'nombre', 'domicilio', 'cp']);
    });

    res.json(rows);
  } catch (error) { sendError(res, error, 'Error obteniendo entidades'); }
});

async function getContactosAdicionales(req, res) {
  try {
    const contactos = await fetchAll('contactoAdicional');
    res.json(contactos);
  } catch (error) {
    sendError(res, error, 'Error obteniendo contactos adicionales');
  }
}

app.get('/api/contactos-adicionales', requireAuth, getContactosAdicionales);
app.get('/api/contactos_adicionales', requireAuth, getContactosAdicionales);

app.get('/api/voluntarios', requireAuth, async (req, res) => {
  try {
    let rows = await fetchAll('voluntario');
    const { idVoluntario, idEntidad: queryIdEntidad, busqueda, q } = req.query;
    let idEntidad = queryIdEntidad;
    let idCampania = req.query.idCampania;
    const rolUsuario = req.user?.puesto;

    // ── Filtros por rol ──────────────────────────────────────────────────
    if (rolUsuario === 'COORDINADOR') {
      idCampania = await getIdCampaniaActiva();
    } else if (rolUsuario === 'RESPONSABLE-ENTIDAD') {
      const entidades = await fetchAll('entidad');
      const miEntidad = entidades.find(e => String(e.id_usuario_contacto) === String(req.user.id));
      if (!miEntidad) return res.json([]);
      if (idEntidad && String(idEntidad) !== String(miEntidad.id_entidad)) return res.json([]);
      idEntidad = String(miEntidad.id_entidad);
    }

    // ── Filtro por campaña (si aplica) ───────────────────────────────────
    if (idCampania) {
      const turnos = await fetchAll('turno');
      const turnosCampania = turnos.filter(t => sameNumberOrString(getIdCampania(t), idCampania));
      const idsTurnosCampania = turnosCampania.map(t => getIdTurno(t));

      const turnoVoluntarios = await fetchAll('turnoVoluntario');
      const idsVoluntariosCampania = new Set(
        turnoVoluntarios
          .filter(tv => idsTurnosCampania.some(idTurno => sameNumberOrString(tv.id_turno, idTurno)))
          .map(tv => getIdVoluntario(tv))
      );

      rows = rows.filter(v => idsVoluntariosCampania.has(getIdVoluntario(v)));
    } else if (rolUsuario === 'COORDINADOR') {
      rows = [];
    }

    // ── Filtros comunes ──────────────────────────────────────────────────
    rows = rows.filter((row) => {
      if (idVoluntario && !sameNumberOrString(getIdVoluntario(row), idVoluntario)) return false;
      if (idEntidad && !sameNumberOrString(getIdEntidad(row), idEntidad)) return false;
      return contains(row, busqueda || q, ['nombre', 'apellido_1', 'apellido_2', 'email']);
    });

    res.json(rows);
  } catch (error) { sendError(res, error, 'Error obteniendo voluntarios'); }
});

app.get('/api/entidades/:idEntidad/voluntarios', requireAuth, async (req, res) => {
  try {
    const entidad = await findById('entidad', req.params.idEntidad, ['id_entidad']);
    const voluntarios = await getVoluntariosDeEntidad(req.params.idEntidad, req.query.busqueda || req.query.q || '');
    res.json({
      idEntidad: req.params.idEntidad,
      nombreEntidad: getNombreEntidad(entidad) || '',
      voluntarios
    });
  } catch (error) { sendError(res, error, 'Error obteniendo voluntarios de entidad'); }
});

app.get('/api/voluntarios_entidad', requireAuth, async (req, res) => {
  try {
    const idEntidad = req.query.idEntidad;

    if (!idEntidad) {
      return res.status(400).json({ success: false, message: 'Falta el parámetro idEntidad.' });
    }

    const entidad = await findById('entidad', idEntidad, ['id_entidad']);
    const voluntarios = await getVoluntariosDeEntidad(idEntidad, req.query.busqueda || req.query.q || '');

    res.json({
      idEntidad,
      nombreEntidad: getNombreEntidad(entidad) || '',
      voluntarios
    });
  } catch (error) { sendError(res, error, 'Error obteniendo voluntarios de entidad'); }
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

app.get('/api/turnos', requireAuth, async (req, res) => {
  try {
    const rows = filterTurnos(await fetchAll('turno'), req.query);
    res.json(rows);
  } catch (error) { sendError(res, error, 'Error obteniendo turnos'); }
});

app.get('/api/schedule', requireAuth, async (req, res) => {
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
    const tienda = await findById('tienda', req.query.idTienda, ['id_tienda']);
    res.json({ tienda });
  } catch (error) { sendError(res, error, 'Error obteniendo detalle de tienda'); }
});

app.get('/tienda_editar', requireAuth, async (req, res) => {
  try {
    const usuarios = await fetchAll('usuario');
    const byRol = (rol) => usuarios.filter((u) => str(getField(u, 'rol', 'puesto')).toLowerCase() === rol.toLowerCase());
    res.json({
      tienda: await findById('tienda', req.query.idTienda, ['id_tienda']),
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

// Endpoint para obtener códigos postales con sus relaciones
app.get(['/cp', '/api/cp'], requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cp')
      .select(`
        cp,
        localidad,
        id_zona,
        distrito(distrito, nombre_distrito),
        zona:id_zona(id_zona, zona_geografica)
      `);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error obteniendo códigos postales:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Endpoints relacionados con los turnos
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/tienda_turnos', requireAuth, async (req, res) => {
  try {
    const idTienda = req.query.idTienda;
    const idCampania = req.query.idCampania;

    if (!idTienda || !idCampania) {
      return res.status(400).json({ success: false, message: 'Faltan parámetros.' });
    }

    const tiendaCampanias = await fetchAll('tiendaCampania').catch(() => []);
    const tiendaCampania = tiendaCampanias.find((row) =>
      sameNumberOrString(getIdTienda(row), idTienda) && sameNumberOrString(getIdCampania(row), idCampania)
    );

    const turnos = filterTurnos(await fetchAll('turno'), { idTienda, idCampania });
    const relacionesTurnoVoluntario = await fetchAll('turnoVoluntario').catch(() => []);
    const voluntarios = await fetchAll('voluntario').catch(() => []);

    const turnosTienda = turnos
      .map((turno) => {
        const idsVoluntarios = relacionesTurnoVoluntario
          .filter((relacion) => sameNumberOrString(relacion.id_turno, getIdTurno(turno)))
          .map((relacion) => relacion.id_voluntario);

        return {
          ...turno,
          voluntarios: voluntarios.filter((voluntario) =>
            idsVoluntarios.some((id) => sameNumberOrString(getIdVoluntario(voluntario), id))
          )
        };
      })
      .sort((a, b) => {
        const compFecha = str(getFecha(a)).localeCompare(str(getFecha(b)));
        if (compFecha !== 0) return compFecha;
        return normalizeTurno(getTipoTurno(a)).localeCompare(normalizeTurno(getTipoTurno(b)));
      });

    const { data: tiendaDetalle } = await supabase
      .from('tienda')
      .select(`id_tienda, domicilio, cadena (id_cadena, establecimiento, nombre_particular), cp (cp, localidad, municipio, zona (id_zona, zona_geografica))`)
      .eq('id_tienda', idTienda)
      .single();

    const campania = await findById('campania', idCampania, ['id_campania']).catch(() => null);
    const idResponsable = tiendaCampania ? tiendaCampania.id_responsable_tienda : null;
    const responsableTienda = idResponsable ? await findById('usuario', idResponsable, ['id_usuario']).catch(() => null) : null;

    res.json({
      turnosTienda, idTienda, idCampania,
      tiendaCampania: { ...(tiendaCampania || {}), tienda: tiendaDetalle || null, campania, responsableTienda }
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
    idTienda: query.idTienda, idCampania: query.idCampania, fecha: query.fecha,
    turno, turnoTexto: normalizeTurno(getTipoTurno(turno)).toUpperCase(),
    nombreEntidadResponsable: getNombreEntidad(entidad) || 'Sin entidad responsable',
    listaVoluntarios, idsVoluntariosSeleccionados, busqueda: query.busqueda || ''
  };
}

app.get('/api/turno_editar', requireAuth, async (req, res) => {
  try {
    const payload = await buildTurnoEditarResponse(req.query);
    if (!payload) return res.status(404).json({ success: false, message: 'Turno no encontrado.' });
    res.json(payload);
  } catch (error) { sendError(res, error, 'Error preparando edición de turno'); }
});

app.get('/api/turno_filtrar', requireAuth, async (req, res) => {
  try {
    const payload = await buildTurnoEditarResponse(req.query);
    if (!payload) return res.status(404).json({ success: false, message: 'Turno no encontrado.' });
    res.json(payload);
  } catch (error) { sendError(res, error, 'Error filtrando voluntarios de turno'); }
});

app.get('/api/tienda_voluntarios', requireAuth, async (req, res) => {
  try {
    const turno = await findTurnoParaEditar(req.query);
    if (!turno) return res.status(404).json({ success: false, message: 'Turno no encontrado.' });

    const entidad = await resolverEntidadResponsable(turno);
    const idEntidad = getIdEntidad(entidad);
    const voluntarios = idEntidad ? await getVoluntariosDeEntidad(idEntidad, req.query.busqueda || '') : [];

    res.json({
      idEntidad: idEntidad || null,
      nombreEntidadResponsable: getNombreEntidad(entidad) || 'Sin entidad responsable',
      voluntarios
    });
  } catch (error) { sendError(res, error, 'Error obteniendo voluntarios de entidad'); }
});

app.get('/api/turno_voluntarios', requireAuth, async (req, res) => {
  try {
    const turno = await findTurnoParaEditar(req.query);
    if (!turno) return res.status(404).json({ success: false, message: 'Turno no encontrado.' });

    const idsVoluntariosSeleccionados = await getIdsVoluntariosByTurno(getIdTurno(turno));
    const voluntarios = await fetchAll('voluntario');

    res.json({
      idTurno: getIdTurno(turno),
      idsVoluntariosSeleccionados,
      voluntarios: voluntarios.filter((voluntario) =>
        idsVoluntariosSeleccionados.some((idVoluntario) => sameNumberOrString(getIdVoluntario(voluntario), idVoluntario))
      )
    });
  } catch (error) { sendError(res, error, 'Error obteniendo voluntarios del turno'); }
});

app.post('/api/turno_guardar_voluntarios', requireAuth, async (req, res) => {
  try {
    const params = { ...req.query, ...req.body };
    const turno = await findTurnoParaEditar(params);
    if (!turno) return res.status(404).json({ success: false, message: 'Turno no encontrado.' });

    const idTurno = getIdTurno(turno);
    const ids = params.voluntariosSeleccionados || params.idsVoluntarios || [];
    const idsVoluntarios = Array.isArray(ids) ? ids : [ids];

    await deleteTurnoVoluntarios(idTurno);
    if (idsVoluntarios.length) {
      await insertRows('turnoVoluntario', idsVoluntarios.map((idVoluntario) => ({ id_turno: idTurno, id_voluntario: idVoluntario })));
    }

    res.json({ success: true, idTurno, idsVoluntariosSeleccionados: idsVoluntarios });
  } catch (error) { sendError(res, error, 'Error guardando voluntarios de turno'); }
});

app.post('/api/turno_borrar_dia', requireAuth, async (req, res) => {
  try {
    const params = { ...req.query, ...req.body };
    const { idTienda, idCampania, fecha } = params;

    if (!idTienda || !idCampania || !fecha) {
      return res.status(400).json({ success: false, message: 'Faltan parámetros para borrar turnos.' });
    }

    const turnos = filterTurnos(await fetchAll('turno'), { idTienda, idCampania, fecha });
    if (!turnos.length) return res.json({ success: true, deleted: 0 });

    for (const turno of turnos) {
      const idTurno = getIdTurno(turno);
      await deleteTurnoVoluntarios(idTurno);
      await deleteRows('turno', 'id_turno', idTurno);
    }

    res.json({ success: true, deleted: turnos.length });
  } catch (error) { sendError(res, error, 'Error borrando turnos del día'); }
});

app.get('/api/info_voluntario', requireAuth, async (req, res) => {
  try {
    const voluntario = await findById('voluntario', req.query.idVoluntario, ['id_voluntario']);
    res.json({ voluntario });
  } catch (error) { sendError(res, error, 'Error obteniendo voluntario'); }
});

async function getTurnoObservaciones(query) {
  const turnos = filterTurnos(await fetchAll('turno'), query);
  return turnos[0] || null;
}

app.get('/api/turno_observaciones', requireAuth, async (req, res) => {
  try {
    const turno = await getTurnoObservaciones(req.query);
    if (!turno) return res.status(404).json({ success: false, message: 'Turno no encontrado.' });
    res.json({ idTienda: req.query.idTienda, idCampania: req.query.idCampania, turno, fecha: getFecha(turno), turnoTexto: normalizeTurno(getTipoTurno(turno)).toUpperCase() });
  } catch (error) { sendError(res, error, 'Error obteniendo observaciones'); }
});

app.get('/api/turno_observaciones_editar', requireAuth, async (req, res) => {
  try {
    const turno = await getTurnoObservaciones(req.query);
    if (!turno) return res.status(404).json({ success: false, message: 'Turno no encontrado.' });
    res.json({ idTienda: req.query.idTienda, idCampania: req.query.idCampania, turno, fecha: getFecha(turno), turnoTexto: normalizeTurno(getTipoTurno(turno)).toUpperCase() });
  } catch (error) { sendError(res, error, 'Error preparando edición de observaciones'); }
});

app.post('/api/turno_observaciones_guardar', requireAuth, async (req, res) => {
  try {
    const params = { ...req.query, ...req.body };
    const turno = await getTurnoObservaciones(params);
    if (!turno) return res.status(404).json({ success: false, message: 'Turno no encontrado.' });

    const [updated] = await updateRows('turno', 'id_turno', getIdTurno(turno), { observaciones: params.observaciones || '' });
    res.json({ success: true, turno: updated || turno });
  } catch (error) { sendError(res, error, 'Error guardando observaciones'); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Escritura genérica mantenida para el frontend antiguo
// ─────────────────────────────────────────────────────────────────────────────
app.post('/usuarios', requireAuth, requireAdmin, async (req, res) => {
  try {
    const datosUsuario = { ...req.body };

    // 1. Mapeo de campos camelCase a snake_case
    if (datosUsuario.idCp !== undefined) {
      datosUsuario.cp = datosUsuario.idCp;
      delete datosUsuario.idCp;
      delete datosUsuario.id_cp;
    }
    if (datosUsuario.nombreCompleto !== undefined) {
      datosUsuario.nombre_completo = datosUsuario.nombreCompleto;
      delete datosUsuario.nombreCompleto;
    }

    // 2. Eliminamos campos temporales del frontend que no van a la BD
    if (datosUsuario.confirmContrasenia !== undefined) {
      delete datosUsuario.confirmContrasenia;
    }

    res.json((await insertRows('usuario', [datosUsuario]))[0]);
  } catch (e) { sendError(res, e, 'Error creando usuario'); }
});
app.put('/usuarios/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const datosUsuario = { ...req.body };

    // 1. Mapeo de campos camelCase a snake_case
    if (datosUsuario.idCp !== undefined) {
      datosUsuario.cp = datosUsuario.idCp;
      delete datosUsuario.idCp;
      delete datosUsuario.id_cp;
    }
    if (datosUsuario.nombreCompleto !== undefined) {
      datosUsuario.nombre_completo = datosUsuario.nombreCompleto;
      delete datosUsuario.nombreCompleto;
    }

    // 2. Eliminamos campos temporales del frontend que no van a la BD
    if (datosUsuario.confirmContrasenia !== undefined) {
      delete datosUsuario.confirmContrasenia;
    }

    res.json((await updateRows('usuario', 'id_usuario', req.params.id, datosUsuario))[0]);
  } catch (e) { sendError(res, e, 'Error actualizando usuario'); }
});
app.delete('/usuarios/:id', requireAuth, requireAdmin, async (req, res) => {
  try { res.json(await deleteRows('usuario', 'id_usuario', req.params.id)); } catch (e) { sendError(res, e, 'Error eliminando usuario'); }
});

app.post(['/campanias', '/api/campanias'], requireAuth, async (req, res) => {
  try {
    const rows = await insertRows('campania', [req.body]);
    res.json(rows[0] || null);
  } catch (e) { sendError(res, e, 'Error creando campaña'); }
});
app.put(['/campanias/:id', '/api/campanias/:id'], requireAuth, async (req, res) => {
  try {
    const campania = await findById('campania', req.params.id, ['idCampania', 'id_campania', 'id']);
    if (!campania) return res.status(404).json({ success: false, message: 'Campaña no encontrada.' });

    const nuevaInicio = req.body.fecha_inicio || req.body.fechaInicio || campania.fecha_inicio || '';
    const nuevaFin = req.body.fecha_fin || req.body.fechaFin || campania.fecha_fin || '';

    if (nuevaInicio && nuevaFin) {
      const inicio = new Date(nuevaInicio);
      const fin = new Date(nuevaFin);
      inicio.setHours(0, 0, 0, 0);
      fin.setHours(23, 59, 59, 999);

      if (isNaN(inicio.getTime()) || isNaN(fin.getTime()) || inicio > fin) {
        return res.status(400).json({ success: false, message: 'Las fechas de campaña no son válidas.' });
      }

      const turnos = await fetchAll('turno');
      const hayTurnoFuera = turnos.some((turno) => {
        const idCampaniaTurno = getField(turno, 'id_campania', 'idCampania');
        if (!sameNumberOrString(idCampaniaTurno, req.params.id)) return false;
        const fechaTurno = new Date(getField(turno, 'fecha'));
        if (isNaN(fechaTurno.getTime())) return false;
        fechaTurno.setHours(12, 0, 0, 0);
        return fechaTurno < inicio || fechaTurno > fin;
      });

      if (hayTurnoFuera) {
        return res.status(400).json({
          success: false,
          message: 'No se puede cambiar el intervalo porque hay turnos fuera de las fechas seleccionadas.'
        });
      }
    }

    const [updated] = await updateRows('campania', 'id_campania', req.params.id, req.body);
    res.json(updated || null);
  } catch (e) { sendError(res, e, 'Error actualizando campaña'); }
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
app.post(['/voluntarios', '/api/voluntarios'], requireAuth, async (req, res) => {
  try { res.json((await insertRows('voluntario', [req.body]))[0]); } catch (e) { sendError(res, e, 'Error creando voluntario'); }
});
app.put(['/voluntarios/:id', '/api/voluntarios/:id'], requireAuth, async (req, res) => {
  try { res.json((await updateRows('voluntario', 'id_voluntario', req.params.id, req.body))[0]); } catch (e) { sendError(res, e, 'Error actualizando voluntario'); }
});
app.delete(['/voluntarios/:id', '/api/voluntarios/:id'], requireAuth, async (req, res) => {
  try { res.json(await deleteRows('voluntario', 'id_voluntario', req.params.id)); } catch (e) { sendError(res, e, 'Error eliminando voluntario'); }
});
app.post(['/turnos', '/api/turnos'], requireAuth, async (req, res) => {
  try { res.json((await insertRows('turno', [req.body]))[0]); } catch (e) { sendError(res, e, 'Error creando turno'); }
});
app.put(['/turnos/:id', '/api/turnos/:id'], requireAuth, async (req, res) => {
  try { res.json((await updateRows('turno', 'id_turno', req.params.id, req.body))[0]); } catch (e) { sendError(res, e, 'Error actualizando turno'); }
});
app.delete(['/turnos/:id', '/api/turnos/:id'], requireAuth, async (req, res) => {
  try { res.json(await deleteRows('turno', 'id_turno', req.params.id)); } catch (e) { sendError(res, e, 'Error eliminando turno'); }
});
app.post('/api/schedule', requireAuth, async (req, res) => {
  try { res.json((await insertRows('turno', [req.body]))[0]); } catch (e) { sendError(res, e, 'Error creando schedule'); }
});
app.put('/api/schedule/:id', requireAuth, async (req, res) => {
  try { res.json((await updateRows('turno', 'id_turno', req.params.id, req.body))[0]); } catch (e) { sendError(res, e, 'Error actualizando schedule'); }
});
app.delete('/api/schedule/:id', requireAuth, async (req, res) => {
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
    const campania = await findById('campania', req.params.id, ['id_campania']);
    if (!campania) return res.status(404).json({ success: false, message: 'Campaña no encontrada.' });
    res.json(campania);
  } catch (error) { sendError(res, error, 'Error obteniendo campaña'); }
});
app.get('/entidades/:id', requireAuth, async (req, res) => {
  try {
    const entidad = await findById('entidad', req.params.id, ['id_entidad']);
    if (!entidad) return res.status(404).json({ success: false, message: 'Entidad no encontrada.' });
    res.json(entidad);
  } catch (error) { sendError(res, error, 'Error obteniendo entidad'); }
});
app.get('/api/voluntarios/:id', requireAuth, async (req, res) => {
  try {
    const voluntario = await findById('voluntario', req.params.id, ['id_voluntario']);
    if (!voluntario) return res.status(404).json({ success: false, message: 'Voluntario no encontrado.' });
    res.json(voluntario);
  } catch (error) { sendError(res, error, 'Error obteniendo voluntario'); }
});
app.get('/tiendas/:id', requireAuth, async (req, res) => {
  try {
    const tienda = await findById('tienda', req.params.id, ['id_tienda']);
    if (!tienda) return res.status(404).json({ success: false, message: 'Tienda no encontrada.' });
    res.json(tienda);
  } catch (error) { sendError(res, error, 'Error obteniendo tienda'); }
});
app.get('/api/turnos/:id', requireAuth, async (req, res) => {
  try {
    const turno = await findById('turno', req.params.id, ['id_turno']);
    if (!turno) return res.status(404).json({ success: false, message: 'Turno no encontrado.' });
    res.json(turno);
  } catch (error) { sendError(res, error, 'Error obteniendo turno'); }
});
app.get('/api/schedule/:id', requireAuth, async (req, res) => {
  try {
    const turno = await findById('turno', req.params.id, ['id_turno']);
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
    const puesto = req.user.puesto;
    const { idZona, participa, idCampania: queryIdCampania } = req.query;
    const idCampania = queryIdCampania ? parseInt(queryIdCampania) : null;

    const { data: campanias } = await supabase.from('campania').select('*');
    let idActiva = null;
    if (campanias) {
      const hoy = new Date();
      const activa = campanias.find(c => {
        if (!c.fecha_inicio || !c.fecha_fin) return false;
        const inicio = new Date(c.fecha_inicio);
        const fin = new Date(c.fecha_fin);
        fin.setHours(23, 59, 59, 999);
        return hoy >= inicio && hoy <= fin;
      });
      if (activa) idActiva = activa.id_campania;
    }

    let query = supabase
      .from('tienda')
      .select(`
                id_tienda, 
                domicilio,
                cadena (id_cadena, establecimiento, nombre_particular),
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

    if (puesto === 'ADMINISTRADOR') {
      if (idZona && idZona !== '0') query = query.eq('cp.id_zona', idZona);
    } else if (puesto === 'COORDINADOR') {
      const { data: usuarioData } = await supabase.from('usuario').select('cp').eq('id_usuario', id_usuario).single();
      if (usuarioData && usuarioData.cp) {
        const { data: userCp } = await supabase.from('cp').select('id_zona').eq('cp', usuarioData.cp).single();
        if (userCp) query = query.eq('cp.id_zona', userCp.id_zona);
      }
    } else if (puesto === 'CAPITAN') {
      query = query.eq('tienda_campania.id_capitan', id_usuario);
    } else if (puesto === 'RESPONSABLE-TIENDA') {
      query = query.eq('tienda_campania.id_responsable_tienda', id_usuario);
    }

    const { data: tiendas, error } = await query;
    if (error) throw error;

    const tiendasFiltradas = tiendas.filter(t => {
      if (!t.cp) return false;

      if (puesto === 'ADMINISTRADOR') {
        if (idCampania && idCampania > 0) {
          const relacion = t.tienda_campania?.find(tc => tc.id_campania === idCampania);
          if (!relacion) return false;
          const participaReal = relacion.participa === true;
          if (participa && participa !== 'all') return participa === 'true' ? participaReal : !participaReal;
          return true;
        } else {
          if (participa && participa !== 'all') {
            const quiereParticipar = participa === 'true';
            return t.tienda_campania?.some(tc => tc.participa === true) === quiereParticipar;
          }
          return true;
        }
      } else {
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

app.get('/api/tiendas/:id', requireAuth, async (req, res) => {
  try {
    const tiendaId = req.params.id;

    const { data: tienda, error } = await supabase
      .from('tienda')
      .select(`
                id_tienda, 
                domicilio,
                cadena (id_cadena, establecimiento, nombre_particular),
                cp (
                    cp, 
                    localidad, 
                    municipio,
                    distrito (distrito, nombre_distrito),
                    zona (id_zona, zona_geografica)
                ),
                tienda_campania (
                    id_campania, 
                    participa, 
                    id_capitan, 
                    id_coordinador, 
                    id_responsable_tienda,
                    num_cajas
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

app.post('/api/tiendas', requireAuth, async (req, res) => {
  try {
    const {
      domicilio, idCp, id_cp, id_cadena,
      idCampania, participa, numCajas,
      idResponsable, idCoordinador, idCapitan
    } = req.body;

    const { data: resultTienda, error: errorTienda } = await supabase
      .from('tienda')
      .insert([{
        domicilio: domicilio || null,
        cp: (idCp || id_cp) || null,
        id_cadena: id_cadena ? parseInt(id_cadena) : null
      }])
      .select();

    if (errorTienda) throw errorTienda;

    const nuevaTiendaId = resultTienda[0].id_tienda;

    if (participa && idCampania) {
      const { error: errorCampania } = await supabase
        .from('tienda_campania')
        .insert([{
          id_tienda: nuevaTiendaId,
          id_campania: parseInt(idCampania),
          num_cajas: parseInt(numCajas) || 0,
          id_responsable_tienda: idResponsable ? parseInt(idResponsable) : null,
          id_coordinador: idCoordinador ? parseInt(idCoordinador) : null,
          id_capitan: idCapitan ? parseInt(idCapitan) : null,
          participa: participa === true || participa === 'true'
        }]);

      if (errorCampania) throw errorCampania;
    }

    res.status(201).json({
      success: true,
      message: 'Tienda creada con éxito',
      id_tienda: nuevaTiendaId
    });

  } catch (error) {
    console.error('Error al crear tienda con Supabase:', error);
    res.status(500).json({ success: false, message: 'Error interno de Supabase: ' + error.message });
  }
});

app.delete('/api/tiendas/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.puesto?.toUpperCase() !== 'ADMINISTRADOR') {
      return res.status(403).json({ error: 'No tienes permisos para borrar.' });
    }

    const tiendaId = req.params.id;
    const { data: turnos } = await supabase.from('turno').select('id_turno').eq('id_tienda', tiendaId);

    if (turnos && turnos.length > 0) {
      for (const t of turnos) {
        await deleteTurnoVoluntarios(t.id_turno);
      }
      await supabase.from('turno').delete().eq('id_tienda', tiendaId);
    }

    await supabase.from('tienda_campania').delete().eq('id_tienda', tiendaId);
    const { error } = await supabase.from('tienda').delete().eq('id_tienda', tiendaId);

    if (error) throw error;
    res.json({ success: true, message: 'Tienda eliminada correctamente' });

  } catch (error) {
    console.error("Error al eliminar la tienda:", error);
    res.status(500).json({ error: 'Fallo SQL al eliminar: ' + error.message });
  }
});

app.get('/api/zonas', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('zona').select('*').order('zona_geografica');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Endpoint para crear una nueva zona (actualiza zona y cp)
app.post(['/zonas', '/api/zonas'], requireAuth, async (req, res) => {
  try {
    const { zona_geografica } = req.body;

    const rows = await insertRows('zona', [{
      zona_geografica,
    }]);

    res.status(201).json(rows[0] || null);
  } catch (error) {
    sendError(res, error, 'Error creando zona');
  }
});

// Endpoint para obtener un CP individual por su código postal
app.get('/api/cp/:cp', requireAuth, async (req, res) => {
  try {
    const cpCode = req.params.cp;
    const { data, error } = await supabase
      .from('cp')
      .select(`
        cp,
        localidad,
        id_zona,
        distrito(distrito, nombre_distrito),
        zona:id_zona(id_zona, zona_geografica)
      `)
      .eq('cp', cpCode)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'CP no encontrado' });
    res.json(data);
  } catch (error) {
    console.error('Error obteniendo CP:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para crear un nuevo CP
app.post('/api/cp', requireAuth, async (req, res) => {
  try {
    const { cp, localidad, zona_geografica, nombre_distrito } = req.body;

    if (!cp) {
      return res.status(400).json({ success: false, message: 'CP es obligatorio.' });
    }

    // Buscar o crear zona geográfica
    let idZonaDestino;
    const { data: zonas, error: zonaError } = await supabase
      .from('zona')
      .select('id_zona')
      .eq('zona_geografica', zona_geografica)
      .limit(1);

    if (zonaError) throw zonaError;

    if (zonas && zonas.length > 0) {
      idZonaDestino = zonas[0].id_zona;
    } else if (zona_geografica) {
      const { data: nuevasZonas, error: insertZonaError } = await supabase
        .from('zona')
        .insert([{ zona_geografica }])
        .select();
      if (insertZonaError) throw insertZonaError;
      idZonaDestino = nuevasZonas?.[0]?.id_zona;
    }

    // Resolver distrito: buscar por nombre o crear uno nuevo
    let idDistritoFinal = null;
    if (nombre_distrito && nombre_distrito.trim()) {
      const nombre = nombre_distrito.trim();
      const { data: distritos, error: distError } = await supabase
        .from('distrito')
        .select('*');
      if (distError) throw distError;
      const existente = distritos.find(d =>
        String(d.nombre_distrito).toLowerCase().trim() === nombre.toLowerCase()
      );
      if (existente) {
        idDistritoFinal = existente.distrito;
      } else {
        const { data: maxRes } = await supabase
          .from('distrito')
          .select('distrito')
          .order('distrito', { ascending: false })
          .limit(1);
        const nextId = (maxRes?.[0]?.distrito || 0) + 1;
        const { data: nuevos, error: insertError } = await supabase
          .from('distrito')
          .insert([{ distrito: nextId, nombre_distrito: nombre }])
          .select();
        if (insertError) throw insertError;
        idDistritoFinal = nuevos?.[0]?.distrito ?? null;
      }
    }

    // Insertar el nuevo CP
    const { error: cpError } = await supabase
      .from('cp')
      .insert([{
        cp: cp,
        localidad: localidad || null,
        id_zona: idZonaDestino || null,
        distrito: idDistritoFinal,
      }]);

    if (cpError) throw cpError;

    res.status(201).json({ success: true, cp });
  } catch (error) {
    sendError(res, error, 'Error creando CP');
  }
});

// Endpoint para actualizar la asignación de un CP concreto
app.put('/api/cp/:cp', requireAuth, async (req, res) => {
  try {
    const { localidad, zona_geografica, nombre_distrito } = req.body;

    // Buscar la zona destino por nombre
    const { data: zonas, error: zonaError } = await supabase
      .from('zona')
      .select('id_zona')
      .eq('zona_geografica', zona_geografica)
      .limit(1);

    if (zonaError) throw zonaError;
    if (!zonas || zonas.length === 0) {
      return res.status(400).json({ success: false, message: 'Zona geográfica no encontrada.' });
    }

    const idZonaDestino = zonas[0].id_zona;

    // Resolver distrito: buscar por nombre o crear uno nuevo
    let idDistritoFinal = null;
    if (nombre_distrito && nombre_distrito.trim()) {
      const nombre = nombre_distrito.trim();
      const { data: distritos, error: distError } = await supabase
        .from('distrito')
        .select('*');
      if (distError) throw distError;
      const existente = distritos.find(d =>
        String(d.nombre_distrito).toLowerCase().trim() === nombre.toLowerCase()
      );
      if (existente) {
        idDistritoFinal = existente.distrito;
      } else {
        // Obtener el siguiente ID disponible (evitar conflicto con la secuencia)
        const { data: maxRes } = await supabase
          .from('distrito')
          .select('distrito')
          .order('distrito', { ascending: false })
          .limit(1);
        const nextId = (maxRes?.[0]?.distrito || 0) + 1;
        const { data: nuevos, error: insertError } = await supabase
          .from('distrito')
          .insert([{ distrito: nextId, nombre_distrito: nombre }])
          .select();
        if (insertError) throw insertError;
        idDistritoFinal = nuevos?.[0]?.distrito ?? null;
      }
    }

    // Actualizar el CP concreto
    const cpUpdate = { id_zona: idZonaDestino };
    if (localidad) cpUpdate.localidad = localidad;
    cpUpdate.distrito = idDistritoFinal;

    const { error: cpError } = await supabase
      .from('cp')
      .update(cpUpdate)
      .eq('cp', req.params.cp);

    if (cpError) throw cpError;

    res.json({ success: true, cp: req.params.cp, id_zona: idZonaDestino, ...cpUpdate });
  } catch (error) {
    sendError(res, error, 'Error actualizando zona');
  }
});

// Endpoint para obtener zonas asignadas a una campaña específica
app.get('/api/zonas_por_campania', requireAuth, async (req, res) => {
  try {
    const idCampania = req.query.idCampania;
    if (!idCampania) {
      return res.status(400).json({ error: 'Falta el parámetro idCampania' });
    }

    const { data, error } = await supabase
      .from('asignacion_zona')
      .select(`
        id_zona,
        zona:id_zona (
          id_zona,
          zona_geografica
        )
      `)
      .eq('id_campania', idCampania);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error obteniendo zonas por campaña:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/cps', requireAuth, async (req, res) => {
  try {
    const cps = await fetchAll('cp');
    res.json(cps);
  } catch (error) {
    sendError(res, error, 'Error obteniendo CPs');
  }
});

app.get(['/cadenas', '/api/cadenas'], requireAuth, async (req, res) => {
  try {
    const cadenas = await fetchAll('cadena');
    res.json(cadenas);
  } catch (error) {
    sendError(res, error, 'Error obteniendo cadenas');
  }
});

app.get('/api/distritos', requireAuth, async (req, res) => {
  try {
    const distritos = await fetchAll('distrito');
    res.json(distritos);
  } catch (error) {
    sendError(res, error, 'Error obteniendo distritos');
  }
});

// Endpoint para crear una nueva cadena
app.post('/api/cadenas', requireAuth, async (req, res) => {
  try {
    const { codigo_cadena, establecimiento, nombre_particular, empresa } = req.body;

    // Validación básica
    if (!codigo_cadena || !establecimiento) {
      return res.status(400).json({ success: false, message: 'El código y el establecimiento son obligatorios.' });
    }

    const rows = await insertRows('cadena', [{
      codigo_cadena,
      establecimiento,
      nombre_particular,
      empresa_cadena: empresa // Aseguramos el mapeo correcto
    }]);

    res.status(201).json(rows[0] || null);

  } catch (error) {
    sendError(res, error, 'Error al crear la cadena');
  }
});

// Endpoint para actualizar una cadena existente
app.put('/api/cadenas/:id', requireAuth, async (req, res) => {
  try {
    const { codigo_cadena, establecimiento, nombre_particular, empresa } = req.body;

    const [updated] = await updateRows('cadena', 'id_cadena', req.params.id, {
      codigo_cadena,
      establecimiento,
      nombre_particular,
      empresa_cadena: empresa
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Cadena no encontrada.' });
    }

    res.json(updated);
  } catch (error) {
    sendError(res, error, 'Error actualizando cadena');
  }
});

// Endpoint para actualizar una cadena existente
app.put('/api/cadenas/:id', requireAuth, async (req, res) => {
  try {
    const { codigo_cadena, establecimiento, nombre_particular, empresa } = req.body;

    const [updated] = await updateRows('cadena', 'id_cadena', req.params.id, {
      codigo_cadena,
      establecimiento,
      nombre_particular,
      empresa_cadena: empresa
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Cadena no encontrada.' });
    }

    res.json(updated);
  } catch (error) {
    sendError(res, error, 'Error actualizando cadena');
  }
});

app.get('/api/usuarios', requireAuth, async (req, res) => {
  try {
    const usuarios = await fetchAll('usuario');
    res.json(usuarios);
  } catch (error) {
    sendError(res, error, 'Error obteniendo usuarios');
  }
});

app.get('/api/usuarios/:id', requireAuth, async (req, res) => {
  try {
    const usuario = await findById('usuario', req.params.id, ['idUsuario', 'id_usuario', 'id']);
    if (!usuario) return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    res.json(usuario);
  } catch (error) { sendError(res, error, 'Error obteniendo usuario'); }
});

app.put('/api/usuarios/:id', requireAuth, async (req, res) => {
  try {
    const datosUsuario = { ...req.body };

    if (datosUsuario.idCp !== undefined) {
      datosUsuario.cp = datosUsuario.idCp;
      delete datosUsuario.idCp;
      delete datosUsuario.id_cp;
    }
    if (datosUsuario.nombreCompleto !== undefined) {
      datosUsuario.nombre_completo = datosUsuario.nombreCompleto;
      delete datosUsuario.nombreCompleto;
    }

    if (datosUsuario.confirmContrasenia !== undefined) {
      delete datosUsuario.confirmContrasenia;
    }

    const updated = (await updateRows('usuario', 'id_usuario', req.params.id, datosUsuario))[0];

    const usuarioSesion = await construirUsuarioSesion(updated);
    const payload = {
      id: usuarioSesion.id,
      puesto: str(usuarioSesion.puesto).toUpperCase(),
      nombre: usuarioSesion.nombre
    };
    const jwtToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({ usuario: updated, token: jwtToken });
  } catch (e) { sendError(res, e, 'Error actualizando usuario'); }
});

app.get('/api/sugerencias', requireAuth, requireAdmin, async (req, res) => {
  try {
    const sugerencias = await fetchAll('sugerenciaCambio');
    res.json(sugerencias);
  } catch (error) {
    sendError(res, error, 'Error obteniendo sugerencias');
  }
});

app.get('/api/sugerencias/:id', requireAdmin, requireAuth, async (req, res) => {
  try {
    const sugerencia = await findById('sugerenciaCambio', req.params.id, ['id_sugerencia']);
    if (!sugerencia) {
      return res.status(404).json({ error: 'Sugerencia no encontrada' });
    }
    res.json(sugerencia);
  } catch (error) {
    sendError(res, error, 'Error obteniendo la sugerencia');
  }
});

// =========================================================================
// ENDPOINT: APROBAR/RECHAZAR SUGERENCIA
// =========================================================================
app.put('/api/sugerencias/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body; // 'APROBADO' o 'RECHAZADO'
    const userId = req.user.id;

    if (!['APROBADO', 'RECHAZADO'].includes(estado)) {
      return res.status(400).json({ error: 'El estado proporcionado no es válido.' });
    }

    const sugerencia = await findById('sugerenciaCambio', id, ['id_sugerencia']);
    if (!sugerencia) {
      return res.status(404).json({ error: 'Sugerencia no encontrada.' });
    }
    if (sugerencia.estado !== 'PENDIENTE') {
      return res.status(409).json({ error: `La sugerencia ya ha sido procesada (estado: ${sugerencia.estado}).` });
    }

    // Si se aprueba, aplicamos los cambios a la entidad original
    if (estado === 'APROBADO') {
      const tipoEntidad = sugerencia.tipo_entidad;
      const idEntidadOriginal = sugerencia.id_entidad_original;
      const pkField = PK_MAP[tipoEntidad?.toLowerCase()];

      if (!tipoEntidad || !idEntidadOriginal || !pkField) {
        throw new Error(`Configuración de entidad no encontrada para el tipo: ${tipoEntidad}`);
      }

      const datosPropuestos = parseDatosPropuestos(sugerencia.datos_propuestos);
      if (!datosPropuestos) {
        return res.status(400).json({ error: 'Los datos propuestos no tienen un formato válido y no se pueden aplicar automáticamente.' });
      }

      await updateRows(tipoEntidad.toLowerCase(), pkField, idEntidadOriginal, datosPropuestos);
    }

    // Finalmente, actualizamos el estado de la sugerencia
    const patchSugerencia = {
      estado,
      id_revisado_por: userId,
      fecha_revision: new Date().toISOString(),
    };

    const [updatedSugerencia] = await updateRows('sugerenciaCambio', 'id_sugerencia', id, patchSugerencia);

    res.json(updatedSugerencia);
  } catch (error) {
    sendError(res, error, 'Error al procesar la sugerencia');
  }
});

// =========================================================================
// ENDPOINT: CREAR SUGERENCIA (accesible por coordinadores y otros roles)
// =========================================================================
app.post('/api/sugerencias', requireAuth, async (req, res) => {
  try {
    const { tipo_entidad, id_entidad_original, datos_propuestos } = req.body;
    const userId = req.user.id;

    if (!tipo_entidad || id_entidad_original === undefined || id_entidad_original === null || !datos_propuestos) {
      return res.status(400).json({ error: 'Faltan campos requeridos: tipo_entidad, id_entidad_original, datos_propuestos' });
    }

    if (!PK_MAP[tipo_entidad?.toLowerCase()]) {
      return res.status(400).json({ error: `Tipo de entidad no válido: ${tipo_entidad}` });
    }

    if (typeof datos_propuestos !== 'object' || Array.isArray(datos_propuestos)) {
      return res.status(400).json({ error: 'datos_propuestos debe ser un objeto JSON' });
    }

    const newSugerencia = {
      tipo_entidad,
      id_entidad_original,
      datos_propuestos: JSON.stringify(datos_propuestos),
      id_propuesto_por: userId,
      fecha_propuesta: new Date().toISOString(),
      estado: 'PENDIENTE',
    };

    const [created] = await insertRows('sugerenciaCambio', newSugerencia);
    res.status(201).json(created);
  } catch (error) {
    sendError(res, error, 'Error al crear la sugerencia');
  }
});

app.put('/api/tiendas/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.puesto?.toUpperCase() !== 'ADMINISTRADOR') {
      return res.status(403).json({ error: 'No tienes permisos.' });
    }

    const tiendaId = req.params.id;
    const {
      domicilio, idCp, id_cp, id_cadena,
      idResponsable, idCoordinador, idCapitan,
      numCajas, participa, idCampania
    } = req.body;

    const { error: errorTienda } = await supabase
      .from('tienda')
      .update({
        domicilio: domicilio || null,
        cp: (idCp || id_cp) || null,
        id_cadena: (idCadena || id_cadena) ? parseInt(idCadena || id_cadena) : null
      })
      .eq('id_tienda', tiendaId);

    if (errorTienda) throw errorTienda;

    if (idCampania) {
      const { error: errorCampania } = await supabase
        .from('tienda_campania')
        .update({
          id_responsable_tienda: idResponsable ? parseInt(idResponsable) : null,
          id_coordinador: idCoordinador ? parseInt(idCoordinador) : null,
          id_capitan: idCapitan ? parseInt(idCapitan) : null,
          num_cajas: parseInt(numCajas) || 0,
          participa: participa === true || participa === 'true'
        })
        .eq('id_tienda', tiendaId)
        .eq('id_campania', idCampania);

      if (errorCampania) throw errorCampania;
    }

    res.json({ success: true, message: 'Tienda actualizada correctamente' });

  } catch (error) {
    console.error("Error al guardar la tienda:", error);
    res.status(500).json({ error: 'Error al actualizar los datos en la base de datos' });
  }
});

app.get('/api/campanias_por_zona', requireAuth, async (req, res) => {
  try {
    const idZona = req.query.idZona;
    if (!idZona) {
      return res.status(400).json({ error: 'Falta el parámetro idZona' });
    }

    const { data, error } = await supabase
      .from('asignacion_zona')
      .select(`
        id_campania,
        campania:id_campania (
          id_campania,
          nombre,
          fecha_inicio,
          fecha_fin,
          tipo
        )
      `)
      .eq('id_zona', idZona);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error obteniendo campañas por zona:', error);
    res.status(500).json({ error: error.message });
  }
});

// NUEVO: Tiendas agrupadas por Zona
app.get('/api/stats/tiendas-por-zona', requireAuth, async (req, res) => {
  try {
    const tiendas = await fetchAll('tienda');
    const cps = await fetchAll('cp');
    const zonas = await fetchAll('zona');

    // Mapeamos CP a Zona para búsqueda rápida
    const cpToZona = {};
    cps.forEach(cp => {
      cpToZona[cp.cp] = getField(cp, 'idZona', 'id_zona');
    });

    // Agrupamos contando tiendas usando su CP para saber su zona
    const conteo = tiendas.reduce((acc, tienda) => {
      const idCp = getField(tienda, 'cp', 'idCp', 'codigo_postal');
      const idZona = cpToZona[idCp];
      if (idZona) acc[idZona] = (acc[idZona] || 0) + 1;
      return acc;
    }, {});

    const resultado = zonas.map(z => ({
      nombre: z.zona_geografica || z.nombre || 'Sin Zona',
      total: conteo[z.id_zona] || 0
    }));

    res.json(resultado);
  } catch (error) { sendError(res, error, 'Error calculando stats tiendas'); }
});

// NUEVO: Usuarios agrupados por Zona (basado en su CP)
app.get('/api/stats/usuarios-por-zona', requireAuth, async (req, res) => {
  try {
    const usuarios = await fetchAll('usuario');
    const cps = await fetchAll('cp');
    const zonas = await fetchAll('zona');

    // Mapeamos CP a Zona para búsqueda rápida
    const cpToZona = {};
    cps.forEach(cp => {
      cpToZona[cp.cp] = getField(cp, 'idZona', 'id_zona');
    });

    const conteo = usuarios.reduce((acc, user) => {
      const idCp = getField(user, 'id_cp', 'idCp', 'cp');
      const idZona = cpToZona[idCp];
      if (idZona) acc[idZona] = (acc[idZona] || 0) + 1;
      return acc;
    }, {});

    const resultado = zonas.map(z => ({
      nombre: z.zona_geografica || z.nombre || 'Sin Zona',
      total: conteo[z.id_zona] || 0
    }));

    res.json(resultado);
  } catch (error) { sendError(res, error, 'Error calculando stats usuarios'); }
});

// NUEVO: Tiendas por CP filtradas por Campaña y Zona
app.get('/api/stats/tiendas-por-cp', requireAuth, async (req, res) => {
  try {
    const { idCampania, idZona } = req.query;

    // Filtramos tiendas que participen en la campaña Y que estén en la zona
    const { data, error } = await supabase
      .from('tienda')
      .select(`
            cp!inner (cp, id_zona),
            tienda_campania!inner (id_campania)
        `)
      .eq('tienda_campania.id_campania', idCampania)
      .eq('cp.id_zona', idZona);

    if (error) throw error;

    // Agrupamos y contamos por CP
    const conteo = data.reduce((acc, t) => {
      const cp = t.cp.cp;
      acc[cp] = (acc[cp] || 0) + 1;
      return acc;
    }, {});

    res.json(Object.entries(conteo).map(([cp, total]) => ({ cp, total })));
  } catch (error) { sendError(res, error, 'Error calculando tiendas por CP'); }
});

// NUEVO: Usuarios por CP filtrados por Zona
app.get('/api/stats/usuarios-por-cp', requireAuth, async (req, res) => {
  try {
    const { idZona } = req.query;

    const { data, error } = await supabase
      .from('usuario')
      .select(`
            cp!inner (cp, id_zona)
        `)
      .eq('cp.id_zona', idZona);

    if (error) throw error;

    // Agrupamos y contamos por CP
    const conteo = data.reduce((acc, u) => {
      const cp = u.cp.cp;
      acc[cp] = (acc[cp] || 0) + 1;
      return acc;
    }, {});

    res.json(Object.entries(conteo).map(([cp, total]) => ({ cp, total })));
  } catch (error) { sendError(res, error, 'Error calculando usuarios por CP'); }
});

// =========================================================================
// NUEVAS GRÁFICAS GENERALES
// =========================================================================

// 1. Entidades por Zona (Entidad -> CP -> Zona)
app.get('/api/stats/entidades-por-zona', requireAuth, async (req, res) => {
  try {
    const entidades = await fetchAll('entidad');
    const cps = await fetchAll('cp');
    const zonas = await fetchAll('zona');

    const cpToZona = {};
    cps.forEach(cp => { cpToZona[cp.cp] = getField(cp, 'idZona', 'id_zona'); });

    const conteo = entidades.reduce((acc, ent) => {
      const idZona = cpToZona[ent.cp];
      if (idZona) acc[idZona] = (acc[idZona] || 0) + 1;
      return acc;
    }, {});

    res.json(zonas.map(z => ({ nombre: z.zona_geografica || z.nombre, total: conteo[z.id_zona] || 0 })));
  } catch (e) { sendError(res, e, 'Error stats entidades'); }
});

// 2. Tiendas por Cadena (Top 10)
app.get('/api/stats/tiendas-por-cadena', requireAuth, async (req, res) => {
  try {
    const tiendas = await fetchAll('tienda');
    const cadenas = await fetchAll('cadena');

    const conteo = tiendas.reduce((acc, t) => {
      if (t.id_cadena) acc[t.id_cadena] = (acc[t.id_cadena] || 0) + 1;
      return acc;
    }, {});

    const resultado = cadenas
      .map(c => ({ nombre: c.nombre_particular || c.establecimiento || 'Cadena ' + c.id_cadena, total: conteo[c.id_cadena] || 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Ordenamos de mayor a menor y nos quedamos con el Top 10

    res.json(resultado);
  } catch (e) { sendError(res, e, 'Error stats cadenas'); }
});

// 3. Tiendas por Campaña
app.get('/api/stats/tiendas-por-campania', requireAuth, async (req, res) => {
  try {
    const tc = await fetchAll('tiendaCampania');
    const campanias = await fetchAll('campania');

    const conteo = tc.reduce((acc, t) => {
      if (t.id_campania) acc[t.id_campania] = (acc[t.id_campania] || 0) + 1;
      return acc;
    }, {});

    res.json(campanias.map(c => ({ nombre: c.nombre, total: conteo[c.id_campania] || 0 })));
  } catch (e) { sendError(res, e, 'Error stats tiendas campaña'); }
});

// 4. Voluntarios por Entidad (Top 10 para no saturar la gráfica)
app.get('/api/stats/voluntarios-por-entidad', requireAuth, async (req, res) => {
  try {
    const voluntarios = await fetchAll('voluntario');
    const entidades = await fetchAll('entidad');

    const conteo = voluntarios.reduce((acc, v) => {
      if (v.id_entidad) acc[v.id_entidad] = (acc[v.id_entidad] || 0) + 1;
      return acc;
    }, {});

    const resultado = entidades
      .map(e => ({ nombre: e.nombre || 'Entidad ' + e.id_entidad, total: conteo[e.id_entidad] || 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Solo las 10 con más voluntarios

    res.json(resultado);
  } catch (e) { sendError(res, e, 'Error stats voluntarios'); }
});

// =========================================================================
// GRÁFICAS GRANULARES (Reemplaza a los dos endpoints anteriores)
// =========================================================================
app.get('/api/stats/detalle-granular', requireAuth, async (req, res) => {
  try {
    const { idCampania, idZona } = req.query;

    // 1. Obtener CPs de la zona
    const cpsData = await fetchAll('cp');
    const cpsZona = cpsData.filter(c => sameNumberOrString(getField(c, 'idZona', 'id_zona'), idZona)).map(c => c.cp);

    // 2. Tiendas de esos CPs
    const tiendas = await fetchAll('tienda');
    const tiendasZona = tiendas.filter(t => cpsZona.includes(getField(t, 'cp', 'idCp', 'codigo_postal')));
    const idsTiendas = tiendasZona.map(t => t.id_tienda);

    // 3. Filtros Supabase Directos (Más rápidos)
    const { data: tcZona } = await supabase.from('tienda_campania').select('*').eq('id_campania', idCampania).in('id_tienda', idsTiendas.length ? idsTiendas : [0]);
    const { data: asignacionTienda } = await supabase.from('asignacion_tienda').select('*').eq('id_campania', idCampania);
    const { data: asignacionZona } = await supabase.from('asignacion_zona').select('*').eq('id_campania', idCampania).eq('id_zona', idZona);
    const { data: contactosAdicionales } = await supabase.from('contacto_adicional').select('*');
    const entidades = await fetchAll('entidad');

    // Estructuras de datos (Usamos Sets para no contar al mismo usuario dos veces en un CP)
    const tiendasPorCp = {};
    const usuariosPorCp = {};
    const rolesCount = { coordinadores: new Set(), capitanes: new Set(), responsablesTienda: new Set(), responsablesEntidad: new Set() };

    cpsZona.forEach(cp => { tiendasPorCp[cp] = 0; usuariosPorCp[cp] = new Set(); });

    // LÓGICA DE TIENDAS Y RESPONSABLES ASOCIADOS A TIENDA
    (tcZona || []).forEach(tc => {
      const tienda = tiendasZona.find(t => t.id_tienda === tc.id_tienda);
      if (!tienda) return;
      const cp = getField(tienda, 'cp', 'idCp', 'codigo_postal');
      tiendasPorCp[cp]++;

      if (tc.id_coordinador) { usuariosPorCp[cp].add(tc.id_coordinador); rolesCount.coordinadores.add(tc.id_coordinador); }
      if (tc.id_capitan) { usuariosPorCp[cp].add(tc.id_capitan); rolesCount.capitanes.add(tc.id_capitan); }
      if (tc.id_responsable_tienda) { usuariosPorCp[cp].add(tc.id_responsable_tienda); rolesCount.responsablesTienda.add(tc.id_responsable_tienda); }

      // Responsable de Entidad
      const at = (asignacionTienda || []).find(a => a.id_tienda === tc.id_tienda);
      if (at && at.id_entidad) {
        const entidad = entidades.find(e => e.id_entidad === at.id_entidad);
        if (entidad && entidad.id_usuario_contacto) {
          usuariosPorCp[cp].add(entidad.id_usuario_contacto);
          rolesCount.responsablesEntidad.add(entidad.id_usuario_contacto);
        }
        (contactosAdicionales || []).filter(ca => ca.id_entidad === at.id_entidad && ca.id_usuario).forEach(c => {
          usuariosPorCp[cp].add(c.id_usuario);
          rolesCount.responsablesEntidad.add(c.id_usuario);
        });
      }
    });

    // LÓGICA DE ASIGNACIÓN A ZONA (Añadimos al primer CP de la zona para que figuren en la gráfica)
    const firstCp = cpsZona[0];
    (asignacionZona || []).forEach(az => {
      if (az.rol_en_campania === 'COORDINADOR') rolesCount.coordinadores.add(az.id_usuario);
      if (az.rol_en_campania === 'CAPITAN') rolesCount.capitanes.add(az.id_usuario);
      if (firstCp && az.id_usuario) usuariosPorCp[firstCp].add(az.id_usuario);
    });

    // Mapeo final para React
    res.json({
      tiendasPorCp: Object.keys(tiendasPorCp).map(cp => ({ cp, total: tiendasPorCp[cp] })).filter(x => x.total > 0),
      usuariosPorCp: Object.keys(usuariosPorCp).map(cp => ({ cp, total: usuariosPorCp[cp].size })).filter(x => x.total > 0),
      roles: [
        { nombre: 'Coordinadores', total: rolesCount.coordinadores.size },
        { nombre: 'Capitanes', total: rolesCount.capitanes.size },
        { nombre: 'Resp. Tienda', total: rolesCount.responsablesTienda.size },
        { nombre: 'Resp. Entidad', total: rolesCount.responsablesEntidad.size }
      ]
    });

  } catch (error) { sendError(res, error, 'Error en detalle granular'); }
});

app.all([
  '/voluntarios',
  '/voluntarios/:id',
  '/turnos',
  '/turnos/:id',
  '/schedule',
  '/schedule/:id',
  '/turno_filtrar',
  '/turno_guardar_voluntarios',
  '/info_Voluntario',
  '/turno_observaciones_guardar'
], (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta eliminada. Usa el endpoint equivalente bajo /api/.'
  });
});

// Catch-all absoluto para la SPA
app.get('*', (req, res) => {
  const indexPath = process.env.NODE_ENV === 'development'
    ? '/public/html/index.html'
    : path.join(__dirname, '..', 'public', 'html', 'index.html');
  res.sendFile(indexPath);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ API Express + Supabase en http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Supabase URL: ${process.env.SUPABASE_URL ? 'configurada' : 'NO configurada'}`);
  console.log(`   GET de datos públicos para pruebas en navegador; POST/PUT/DELETE con token.\n`);
});
