// utilidades de autenticación para la parte "legacy" (Vanilla JS) de la aplicación.

function obtenerRolDeToken() {
    const token = sessionStorage.getItem('token');

    if (!token) {
        return null;
    }

    try {
        // Si el token parece un JWT (tiene 2 puntos), se procesa como JWT.
        if (token.indexOf('.') !== -1) {
            // Intentamos decodificar el token como JWT.
            // 1. Dividimos el token en sus 3 partes (header.payload.signature).
            // 2. Tomamos la segunda parte (el payload), que contiene los datos.
            const payloadBase64Url = token.split('.')[1];
            if (!payloadBase64Url) {
                throw new Error('Token no es un JWT válido (no tiene payload)');
            }

            // 3. Reemplazamos los caracteres específicos de Base64Url a Base64 estándar.
            let payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
            // Añadir padding si falta (base64 requiere longitud múltiplo de 4)
            while (payloadBase64.length % 4 !== 0) payloadBase64 += '=';

            // 4. Decodificamos de Base64 a un string JSON.
            const jsonPayload = atob(payloadBase64);

            // 5. Parseamos el string JSON a un objeto JavaScript.
            const decoded = JSON.parse(jsonPayload);

            // 6. Comprobamos que el payload decodificado contiene el campo 'puesto'.
            if (decoded && decoded.puesto) {
                // si fue bien:
                console.log('Auth (Vanilla): Rol obtenido desde JWT.');
                return decoded.puesto.toUpperCase();
            } else {
                throw new Error('JWT válido, pero no contiene el campo "puesto".');
            }
        }

    } catch (error) {
        console.warn('Auth (Vanilla): Fallo al decodificar token:', error.message);
        const rol = sessionStorage.getItem('perfil') || sessionStorage.getItem('rol');
        return rol ? rol.toUpperCase() : null;
    }
}

// Exponer la función en el objeto global 'window' para garantizar su disponibilidad
// desde cualquier script de la carpeta /public, independientemente del orden de carga.
window.obtenerRolDeToken = obtenerRolDeToken;

// Obtiene el token desde sessionStorage
function getToken() {
  return sessionStorage.getItem('token');
}

// Decodifica el payload del token soportando JWT (header.payload.signature)
// y también el mock base64 simple usado por el mockup-server.
function getDecodedToken() {
  const token = getToken();
  if (!token) return null;

  try {
    // JWT estándar: tiene dos puntos
    if (token.indexOf('.') !== -1) {
      const base64Url = token.split('.')[1];
      if (!base64Url) return null;
      let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4 !== 0) base64 += '='; // padding

      // Usar decodeURIComponent+atob para mantener UTF-8 correcto
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join('')
      );

      return JSON.parse(jsonPayload);
    }

    // Fallback: token formato base64 JSON (mockup-server)
    let t = token;
    while (t.length % 4 !== 0) t += '=';
    const jsonPayload = window.atob(t);
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.warn('getDecodedToken: fallo al decodificar token', err);
    return null;
  }
}

// Devuelve el perfil/puesto en mayúsculas si existe
function getPerfil() {
  const decoded = getDecodedToken();
  if (decoded) {
    const puesto = decoded.puesto || decoded.rol || decoded.perfil || null;
    return puesto ? String(puesto).toUpperCase() : null;
  }
  return null;
}

function getId() {
  const decoded = getDecodedToken();
  if (decoded && (decoded.id || decoded.id_usuario || decoded.userId)) {
    return decoded.id || decoded.id_usuario || decoded.userId;
  }
  return null;
}

function getNombre() {
  const decoded = getDecodedToken();
  if (decoded && (decoded.nombre || decoded.nombre_completo || decoded.name)) {
    return decoded.nombre || decoded.nombre_completo || decoded.name;
  }
  return null;
}

function estaAutenticado() {
  return Boolean(getToken());
}

function getSesion() {
  return {
    token: getToken(),
    perfil: getPerfil(),
    nombre: getNombre()
  };
}

function cerrarSesion() {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('perfil');
  sessionStorage.removeItem('usuario');
  sessionStorage.removeItem('rol');
}

function getAuthHeaders() {
  const token = getToken();
  if (!token) {
    return { 'Content-Type': 'application/json' };
  }
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// Exponer helpers en el global window para compatibilidad con scripts legacy
window.getToken = getToken;
window.getDecodedToken = getDecodedToken;
window.getPerfil = getPerfil;
window.estaAutenticado = estaAutenticado;
window.getSesion = getSesion;
window.cerrarSesion = cerrarSesion;
window.getAuthHeaders = getAuthHeaders;
window.getId = getId;
window.getNombre = getNombre;

// También agrupar bajo window.SESSION por conveniencia
window.SESSION = window.SESSION || {};
Object.assign(window.SESSION, {
  getToken,
  getDecodedToken,
  getPerfil,
  estaAutenticado,
  getSesion,
  cerrarSesion,
  getAuthHeaders,
  getId,
  getNombre
});

