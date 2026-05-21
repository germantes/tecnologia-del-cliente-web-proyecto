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

function requireAuth(req, res, next) {
  // --- BYPASS TEMPORAL DE AUTENTICACIÓN ---
  // Simulamos un usuario admin para que no fallen los endpoints que usan req.user
  req.user = { id: 1, puesto: 'ADMINISTRADOR', nombreUsuario: 'admin', nombre: 'Admin Temporal' };
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
  if (req.user?.puesto !== 'ADMINISTRADOR') {
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
            // Comparar usando bcrypt
            console.log(`🔐 Comparando con bcrypt...`);
            passwordValid = await bcrypt.compare(password, storedPassword);
            console.log(`✅ Resultado bcrypt: ${passwordValid}`);
          } else {
            // Fallback: comparación directa (para contraseñas en texto plano)
            passwordValid = str(storedPassword) === str(password);
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

    const usuarioSesion = await construirUsuarioSesion(usuario);

    res.json({
      success: true,
      token: 'mock-token-' + getField(usuario, 'idUsuario', 'id_usuario', 'id'),
      user: usuarioSesion
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

app.get('/turnos_modificar', requireAuth, (req, res) => {
  res.sendFile(path.join(srcPath, 'html', 'turnos_modificar.html'));
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
    const { idEntidad, idUsuarioContacto, id_usuario_contacto, vinculadoBancosol, busqueda, q } = req.query;
    const usuarioContacto = idUsuarioContacto || id_usuario_contacto;

    rows = rows.filter((row) => {
      if (idEntidad && !sameNumberOrString(getIdEntidad(row), idEntidad)) return false;
      if (usuarioContacto && !sameNumberOrString(row.id_usuario_contacto, usuarioContacto)) return false;
      if (vinculadoBancosol !== undefined && str(row.vinculado_bancosol) !== str(vinculadoBancosol)) return false;
      return contains(row, busqueda || q, ['codigo_bancosol', 'nombre', 'domicilio', 'cp']);
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
        distrito(nombre_distrito),
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

    if (!idTienda) {
      return res.status(400).json({
        success: false,
        message: 'Falta el parámetro idTienda.'
      });
    }

    if (!idCampania) {
      return res.status(400).json({
        success: false,
        message: 'Falta el parámetro idCampania.'
      });
    }

    const tiendaCampanias = await fetchAll('tiendaCampania').catch(() => []);

    const tiendaCampania = tiendaCampanias.find((row) =>
      sameNumberOrString(getIdTienda(row), idTienda)
      && sameNumberOrString(getIdCampania(row), idCampania)
    );

    const turnos = filterTurnos(await fetchAll('turno'), {
      idTienda,
      idCampania
    });

    const relacionesTurnoVoluntario = await fetchAll('turnoVoluntario').catch(() => []);
    const voluntarios = await fetchAll('voluntario').catch(() => []);

    const turnosTienda = turnos
      .map((turno) => {
        const idsVoluntarios = relacionesTurnoVoluntario
          .filter((relacion) =>
            sameNumberOrString(
              relacion.id_turno,
              getIdTurno(turno)
            )
          )
          .map((relacion) =>
            relacion.id_voluntario
          );

        return {
          ...turno,
          voluntarios: voluntarios.filter((voluntario) =>
            idsVoluntarios.some((idVoluntario) =>
              sameNumberOrString(getIdVoluntario(voluntario), idVoluntario)
            )
          )
        };
      })
      .sort((a, b) => {
        const comparacionFecha = str(getFecha(a)).localeCompare(str(getFecha(b)));

        if (comparacionFecha !== 0) {
          return comparacionFecha;
        }

        return normalizeTurno(getTipoTurno(a)).localeCompare(
          normalizeTurno(getTipoTurno(b))
        );
      });

    const { data: tiendaDetalle } = await supabase
      .from('tienda')
      .select(`
        id_tienda,
        domicilio,
        cadena (
          id_cadena,
          establecimiento,
          nombre_particular
        ),
        cp (
          cp,
          localidad,
          municipio,
          zona (
            id_zona,
            zona_geografica
          )
        )
      `)
      .eq('id_tienda', idTienda)
      .single();

    const campania = await findById('campania', idCampania, ['id_campania']).catch(() => null);

    const idResponsable = tiendaCampania ? tiendaCampania.id_responsable_tienda : null;

    const responsableTienda = idResponsable
      ? await findById('usuario', idResponsable, ['id_usuario']).catch(() => null)
      : null;

    res.json({
      turnosTienda,
      idTienda,
      idCampania,
      tiendaCampania: {
        ...(tiendaCampania || {}),
        tienda: tiendaDetalle || null,
        campania,
        responsableTienda
      }
    });
  } catch (error) {
    sendError(res, error, 'Error obteniendo turnos de tienda');
  }
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
    nombreEntidadResponsable: getNombreEntidad(entidad) || 'Sin entidad responsable',
    listaVoluntarios,
    idsVoluntariosSeleccionados,
    busqueda: query.busqueda || ''
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
        idsVoluntariosSeleccionados.some((idVoluntario) =>
          sameNumberOrString(getIdVoluntario(voluntario), idVoluntario)
        )
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
      await insertRows('turnoVoluntario', idsVoluntarios.map((idVoluntario) => ({
        id_turno: idTurno,
        id_voluntario: idVoluntario
      })));
    }

    res.json({ success: true, idTurno, idsVoluntariosSeleccionados: idsVoluntarios });
  } catch (error) { sendError(res, error, 'Error guardando voluntarios de turno'); }
});

app.post('/api/turno_borrar_dia', requireAuth, async (req, res) => {
  try {
    const params = { ...req.query, ...req.body };
    const idTienda = params.idTienda;
    const idCampania = params.idCampania;
    const fecha = params.fecha;

    if (!idTienda || !idCampania || !fecha) {
      return res.status(400).json({ success: false, message: 'Faltan parámetros para borrar turnos.' });
    }

    const turnos = filterTurnos(await fetchAll('turno'), {
      idTienda,
      idCampania,
      fecha
    });

    if (!turnos.length) {
      return res.json({ success: true, deleted: 0 });
    }

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
app.put('/campanias/:id', requireAuth, async (req, res) => {
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

    // 3. Filtros previos en Base de Datos según el ROL
    if (puesto === 'ADMINISTRADOR') {
      if (idZona && idZona !== '0') query = query.eq('cp.id_zona', idZona);
    } else if (puesto === 'COORDINADOR') {
      const { data: usuarioData } = await supabase.from('usuario').select('id_cp').eq('id_usuario', id_usuario).single();
      if (usuarioData && usuarioData.id_cp) {
        const { data: userCp } = await supabase.from('cp').select('id_zona').eq('cp', usuarioData.id_cp).single();
        if (userCp) query = query.eq('cp.id_zona', userCp.id_zona);
      }
    } else if (puesto === 'CAPITAN' || puesto === 'RESPONSABLE-TIENDA') {
      query = query.or(`id_capitan.eq.${id_usuario},id_responsable_tienda.eq.${id_usuario}`, { foreignTable: 'tienda_campania' });
    }

    const { data: tiendas, error } = await query;
    if (error) throw error;

    // 4. LIMPIEZA POST-CONSULTA Y FILTRADO ESTRICTO
    const tiendasFiltradas = tiendas.filter(t => {
      if (!t.cp) return false;

      if (puesto === 'ADMINISTRADOR') {
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

// Endpoint para obtener campañas asignadas a una zona específica
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
