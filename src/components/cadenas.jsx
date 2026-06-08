import { useEffect, useState } from 'react';
import { getAuthHeaders } from './session.js';
import CadenaCard from './CadenaCard.jsx';
import '../styles/card-display.css';
import '../styles/common.css';

import '../styles/tiendas.css'

function Cadenas() {
    const [cadenas, setCadenas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                setCadenas(data);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        }
        fetchCadenas();
    }, []);

    return (
        <main className="main" style={{ padding: '2rem', flex: 1 }}>
            <h1>Cadenas</h1>
            
            {loading && (
                <div className="loading">
                    <span className="spinner"></span> Cargando cadenas...
                </div>
            )}
            
            {error && (
                <div className="alert alert-error">
                    Error: {error}
                </div>
            )}
            
            {!loading && !error && (
                <div className="tiendas-grid">
                    {cadenas.map((cadena) => (
                        <CadenaCard key={cadena.id_cadena} cadena={cadena} />
                    ))}
                </div>
            )}
        </main>
    )
}

export default Cadenas;