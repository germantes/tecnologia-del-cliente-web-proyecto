import { useEffect, useState } from 'react';
import { getAuthHeaders } from './session.js';
import CadenaCard from './CadenaCard.jsx';
import FormCadena from './FormCadena.jsx'; // Importar el nuevo formulario
import '../styles/card-display.css';
import '../styles/common.css';
import '../styles/tiendas.css';

function Cadenas() {
    const [cadenas, setCadenas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFormVisible, setIsFormVisible] = useState(false); // Estado para mostrar/ocultar el formulario

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

    // Función para añadir la nueva cadena a la lista y ocultar el formulario
    const handleCadenaCreated = (newCadena) => {
        setCadenas(prevCadenas => [...prevCadenas, newCadena]);
        setIsFormVisible(false);
    };

    if (isFormVisible) {
        return (
            <FormCadena 
                onClose={() => setIsFormVisible(false)}
                existingCadenas={cadenas}
                onCadenaCreated={handleCadenaCreated}
            />
        );
    }

    return (
        <main className="main" style={{padding: '2rem', flex: 1}}>
            <div className="page-header">
                <div>
                    <h1 id="tituloVista" className="page-title">Cadenas</h1>
                </div>
            </div>

            <div style={{ display: 'block', marginBottom: '2rem' }}>
                <button className="btn-crear" onClick={() => setIsFormVisible(true)}>
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
                <div className="tiendas-grid">
                    {cadenas.map((cadena) => (
                        <CadenaCard key={cadena.id_cadena} cadena={cadena}/>
                    ))}
                </div>
            )}
        </main>
    );
}

export default Cadenas;