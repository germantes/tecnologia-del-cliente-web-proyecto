import { useEffect, useState } from 'react';
import { getAuthHeaders } from './session.js';
import CadenaCard from './CadenaCard.jsx';
import cardStyles from '../styles/card-display.module.css';
import cardReactStyles from '../styles/card-display-react.module.css';

function Cadenas() {
    const [cadenas, setCadenas] = useState([]);
    const [filter, setFilter] = useState('');
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
        window.location.href = `/edit/cadena?id=${cadena.id_cadena}`;
    };

    const handleCreate = () => {
        window.location.href = '/edit/cadena';
    };

    const filtered = cadenas.filter(cadena => {
        if (!filter) return true;
        const q = filter.toLowerCase();
        return (cadena.codigo_cadena || '').toLowerCase().includes(q)
            || (cadena.establecimiento || '').toLowerCase().includes(q)
            || (cadena.nombre_particular || '').toLowerCase().includes(q)
            || (cadena.empresa || '').toLowerCase().includes(q);
    });

    return (
        <div className={cardReactStyles['card-display-page']}>
        <main>
            <h1>Cadenas</h1>

            <form className="filter-form" onSubmit={e => e.preventDefault()}>
                <div className={cardReactStyles['filter-group']}>
                    <label htmlFor="filterSearch">Buscar:</label>
                    <input
                        type="text"
                        id="filterSearch"
                        placeholder="Buscar por código, establecimiento..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    />
                </div>
                <div className={cardReactStyles['filter-buttons']}>
                    <button type="reset" onClick={() => setFilter('')}>Limpiar</button>
                </div>
            </form>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <button onClick={handleCreate}>
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
                <div className={cardReactStyles['grid']}>
                    {filtered.map((cadena) => (
                        <CadenaCard
                            key={cadena.id_cadena}
                            cadena={cadena}
                            onEdit={handleEdit}
                        />
                    ))}
                </div>
            )}
        </main>
        </div>
    );
}

export default Cadenas;
