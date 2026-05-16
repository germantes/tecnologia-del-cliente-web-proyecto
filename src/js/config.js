// config.js — Configuración de la aplicación

// Obtener la URL de la API desde variables de entorno o usar la por defecto
const API_URL = window.API_URL || 'http://localhost:3000';

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API_URL };
}
