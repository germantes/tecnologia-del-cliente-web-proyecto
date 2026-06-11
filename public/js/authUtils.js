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
                // REQUISITO: Log de trazabilidad para éxito.
                console.log('Auth (Vanilla): Rol obtenido desde JWT.');
                return decoded.puesto.toUpperCase();
            } else {
                throw new Error('JWT válido, pero no contiene el campo "puesto".');
            }
        }

        // Si no tiene forma de JWT, intentar decodificar token simple (mockup-server usa base64 del payload)
        try {
            let tokenBase64 = token;
            // Añadir padding si falta
            while (tokenBase64.length % 4 !== 0) tokenBase64 += '=';
            const jsonPayload = atob(tokenBase64);
            const decoded = JSON.parse(jsonPayload);
            if (decoded && (decoded.puesto || decoded.rol || decoded.perfil)) {
                const puesto = decoded.puesto || decoded.rol || decoded.perfil;
                console.log('Auth (Vanilla): Rol obtenido desde token base64 (mock).');
                return String(puesto).toUpperCase();
            }
        } catch (err2) {
            // Si falla el parse del token base64, continuamos al fallback
        }

        // Lógica de fallback: leer directamente de sessionStorage.
        const rol = sessionStorage.getItem('perfil') || sessionStorage.getItem('rol');
        return rol ? rol.toUpperCase() : null;
    } catch (error) {
        console.warn('Auth (Vanilla): Fallo al decodificar token. Razón:', error.message);
        const rol = sessionStorage.getItem('perfil') || sessionStorage.getItem('rol');
        return rol ? rol.toUpperCase() : null;
    }
}

// Exponer la función en el objeto global 'window' para garantizar su disponibilidad
// desde cualquier script de la carpeta /public, independientemente del orden de carga.
window.obtenerRolDeToken = obtenerRolDeToken;

