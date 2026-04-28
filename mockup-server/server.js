// server.js — Express + json-server combinados
// json-server gestiona /usuarios y /schedule
// Express gestiona /auth/login, /me, /health

const jsonServer = require('json-server');
const path = require('path');

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults({ noCors: true });

const PORT = 3000;

// ── Usuarios hardcoded (igual que el esqueleto original) ──────────────────────
const USERS = [
  { id: 1, nombreUsuario: 'admin', contrasena: 'admin123', puesto: 'admin', nombre: 'Hugo Moreno' },
  { id: 2, nombreUsuario: 'manager', contrasena: 'manager1', puesto: 'manager', nombre: 'Laura Sánchez' },
  { id: 3, nombreUsuario: 'ana', contrasena: 'worker1', puesto: 'worker', nombre: 'Ana García' },
  { id: 4, nombreUsuario: 'carlos', contrasena: 'worker2', puesto: 'worker', nombre: 'Carlos López' },
];

// Token simple base64 (MVP — no usar en producción)
function makeToken(user) {
  const payload = { id: user.id, nombreUsuario: user.nombreUsuario, puesto: user.puesto, nombre: user.nombre };
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

// ── CORS ──────────────────────────────────────────────────────────────────────
server.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Body parser (obligatorio antes de las rutas POST) ─────────────────────────
server.use(jsonServer.bodyParser);

// ── Rutas personalizadas ──────────────────────────────────────────────────────

// GET /health — público
server.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// POST /auth/login — público
server.post('/auth/login', (req, res) => {
  const { nombreUsuario, contrasena } = req.body || {};
  if (!nombreUsuario || !contrasena) {
    return res.status(400).json({ success: false, message: 'Faltan campos.' });
  }
  const user = USERS.find(u => u.nombreUsuario === nombreUsuario && u.contrasena === contrasena);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos.' });
  }
  const token = makeToken(user);
  return res.json({
    success: true,
    token,
    user: { id: user.id, nombre: user.nombre, puesto: user.puesto, nombreUsuario: user.nombreUsuario }
  });
});

// GET /me — autenticado
server.get('/me', (req, res) => {
  const user = verifyToken(req.headers['authorization']);
  if (!user) return res.status(401).json({ success: false, message: 'Token inválido.' });
  return res.json({ success: true, user });
});

// ── Middleware de autorización para rutas json-server ─────────────────────────
server.use((req, res, next) => {
  const isUsuarios = req.path.startsWith('/usuarios');
  const isEntidades = req.path.startsWith('/entidades');
  const isCampanias = req.path.startsWith('/campanias');
  const isTiendas = req.path.startsWith('/tiendas');
  const isTurnos = req.path.startsWith('/turnos');
  const isSchedule = req.path.startsWith('/schedule');


  if (!isUsuarios && !isSchedule && !isEntidades && !isCampanias && !isTiendas && !isTurnos) return next();

  const user = verifyToken(req.headers['authorization']);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Acceso no autorizado. Inicia sesión.' });
  }

  if (isUsuarios && user.puesto !== 'admin') {
    return res.status(403).json({ success: false, message: 'Acceso denegado. Solo administradores.' });
  }

  if (isSchedule && user.puesto === 'worker') {
    return res.status(403).json({ success: false, message: 'Acceso denegado.' });
  }

  next();
});

// ── json-server defaults + router ─────────────────────────────────────────────
server.use(middlewares);
server.use(router);

// ── Arrancar ──────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`   POST http://localhost:${PORT}/auth/login`);
  console.log(`   GET  http://localhost:${PORT}/usuarios    (solo admin)`);
  console.log(`   GET  http://localhost:${PORT}/schedule    (admin/manager)`);
  console.log(`   GET  http://localhost:${PORT}/health\n`);
});
