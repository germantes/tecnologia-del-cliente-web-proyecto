function getToken() {
  return sessionStorage.getItem('token')
}

function getDecodedToken() {
  const token = getToken();
  
  if (!token) {
    return null;
  }

  try {
    // Header.Payload.Signature (lo separamos para obtener payload)
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    // cambiar el formato de payload
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    const jsonPayload = decodeURIComponent(
        // primero se convierte en texto, y luego se corrige para caracteres especiales
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
    console.log('Auth (React): Rol obtenido desde JWT. Funcionaaaaa!');
    return decodedToken.puesto;
  }

  console.warn('Auth (React): Fallo al decodificar JWT');
  return null;
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

function getId() {
  const decodedToken = getDecodedToken();

  if (decodedToken && decodedToken.id) {
    return decodedToken.id;
  }

  console.warn('Fallo al decodificar JWT');
  return null;
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
  getId
}