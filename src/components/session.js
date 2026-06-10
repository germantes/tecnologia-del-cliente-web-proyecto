function getToken() {
  return sessionStorage.getItem('token')
}

function getPerfil() {
  return sessionStorage.getItem('perfil')
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
  getPerfil,
  getUsuario,
  estaAutenticado,
  getSesion,
  cerrarSesion,
  getAuthHeaders,
}