import { useEffect, useState } from 'react';
import { getAuthHeaders } from './session.js';
import ZonaCard from './ZonaCard.jsx';
import cardStyles from '../styles/card-display.module.css';

function Zonas() {
    const [zonas, setZonas] = useState([]);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchZonas() {
            try {
                const response = await fetch('/api/cp', {
                    method: 'GET',
                    headers: getAuthHeaders(),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                setZonas(data);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        }
        fetchZonas();
    }, []);

    const handleEdit = (zona) => {
        window.location.href = `/edit/zona?cp=${zona.cp}`;
    };

    const handleCreate = () => {
        window.location.href = '/edit/zona';
    };

    const filtered = zonas.filter(zona => {
        if (!filter) return true;
        const q = filter.toLowerCase();
        const zonaGeo = zona.zona?.zona_geografica || zona.zona_geografica || '';
        return (zona.cp || '').toLowerCase().includes(q)
            || (zona.localidad || '').toLowerCase().includes(q)
            || (zona.distrito?.nombre_distrito || '').toLowerCase().includes(q)
            || zonaGeo.toLowerCase().includes(q);
    });

    return (
        <main className={cardStyles['page']}>
            <h1>Zonas</h1>

            <form className={cardStyles['filter-form']} onSubmit={e => e.preventDefault()}>
                <div className={cardStyles['filter-group']}>
                    <label htmlFor="filterSearch">Buscar:</label>
                    <input
                        type="text"
                        id="filterSearch"
                        className={cardStyles['input']}
                        placeholder="Buscar por CP, localidad, distrito, zona..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    />
                </div>
                <div className={cardStyles['filter-buttons']}>
                    <button type="reset" className={cardStyles['btn']} onClick={() => setFilter('')}>Limpiar</button>
                    <button type="button" className={cardStyles['btn']} onClick={handleCreate}>Crear Zona</button>
                </div>
            </form>

            {loading && (
                <p style={{ color: 'var(--twilight-indigo)', marginTop: '1rem' }}>Cargando zonas...</p>
            )}

            {error && (
                <p style={{ color: '#b00020', marginTop: '1rem' }}>Error: {error}</p>
            )}

            {!loading && !error && (
                <div className={cardStyles['grid']}>
                    {filtered.map((zona) => (
                        <ZonaCard
                            key={zona.cp}
                            zona={zona}
                            onEdit={handleEdit}
                        />
                    ))}
                </div>
            )}
        </main>
    );
}

export default Zonas;
