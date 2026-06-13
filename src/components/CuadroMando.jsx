import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

// 1. Importación del CSS normal
import '../styles/cuadro_mando.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function CuadroMando() {
    const [statsGenerales, setStatsGenerales] = useState({});
    const [statsGranulares, setStatsGranulares] = useState({ tiendasPorCp: [], usuariosPorCp: [], roles: [] });
    const [campanas, setCampanas] = useState([]);
    const [zonas, setZonas] = useState([]);

    const [selectedCampana, setSelectedCampana] = useState('');
    const [selectedZona, setSelectedZona] = useState('');

    const [cargando, setCargando] = useState(true);
    const [errorMensaje, setErrorMensaje] = useState(null);

    const API_BASE = window.API_URL || 'http://localhost:3000';
    const token = sessionStorage.getItem('token');

    useEffect(() => {
        let ignore = false;

        const fetchInicial = async () => {
            try {
                const headers = { 'Authorization': `Bearer ${token}` };

                const endpoints = [
                    'tiendas-por-zona', 'usuarios-por-zona',
                    'entidades-por-zona', 'tiendas-por-cadena',
                    'tiendas-por-campania', 'voluntarios-por-entidad'
                ];

                const promesas = endpoints.map(ep => fetch(`${API_BASE}/api/stats/${ep}`, { headers }).then(res => res.json()));
                const [pTiendasZ, pUsZ, pEntZ, pTienCad, pTienCam, pVolEnt] = await Promise.all(promesas);

                const resCampanas = await fetch(`${API_BASE}/api/campanias`, { headers }).then(res => res.json());
                const resZonas = await fetch(`${API_BASE}/api/zonas`, { headers }).then(res => res.json());

                if (!ignore) {
                    setStatsGenerales({
                        tiendasZona: pTiendasZ, usuariosZona: pUsZ, entidadesZona: pEntZ,
                        tiendasCadena: pTienCad, tiendasCampania: pTienCam, voluntariosEntidad: pVolEnt
                    });
                    setCampanas(Array.isArray(resCampanas) ? resCampanas : []);
                    setZonas(Array.isArray(resZonas) ? resZonas : []);
                    setCargando(false);
                }
            } catch (error) {
                if (!ignore) { setErrorMensaje("Error de conexión. Verifica el servidor."); setCargando(false); }
            }
        };
        fetchInicial();
        return () => { ignore = true; };
    }, []);

    useEffect(() => {
        if (selectedCampana && selectedZona) {
            fetch(`${API_BASE}/api/stats/detalle-granular?idCampania=${selectedCampana}&idZona=${selectedZona}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => setStatsGranulares(data))
                .catch(err => alert("Error cargando detalle granular."));
        }
    }, [selectedCampana, selectedZona]);

    const dataGrafica = (datos, label, color) => ({
        labels: (datos || []).map(item => item.cp || item.nombre),
        datasets: [{ label: label, data: (datos || []).map(item => item.total), backgroundColor: color }]
    });

    const opcionesEnteros = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: { ticks: { stepSize: 1, precision: 0 } }
        }
    };

    // Vistas de carga y error utilizando las clases estándar
    if (cargando) return <main className="dashboard-main"><div className="dashboard-spinner"></div></main>;
    if (errorMensaje) return <main className="dashboard-main"><div className="error-banner">{errorMensaje}</div></main>;

    return (
        <main className="dashboard-main">
            <div className="dashboard-contenedor">
                <header className="dashboard-header">
                    <h1>Cuadro de Mando</h1>
                </header>

                <div style={{ padding: '40px' }}>
                    <h2 style={{color: '#323266', textAlign: 'center', marginBottom: '30px'}}>Estadísticas Generales</h2>

                    <section className="graficas-grid">
                        <div className="grafica-card">
                            <h3>Tiendas por Zona</h3>
                            <div className="grafica-wrapper"><Bar data={dataGrafica(statsGenerales.tiendasZona, 'Tiendas', '#58b9da')} options={opcionesEnteros} /></div>
                        </div>
                        <div className="grafica-card">
                            <h3>Usuarios por Zona</h3>
                            <div className="grafica-wrapper"><Bar data={dataGrafica(statsGenerales.usuariosZona, 'Usuarios', '#323266')} options={opcionesEnteros} /></div>
                        </div>
                        <div className="grafica-card">
                            <h3>Entidades por Zona</h3>
                            <div className="grafica-wrapper"><Bar data={dataGrafica(statsGenerales.entidadesZona, 'Entidades', '#ffb347')} options={opcionesEnteros} /></div>
                        </div>
                        <div className="grafica-card">
                            <h3>Top 10 Tiendas por Cadena</h3>
                            <div className="grafica-wrapper"><Bar data={dataGrafica(statsGenerales.tiendasCadena, 'Tiendas', '#8e44ad')} options={opcionesEnteros} /></div>
                        </div>
                        <div className="grafica-card">
                            <h3>Tiendas por Campaña</h3>
                            <div className="grafica-wrapper"><Bar data={dataGrafica(statsGenerales.tiendasCampania, 'Tiendas', '#27ae60')} options={opcionesEnteros} /></div>
                        </div>
                        <div className="grafica-card">
                            <h3>Top 10 Voluntarios por Entidad</h3>
                            <div className="grafica-wrapper"><Bar data={dataGrafica(statsGenerales.voluntariosEntidad, 'Voluntarios', '#e74c3c')} options={opcionesEnteros} /></div>
                        </div>
                    </section>

                    <hr style={{margin: '40px 0', borderColor: '#e0e0e0'}}/>

                    <h2 style={{color: '#323266', textAlign: 'center', marginBottom: '30px'}}>Estadísticas Específicas</h2>

                    <section className="filter-section">
                        <select className="filter-select" value={selectedCampana} onChange={(e) => { setSelectedCampana(e.target.value); setSelectedZona(''); }}>
                            <option value="">-- Selecciona una Campaña --</option>
                            {campanas.map(c => <option key={c.id_campania || c.id} value={c.id_campania || c.id}>{c.nombre}</option>)}
                        </select>
                        <select className="filter-select" value={selectedZona} onChange={(e) => setSelectedZona(e.target.value)} disabled={!selectedCampana}>
                            <option value="">-- Selecciona una Zona --</option>
                            {zonas.map(z => <option key={z.id_zona || z.id} value={z.id_zona || z.id}>{z.zona_geografica || z.nombre}</option>)}
                        </select>
                    </section>

                    {(selectedCampana && selectedZona) && (
                        <section className="graficas-grid">
                            <div className="grafica-card">
                                <h3>Tiendas por CP</h3>
                                {statsGranulares.tiendasPorCp?.length > 0 ? <div className="grafica-wrapper"><Bar data={dataGrafica(statsGranulares.tiendasPorCp, 'Tiendas', '#323266')} options={opcionesEnteros} /></div> : <p style={{textAlign: 'center', marginTop: '50px'}}>Sin datos</p>}
                            </div>
                            <div className="grafica-card">
                                <h3>Usuarios Implicados por CP</h3>
                                {statsGranulares.usuariosPorCp?.length > 0 ? <div className="grafica-wrapper"><Bar data={dataGrafica(statsGranulares.usuariosPorCp, 'Usuarios', '#58b9da')} options={opcionesEnteros} /></div> : <p style={{textAlign: 'center', marginTop: '50px'}}>Sin datos</p>}
                            </div>
                            <div className="grafica-card">
                                <h3>Distribución de Roles</h3>
                                {statsGranulares.roles?.length > 0 ? <div className="grafica-wrapper"><Bar data={dataGrafica(statsGranulares.roles, 'Usuarios', '#ffb347')} options={opcionesEnteros} /></div> : <p style={{textAlign: 'center', marginTop: '50px'}}>Sin roles asignados</p>}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </main>
    );
}