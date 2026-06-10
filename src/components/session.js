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
    // REQUISITO: split('.')[1] divide el token JWT en sus tres partes (Header, Payload, Signature)
    // usando el punto como separador. El índice [1] selecciona la segunda parte, que es el Payload.
    const base64Url = token.split('.')[1];
    
    // Si el token no tiene al menos dos partes (ej. es un mock-token antiguo), fallará aquí.
    if (!base64Url) return null;

    // REQUISITO: Reemplazo de caracteres. Base64Url (usado en JWT) es ligeramente distinto a Base64 estándar.
    // Base64Url usa '-' y '_' en lugar de '+' y '/' para que sea seguro pasarlo por URLs.
    // window.atob espera Base64 estándar, por lo que debemos revertir ese cambio.
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // REQUISITO: window.atob decodifica la cadena de Base64 a texto.
    // Sin embargo, atob no maneja bien caracteres Unicode (como tildes o la 'ñ' en nombres).
    // Para decodificar de forma segura y soportar caracteres especiales,
    // convertimos cada carácter decodificado a su representación URI codificada ('%xx')
    // y luego usamos decodeURIComponent para obtener el string UTF-8 real.
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );

    // Finalmente, parseamos el string JSON a un objeto JavaScript.
    return JSON.parse(jsonPayload);
  } catch (error) {
    // REQUISITO: El bloque try-catch es crucial aquí por varias razones de seguridad y robustez:
    // 1. El token podría no ser un JWT (ej. nuestro antiguo 'mock-token-123'). El split o el atob fallarían.
    // 2. El token podría estar malformado o corrupto en el almacenamiento.
    // 3. El payload decodificado podría no ser un JSON válido.
    // Si ocurre cualquier error, atrapamos la excepción silenciosamente y devolvemos null,
    // activando así el comportamiento de fallback.
    return null;
  }
}

function getPerfil() {
  // REQUISITO: Primero intentamos obtener la información desde el JWT decodificado
  const decodedToken = getDecodedToken();

  // Comprobamos si el token existe, pudo ser decodificado y tiene la propiedad 'puesto'
  // (Asumiendo que el backend envía 'puesto' como indicaste en el paso anterior)
  if (decodedToken && decodedToken.puesto) {
    return decodedToken.puesto;
  }

  // REQUISITO: Fallback para tokens antiguos. Si no hay JWT o no tiene el puesto, leemos del sessionStorage.
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
  // REQUISITO: Limpieza total del sessionStorage para garantizar que no queden datos huérfanos
  sessionStorage.removeItem('token')
  sessionStorage.removeItem('perfil')
  sessionStorage.removeItem('usuario')
  sessionStorage.removeItem('rol') // Limpiamos también 'rol' por si se usaba en alguna vista antigua
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