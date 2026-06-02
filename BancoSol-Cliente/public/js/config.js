// Detecta automáticamente el dominio en el que se encuentra la aplicación
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.API_URL = "http://localhost:3000";
} else {
    window.API_URL = window.location.origin;
}
