import { useEffect, useState } from 'react';
import { getAuthHeaders } from './session.js';
import CampaniaCard from './CampaniaCard.jsx';
import cardStyles from '../styles/card-display.module.css';

function Campanias() {
    const [campanias, setCampanias] = useState([]);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchCampanias() {
            try {
                const response = await fetch('/api/campanias', {
                    method: 'GET',
                    headers: getAuthHeaders(),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                setCampanias(data);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        }
        fetchCampanias();
    }, []);

    const handleEdit = (campania) => {
        window.location.href = `/edit/campania?id=${campania.id_campania}`;
    };

    const handleCreate = () => {
        window.location.href = '/edit/campania';
    };

    const filtered = campanias.filter(campania => {
        if (!filter) return true;
        const q = filter.toLowerCase();
        return (campania.nombre || '').toLowerCase().includes(q)
            || (campania.tipo || '').toLowerCase().includes(q);
    });

    return (
        <main className={cardStyles['page']}>
            <h1>Campañas</h1>

            <form className={cardStyles['filter-form']} onSubmit={e => e.preventDefault()}>
                <div className={cardStyles['filter-group']}>
                    <label htmlFor="filterSearch">Buscar:</label>
                    <input
                        type="text"
                        id="filterSearch"
                        className={cardStyles['input']}
                        placeholder="Buscar por nombre, tipo..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    />
                </div>
                <div className={cardStyles['filter-buttons']}>
                    <button type="reset" className={cardStyles['btn']} onClick={() => setFilter('')}>Limpiar</button>
                    <button type="button" className={cardStyles['btn']} onClick={handleCreate}>Crear Campaña</button>
                </div>
            </form>

            {loading && (
                <p style={{ color: 'var(--twilight-indigo)', marginTop: '1rem' }}>Cargando campañas...</p>
            )}

            {error && (
                <p style={{ color: '#b00020', marginTop: '1rem' }}>Error: {error}</p>
            )}

            {!loading && !error && (
                <div className={cardStyles['grid']}>
                    {filtered.map((campania) => (
                        <CampaniaCard
                            key={campania.id_campania}
                            campania={campania}
                            onEdit={handleEdit}
                        />
                    ))}
                </div>
            )}
        </main>
    );
}

export default Campanias;
