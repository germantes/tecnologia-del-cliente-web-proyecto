import { useEffect } from 'react';
import { getAuthHeaders } from './session.js';

function Cadenas() {
    useEffect(() => {
        async function fetchCadenas() {
            try {
                const response = await fetch('/api/cadenas', {
                    method: 'GET',
                    headers: getAuthHeaders(),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('Cadenas:', data);
            } catch (error) {
                console.error("Could not fetch cadenas:", error);
            }
        }
        fetchCadenas();
    }, []); // Empty dependency array means this effect runs once on mount

    return (
        <main className="bancosol-main" style={{ padding: '2rem', flex: 1 }}>
            <h1>Cadenas</h1>
            <p>Página de gestión de cadenas.</p>
        </main>
    )
}

export default Cadenas;