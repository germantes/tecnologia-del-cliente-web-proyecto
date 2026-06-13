import { useEffect, useState } from 'react';
import { getAuthHeaders, getPerfil } from './session.js';
import ZonaCard from './ZonaCard.jsx';
import cardStyles from '../styles/card-display.module.css';

function getNestedValue(obj, path) {
    return path.split('.').reduce((current, prop) => {
        if (current && typeof current === 'object') {
            return current[prop];
        }
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

function Zonas() {
    const [zonas, setZonas] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [zonesByCampaign, setZonesByCampaign] = useState({});
    const [campaignsWithZones, setCampaignsWithZones] = useState(new Set());
    const [filter, setFilter] = useState('');
    const [campaignFilter, setCampaignFilter] = useState('');
    const [zoneFilter, setZoneFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const [zonesRes, campaignsRes] = await Promise.all([
                    fetch('/api/cp', { headers: getAuthHeaders() }),
                    fetch('/api/campanias', { headers: getAuthHeaders() }),
                ]);

                if (!zonesRes.ok) throw new Error(`HTTP error! status: ${zonesRes.status}`);

                const zonesData = await zonesRes.json();
                const campaignsData = campaignsRes.ok ? await campaignsRes.json() : [];

                setZonas(zonesData);
                setCampaigns(campaignsData);

                const zonesByCamp = {};
                const withZones = new Set();

                for (const campaign of campaignsData) {
                    try {
                        const res = await fetch(`/api/zonas_por_campania?idCampania=${campaign.id_campania}`, {
                            headers: getAuthHeaders(),
                        });
                        if (res.ok) {
                            const data = await res.json();
                            const zoneIds = data.map(z => z.id_zona);
                            zonesByCamp[campaign.id_campania] = zoneIds;
                            if (zoneIds.length > 0) {
                                withZones.add(campaign.id_campania);
                            }
                        }
                    } catch (e) {
                        console.warn(`Error cargando zonas para campaña ${campaign.id_campania}:`, e);
                        zonesByCamp[campaign.id_campania] = [];
                    }
                }

                setZonesByCampaign(zonesByCamp);
                setCampaignsWithZones(withZones);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const uniqueZones = [...new Set(
        zonas
            .map(z => z.zona?.zona_geografica || z.zona_geografica)
            .filter(Boolean)
    )].sort();

    const campaignsWithZonesList = campaigns
        .filter(c => campaignsWithZones.has(c.id_campania))
        .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    const filtered = zonas.filter(zona => {
        const q = filter.toLowerCase();
        const matchSearch = !q ||
            (zona.cp || '').toLowerCase().includes(q) ||
            (zona.localidad || '').toLowerCase().includes(q);

        const zonaGeografica = zona.zona?.zona_geografica || zona.zona_geografica || '';
        const matchZone = !zoneFilter || zonaGeografica === zoneFilter;

        let matchCampaign = !campaignFilter;
        if (campaignFilter && zonesByCampaign[campaignFilter]) {
            matchCampaign = zona.id_zona && zonesByCampaign[campaignFilter].includes(zona.id_zona);
        }

        return matchSearch && matchZone && matchCampaign;
    });

    const handleExport = () => {
        const flatData = flattenData(filtered);
        const columns = ['cp', 'localidad', 'distrito.nombre_distrito', 'zona.zona_geografica'];
        const timestamp = new Date().toISOString().split('T')[0];
        exportToCSV(flatData, `zonas_${timestamp}`, columns);
    };

    const handleEdit = (zona) => {
        window.location.href = `/edit/zona?cp=${zona.cp}`;
    };

    const handleCreate = () => {
        window.location.href = '/edit/zona';
    };

    const perfil = getPerfil();

    return (
        <main>
            <h1>Zonas</h1>

            <form className={cardStyles['filter-form']} onSubmit={e => e.preventDefault()}>
                <div className={cardStyles['filter-group']}>
                    <label htmlFor="filterSearch">Buscar:</label>
                    <input
                        type="text"
                        id="filterSearch"
                        placeholder="Buscar por localidad o CP..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    />
                </div>

                <div className={cardStyles['filter-group']}>
                    <label htmlFor="filterCampaign">Campaña:</label>
                    <select
                        id="filterCampaign"
                        value={campaignFilter}
                        onChange={e => setCampaignFilter(e.target.value)}
                    >
                        <option value="">Todas las campañas</option>
                        {campaignsWithZonesList.map(c => (
                            <option key={c.id_campania} value={c.id_campania}>{c.nombre}</option>
                        ))}
                    </select>
                </div>

                <div className={cardStyles['filter-group']}>
                    <label htmlFor="filterZone">Zona:</label>
                    <select
                        id="filterZone"
                        value={zoneFilter}
                        onChange={e => setZoneFilter(e.target.value)}
                    >
                        <option value="">Todas las zonas</option>
                        {uniqueZones.map(z => (
                            <option key={z} value={z}>{z}</option>
                        ))}
                    </select>
                </div>

                <div className={cardStyles['filter-buttons']}>
                    <button type="reset" onClick={() => { setFilter(''); setCampaignFilter(''); setZoneFilter(''); }}>Limpiar</button>
                    <button type="button" onClick={handleCreate}>Crear Zona</button>
                    <button type="button" onClick={handleExport}>Exportar</button>
                </div>
            </form>

            {loading && <p>Cargando zonas...</p>}
            {error && <p>Error: {error}</p>}
            {!loading && !error && filtered.length === 0 && <p>No hay zonas disponibles</p>}
            {!loading && !error && filtered.length > 0 && (
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
