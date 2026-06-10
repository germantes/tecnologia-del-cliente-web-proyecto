import { useEffect, useState } from 'react';
import { getAuthHeaders } from './session.js';
import CadenaCard from './CadenaCard.jsx';
import '../styles/card-display.css';
import '../styles/cadenas.css';

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

    const handleEdit = (cadena) => {
        // Redirigir a la página de edición React
        window.location.href = `/edit/cadena?id=${cadena.id_cadena}`;
    };

    const handleCreate = () => {
        // Redirigir a la página de creación React
        window.location.href = '/edit/cadena';
    };
// <main className="main" style={{padding: '2rem', flex: 1}}>
    return (
        <main>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Cadenas</h1>
                </div>
            </div>

            <div style={{ display: 'block', marginBottom: '2rem' }}>
                <button className="btn-crear" onClick={handleCreate}>
                    Crear Cadena
                </button>
            </div>

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
                <div className="cadenas-grid">
                    {cadenas.map((cadena) => (
                        <CadenaCard 
                            key={cadena.id_cadena} 
                            cadena={cadena}
                            onEdit={handleEdit}
                        />
                    ))}
                </div>
            )}
        </main>
    );
}

export default Cadenas;