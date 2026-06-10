import { useEffect } from 'react';

export default function RutaProtegida({ children }) {
    const token = sessionStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            // Redirección forzada fuera del ecosistema de React
            window.location.href = '/html/index.html';
        }
    }, [token]);

    // Si no hay token, devolvemos null para que la pantalla se quede en blanco
    // una fracción de segundo mientras el navegador cambia a index.html
    if (!token) return null;

    // Si hay token, renderizamos la página hija con normalidad
    return children;
}