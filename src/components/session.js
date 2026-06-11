function getToken() {
  return sessionStorage.getItem('token')
}

/**
 * Intenta decodificar el JWT almacenado en sessionStorage.
 * Devuelve el payload parseado como objeto JSON si es válido, de lo contrario devuelve null.
 */
function getDecodedToken() {
  const token = getToken();
  
  if (!token) {
    return null;
  }

  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

function getPerfil() {
  const decodedToken = getDecodedToken();

  if (decodedToken && decodedToken.puesto) {
    // REQUISITO: Log de trazabilidad para éxito en React.
    console.log('Auth (React): Rol obtenido desde JWT. ¡Funcionaaaaa!');
    return decodedToken.puesto;
  }

  // REQUISITO: Log de advertencia para el fallback en React.
  console.warn('Auth (React): Fallo al decodificar JWT, usando fallback a mock-token.');
  return sessionStorage.getItem('perfil') || sessionStorage.getItem('rol');
}

function getUsuario() {
  const usuarioTexto = sessionStorage.getItem('usuario')

  if (!usuarioTexto) {
    return null
  }

  try {
    return JSON.parse(usuarioTexto)
  } catch (error) {
    return null
  }
}

function estaAutenticado() {
  return Boolean(getToken())
}

function getSesion() {
  return {
    token: getToken(),
    perfil: getPerfil(),
    usuario: getUsuario(),
  }
}

function cerrarSesion() {
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('perfil')
  sessionStorage.removeItem('usuario')
  sessionStorage.removeItem('rol')
}

function getAuthHeaders() {
  const token = getToken()

  if (!token) {
    return {
      'Content-Type': 'application/json',
    }
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export {
  getToken,
  getDecodedToken,
  getPerfil,
  getUsuario,
  estaAutenticado,
  getSesion,
  cerrarSesion,
  getAuthHeaders,
}