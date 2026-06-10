import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import '../styles/dashboard.css';
import '../styles/usuarios.css';

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

    // 1. Cargar datos generales al iniciar
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

    // 2. Cargar detalle granular
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

    // Función auxiliar para formatear los datos
    const dataGrafica = (datos, label, color) => ({
        labels: (datos || []).map(item => item.cp || item.nombre),
        datasets: [{ label: label, data: (datos || []).map(item => item.total), backgroundColor: color }]
    });

    // NUEVO: Opciones para forzar números enteros en el eje Y (sin 0,5)
    const opcionesEnteros = {
        scales: {
            y: {
                ticks: {
                    stepSize: 1, // Fuerza saltos de 1 en 1
                    precision: 0 // Elimina los decimales
                }
            }
        }
    };

    if (cargando) return <main className="dashboard-container"><h2 style={{textAlign:'center', padding:'40px'}}>Cargando estadísticas...</h2></main>;
    if (errorMensaje) return <main className="dashboard-container"><div className="error-banner">{errorMensaje}</div></main>;

    return (
        <>
            <include-html src="/componentes/header.html" active="dashboard"></include-html>

            <main className="dashboard-container">
                <header className="header-titulo" style={{ margin: 0, padding: '30px 0', backgroundColor: 'var(--twilight-indigo)', width: '100%' }}>
                    <h1 style={{ margin: 0, color: 'white', textAlign: 'center' }}>Cuadro de Mando</h1>
                </header>

                <div className="dashboard-content">

                    {/* SECCIÓN GENERALES AVANZADAS */}
                    <h2 style={{color: 'var(--twilight-indigo)'}}>Estadísticas Generales</h2>
                    <section className="stats-grid">
                        <div className="stat-card">
                            <h3>Tiendas por Zona</h3>
                            <Bar data={dataGrafica(statsGenerales.tiendasZona, 'Tiendas', '#58b9da')} options={opcionesEnteros} />
                        </div>
                        <div className="stat-card">
                            <h3>Usuarios por Zona</h3>
                            <Bar data={dataGrafica(statsGenerales.usuariosZona, 'Usuarios', '#323266')} options={opcionesEnteros} />
                        </div>
                        <div className="stat-card">
                            <h3>Entidades por Zona</h3>
                            <Bar data={dataGrafica(statsGenerales.entidadesZona, 'Entidades', '#ffb347')} options={opcionesEnteros} />
                        </div>
                        <div className="stat-card">
                            <h3>Top 10 Tiendas por Cadena</h3>
                            <Bar data={dataGrafica(statsGenerales.tiendasCadena, 'Tiendas', '#8e44ad')} options={opcionesEnteros} />
                        </div>
                        <div className="stat-card">
                            <h3>Tiendas por Campaña</h3>
                            <Bar data={dataGrafica(statsGenerales.tiendasCampania, 'Tiendas', '#27ae60')} options={opcionesEnteros} />
                        </div>
                        <div className="stat-card">
                            <h3>Top 10 Voluntarios por Entidad</h3>
                            <Bar data={dataGrafica(statsGenerales.voluntariosEntidad, 'Voluntarios', '#e74c3c')} options={opcionesEnteros} />
                        </div>
                    </section>

                    <hr style={{margin: '40px 0', borderColor: '#ddd'}}/>

                    {/* FILTROS Y GRANULARIDAD */}
                    <h2 style={{color: 'var(--twilight-indigo)', textAlign: 'center'}}>Estadísticas Específicas</h2>
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
                        <section className="stats-grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'}}>
                            <div className="stat-card">
                                <h2>Tiendas por CP</h2>
                                {statsGranulares.tiendasPorCp?.length > 0 ? <Bar data={dataGrafica(statsGranulares.tiendasPorCp, 'Tiendas', '#323266')} options={opcionesEnteros} /> : <p>Sin datos</p>}
                            </div>
                            <div className="stat-card">
                                <h2>Usuarios Implicados por CP</h2>
                                {statsGranulares.usuariosPorCp?.length > 0 ? <Bar data={dataGrafica(statsGranulares.usuariosPorCp, 'Usuarios', '#58b9da')} options={opcionesEnteros} /> : <p>Sin datos</p>}
                            </div>
                            <div className="stat-card">
                                <h2>Distribución de Roles</h2>
                                {statsGranulares.roles?.length > 0 ? <Bar data={dataGrafica(statsGranulares.roles, 'Usuarios', '#ffb347')} options={opcionesEnteros} /> : <p>Sin roles asignados</p>}
                            </div>
                        </section>
                    )}
                </div>
            </main>
        </>
    );
}