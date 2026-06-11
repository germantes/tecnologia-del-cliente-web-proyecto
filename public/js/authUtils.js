/**
 * Fichero de utilidades de autenticación para la parte "legacy" (Vanilla JS) de la aplicación.
 */

/**
 * Obtiene el rol (puesto) del usuario de la sesión, priorizando la decodificación del JWT.
 * Si el token no es un JWT válido o no existe, intenta obtener el rol de la manera antigua
 * (leyendo 'perfil' o 'rol' de sessionStorage) para mantener la retrocompatibilidad.
 * 
 * @returns {string|null} El rol del usuario en mayúsculas o null si no se encuentra.
 */
function obtenerRolDeToken() {
    const token = sessionStorage.getItem('token');

    if (!token) {
        return null;
    }

    try {
        // Intentamos decodificar el token como JWT.
        // 1. Dividimos el token en sus 3 partes (header.payload.signature).
        // 2. Tomamos la segunda parte (el payload), que contiene los datos.
        const payloadBase64Url = token.split('.')[1];
        if (!payloadBase64Url) {
            throw new Error('Token no es un JWT válido (no tiene payload)');
        }

        // 3. Reemplazamos los caracteres específicos de Base64Url a Base64 estándar.
        const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
        
        // 4. Decodificamos de Base64 a un string JSON.
        const jsonPayload = atob(payloadBase64);
        
        // 5. Parseamos el string JSON a un objeto JavaScript.
        const decoded = JSON.parse(jsonPayload);

        // 6. Comprobamos que el payload decodificado contiene el campo 'puesto'.
        if (decoded && decoded.puesto) {
            // REQUISITO: Log de trazabilidad para éxito.
            console.log('Auth (Vanilla): Rol obtenido desde JWT. ¡Funcionaaaaa!');
            return decoded.puesto.toUpperCase();
        } else {
            throw new Error('JWT válido, pero no contiene el campo "puesto".');
        }
    } catch (error) {
        // REQUISITO: Si cualquier paso de la decodificación JWT falla, activamos el fallback.
        // Esto puede pasar si el token es un mock-token antiguo, está corrupto o malformado.
        console.warn('Auth (Vanilla): Fallo al decodificar JWT, usando fallback a mock-token. Razón:', error.message);
        
        // Lógica de fallback: leer directamente de sessionStorage.
        const rol = sessionStorage.getItem('perfil') || sessionStorage.getItem('rol');
        return rol ? rol.toUpperCase() : null;
    }
}
