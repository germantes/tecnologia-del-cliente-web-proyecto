// server.js — Express + Supabase
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const supabase = require('./supabase-client');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde /src (montado en Docker)
const srcPath = process.env.NODE_ENV === 'development' 
  ? '/src' 
  : path.join(__dirname, '..', 'src');
app.use(express.static(srcPath));

// ── Utilidades ────────────────────────────────────────────────────────────────

// Mapear roles de Supabase a roles del frontend
function mapRol(rolSupabase) {
  const mapa = {
    'ADMINISTRADOR': 'admin',
    'COORDINADOR': 'manager',
    'RESPONSABLE-ENTIDAD': 'worker',
    'CAPITAN': 'worker'
  };
  return mapa[rolSupabase] || 'worker';
}

function makeToken(user) {
  const puesto = mapRol(user.rol);
  const payload = { 
    id: user.id_usuario, 
    nombreUsuario: user.nombre_completo, 
    puesto: puesto, 
    nombre: user.nombre_completo 
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

// ── Rutas públicas ────────────────────────────────────────────────────────────

// GET /health
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    supabase: !!process.env.SUPABASE_URL 
  });
});

// POST /auth/login
app.post('/auth/login', async (req, res) => {
  const { nombreUsuario, contrasena } = req.body || {};
  
  if (!nombreUsuario || !contrasena) {
    return res.status(400).json({ success: false, message: 'Faltan campos.' });
  }

  try {
    // Buscar usuario en Supabase por nombre_completo
    const { data: usuarios, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('nombre_completo', nombreUsuario)
      .single();

    if (error || !usuarios) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario o contraseña incorrectos.' 
      });
    }

    // Comparación directa de texto plano
    if (contrasena !== usuarios.contrasenia) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario o contraseña incorrectos.' 
      });
    }

    const token = makeToken(usuarios);
    const puesto = mapRol(usuarios.rol);
    
    return res.json({
      success: true,
      token,
      user: { 
        id: usuarios.id_usuario, 
        nombre: usuarios.nombre_completo, 
        puesto: puesto, 
        nombreUsuario: usuarios.nombre_completo 
      }
    });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
});

// ── Middleware de autenticación ───────────────────────────────────────────────
function requireAuth(req, res, next) {
  const user = verifyToken(req.headers['authorization']);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Acceso no autorizado. Inicia sesión.' });
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.puesto !== 'admin') {
    return res.status(403).json({ success: false, message: 'Acceso denegado. Solo administradores.' });
  }
  next();
}

// ── Rutas autenticadas ────────────────────────────────────────────────────────

// GET /me
app.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

// GET /usuarios (solo admin)
app.get('/usuarios', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('usuario')
      .select('*');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo usuarios:', err);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
});

// GET /campanias
app.get('/campanias', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campania')
      .select('*');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo campañas:', err);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
});

// GET /tiendas
app.get('/tiendas', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tienda')
      .select('*, cadena(*)');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo tiendas:', err);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
});

// GET /voluntarios
app.get('/voluntarios', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('voluntario')
      .select('*');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo voluntarios:', err);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
});

// GET /entidades
app.get('/entidades', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('entidad')
      .select('*');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo entidades:', err);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
});

// GET /turnos
app.get('/turnos', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('turno')
      .select('*, campania(*), tienda(*), entidad(*)');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo turnos:', err);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
});

// POST /usuarios (solo admin)
app.post('/usuarios', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('usuario')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error creando usuario:', err);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
});

// PUT /usuarios/:id (solo admin)
app.put('/usuarios/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('usuario')
      .update(req.body)
      .eq('id_usuario', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error actualizando usuario:', err);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
});

// DELETE /usuarios/:id (solo admin)
app.delete('/usuarios/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('usuario')
      .delete()
      .eq('id_usuario', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error eliminando usuario:', err);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
});

// POST /campanias
app.post('/campanias', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campania')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error creando campaña:', err);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
});

// POST /tiendas
app.post('/tiendas', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tienda')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error creando tienda:', err);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
});

// POST /entidades
app.post('/entidades', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('entidad')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error creando entidad:', err);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
});

// PUT /entidades/:id
app.put('/entidades/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('entidad')
      .update(req.body)
      .eq('id_entidad', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error actualizando entidad:', err);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
});

// DELETE /entidades/:id
app.delete('/entidades/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('entidad')
      .delete()
      .eq('id_entidad', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error eliminando entidad:', err);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
});

// POST /turnos
app.post('/turnos', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('turno')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error creando turno:', err);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
});

// GET /schedule (alias de turnos para compatibilidad)
app.get('/schedule', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('turno')
      .select('*, campania(*), tienda(*), entidad(*)');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error obteniendo schedule:', err);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
});

// POST /schedule
app.post('/schedule', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('turno')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error creando schedule:', err);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
});

// PUT /schedule/:id
app.put('/schedule/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('turno')
      .update(req.body)
      .eq('id_turno', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error actualizando schedule:', err);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
});

// DELETE /schedule/:id
app.delete('/schedule/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('turno')
      .delete()
      .eq('id_turno', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Error eliminando schedule:', err);
    res.status(500).json({ success: false, message: 'Error del servidor.' });
  }
});

// Ruta catch-all para SPA (sirve index.html para rutas no encontradas)
app.get('*', (req, res) => {
  const indexPath = process.env.NODE_ENV === 'development'
    ? '/src/index.html'
    : path.join(__dirname, '..', 'src', 'index.html');
  res.sendFile(indexPath);
});

// ── Arrancar servidor ─────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`   Frontend: http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/health`);
  console.log(`   Supabase: ${process.env.SUPABASE_URL ? '✅ Conectado' : '❌ No configurado'}\n`);
});
