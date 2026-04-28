// Middleware para json-server: simula autenticación básica
// json-server no soporta JWT real, pero podemos simular el login

const USERS = [
  { id: 1, nombreUsuario: 'admin', contrasena: 'admin123', puesto: 'admin', nombre: 'Hugo Moreno' },
  { id: 2, nombreUsuario: 'manager', contrasena: 'manager1', puesto: 'manager', nombre: 'Laura Sánchez' },
  { id: 3, nombreUsuario: 'ana', contrasena: 'worker1', puesto: 'worker', nombre: 'Ana García' },
  { id: 4, nombreUsuario: 'carlos', contrasena: 'worker2', puesto: 'worker', nombre: 'Carlos López' },
];

// Token simple (base64 del usuario) — no usar en producción
function makeToken(user) {
  const payload = { id: user.id, nombreUsuario: user.nombreUsuario, puesto: user.puesto, nombre: user.nombre };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.slice(7);
    return JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

module.exports = (req, res, next) => {
  // Permitir CORS
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);

  // Ruta de login
  if (req.method === 'POST' && req.path === '/auth/login') {
    const { nombreUsuario, contrasena } = req.body;
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
  }

  // Ruta /me
  if (req.path === '/me') {
    const user = verifyToken(req.headers['authorization']);
    if (!user) return res.status(401).json({ success: false, message: 'Token inválido.' });
    return res.json({ success: true, user });
  }

  // Ruta /health
  if (req.path === '/health') {
    return res.json({ status: 'ok', time: new Date().toISOString() });
  }

  // Proteger rutas de datos (usuarios y schedule) — requieren token
  if (req.path.startsWith('/usuarios') || req.path.startsWith('/turnos') || req.path.startsWith('/tiendas') || req.path.startsWith('/schedule') || req.path.startsWith('/entidades')) {
    const user = verifyToken(req.headers['authorization']);
    if (!user) return res.status(401).json({ success: false, message: 'Acceso no autorizado. Inicia sesión.' });

    // Solo admin puede acceder a /usuarios
    if (req.path.startsWith('/usuarios') && user.puesto !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acceso denegado. Solo administradores.' });
    }

    // Los workers no tienen acceso a las rutas de gestión.
    const isWorker = user.puesto === 'worker';
    const isManagementRoute = req.path.startsWith('/schedule') || req.path.startsWith('/campanias') || req.path.startsWith('/turnos') || req.path.startsWith('/entidades') || req.path.startsWith('/tiendas');
    if (isWorker && isManagementRoute) {
      return res.status(403).json({ success: false, message: 'Acceso denegado.' });
    }
  }

  next();
};
