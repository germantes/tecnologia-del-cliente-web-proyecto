import { useEffect, useState } from 'react';
import {getAuthHeaders, getId, getPerfil} from './session.js';
import CadenaCard from './CadenaCard.jsx';
import cardStyles from '../styles/card-display.module.css';

function getNestedValue(obj, path) {
    return path.split('.').reduce((current, prop) => {
        if (current && typeof current === 'object') return current[prop];
        return undefined;
    }, obj);
}

function flattenData(data) {
    return data.map(item => {
        const flattened = {};
        function flatten(obj, prefix = '') {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const value = obj[key];
                    const newKey = prefix ? `${prefix}.${key}` : key;
                    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                        flatten(value, newKey);
                    } else {
                        flattened[newKey] = value;
                    }
                }
            }
        }
        flatten(item);
        return flattened;
    });
}

function exportToCSV(data, filename, columns = null) {
    if (!data || data.length === 0) {
        alert('No hay datos para exportar');
        return;
    }
    let columnsToExport = columns;
    if (!columnsToExport) {
        columnsToExport = Object.keys(data[0]).filter(key => !key.startsWith('_'));
    }
    const headers = columnsToExport.map(col => `"${col}"`).join(',');
    const rows = data.map(row =>
        columnsToExport.map(col => {
            let value = getNestedValue(row, col);
            if (value === null || value === undefined) value = '';
            value = String(value).replace(/"/g, '""');
            if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                value = `"${value}"`;
            }
            return value;
        }).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function Cadenas() {
    const [cadenas, setCadenas] = useState([]);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const rol = getPerfil();

    useEffect(() => {
        async function fetchCadenas() {
            const rol = getPerfil();
            const id = getId();
            try {
                let response;
                if (rol === "ADMINISTRADOR") {
                    response = await fetch('/api/cadenas', {
                        method: 'GET',
                        headers: getAuthHeaders(),
                    });
                } else {
                    response = await fetch(`/api/cadenas?idUsuario=${id}`, {
                        method: 'GET',
                        headers: getAuthHeaders(),
                    });
                }

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

    const handleExport = () => {
        const flatData = flattenData(filtered);
        const columns = ['codigo_cadena', 'establecimiento', 'nombre_particular', 'empresa'];
        const timestamp = new Date().toISOString().split('T')[0];
        exportToCSV(flatData, `cadenas_${timestamp}`, columns);
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
        <main className={cardStyles['page']}>
            <h1>Cadenas</h1>

            <form className={cardStyles['filter-form']} onSubmit={e => e.preventDefault()}>
                <div className={cardStyles['filter-group']}>
                    <label htmlFor="filterSearch">Buscar:</label>
                    <input
                        type="text"
                        id="filterSearch"
                        className={cardStyles['input']}
                        placeholder="Buscar por código, establecimiento..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    />
                </div>
                <div className={cardStyles['filter-buttons']}>
                    <button type="reset" className={cardStyles['btn']} onClick={() => setFilter('')}>Limpiar</button>
                    {rol === 'ADMINISTRADOR' && (
                        <button type="button" className={cardStyles['btn']} onClick={handleCreate}>Crear Cadena</button>
                    )}
                    <button type="button" className={cardStyles['btn']} onClick={handleExport}>Exportar</button>
                </div>
            </form>

            {loading && (
                <p style={{ color: 'var(--twilight-indigo)', marginTop: '1rem' }}>Cargando cadenas...</p>
            )}

            {error && (
                <p style={{ color: '#b00020', marginTop: '1rem' }}>Error: {error}</p>
            )}

            {!loading && !error && (
                <div className={cardStyles['grid']}>
                    {filtered.length === 0 ? (
                        <h1>No hay cadenas</h1>
                    ) : (
                        filtered.map((cadena) => (
                            <CadenaCard
                                key={cadena.id_cadena}
                                cadena={cadena}
                                onEdit={handleEdit}
                            />
                        ))
                    )}
                </div>
            )}
        </main>
    );
}

export default Cadenas;
