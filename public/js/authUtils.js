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

