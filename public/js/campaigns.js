// campaigns.js — Gestión de campañas

let allCampaigns = [];

// Cargar campañas al iniciar
async function loadCampaigns() {
  try {
    const campaigns = await getCampanias();
    allCampaigns = campaigns.data || campaigns;
    
    renderCampaigns(allCampaigns);
    populateYearFilter();
  } catch (error) {
    console.error('Error al cargar campañas:', error);
    document.getElementById('container').innerHTML = '<p>Error al cargar las campañas</p>';
  }
}

// Renderizar campañas en el grid
function renderCampaigns(campaigns) {
  const container = document.getElementById('container');
  
  if (campaigns.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No hay campañas disponibles</p>';
    return;
  }

  container.innerHTML = campaigns.map(campaign => `
    <div class="cadena-card">
      <h3 class="titulo-cadena">${campaign.nombre}</h3>
      
      <p><strong>Fecha de inicio: </strong>${formatDate(campaign.fecha_inicio)}</p>
      <p><strong>Fecha del fin: </strong>${formatDate(campaign.fecha_fin)}</p>
      <p><strong>Tipo: </strong>${campaign.tipo}</p>
      
      <div class="botones-card">
          <a href="/#">
              <button class="btn-editar" type="button">Editar</button>
          </a>
      </div>
    </div>
  `).join('');
}

// Formatear fecha
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES');
}

// Extraer año de una fecha
function getYear(dateString) {
  if (!dateString) return null;
  return new Date(dateString).getFullYear().toString();
}

// Llenar el select de años dinámicamente
function populateYearFilter() {
  const years = new Set();
  allCampaigns.forEach(campaign => {
    const year = getYear(campaign.fecha_inicio);
    if (year) years.add(year);
  });

  const yearSelect = document.getElementById('filterYear');
  const currentValue = yearSelect.value;
  
  // Limpiar opciones excepto la primera
  yearSelect.innerHTML = '<option value="">Todos los años</option>';
  
  // Agregar años ordenados
  Array.from(years).sort().forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });

  yearSelect.value = currentValue;
}

// Llenar el select de zonas dinámicamente
function populateZoneFilter() {
  const zones = new Set();
  allZones.forEach(zone => {
    const zonaGeografica = zone.zona?.zona_geografica;
    if (zonaGeografica) zones.add(zonaGeografica);
  });

  const zoneSelect = document.getElementById('filterZone');
  if (!zoneSelect) return;
  
  const currentValue = zoneSelect.value;
  
  // Limpiar opciones excepto la primera
  zoneSelect.innerHTML = '<option value="">Todas las zonas</option>';
  
  // Agregar zonas ordenadas
  Array.from(zones).sort().forEach(zone => {
    const option = document.createElement('option');
    option.value = zone;
    option.textContent = zone;
    zoneSelect.appendChild(option);
  });

  zoneSelect.value = currentValue;
}

// Filtrar campañas
function filterCampaigns() {
  const nameFilter = document.getElementById('filterName').value.toLowerCase();
  const yearFilter = document.getElementById('filterYear').value;

  const filtered = allCampaigns.filter(campaign => {
    const matchName = campaign.nombre.toLowerCase().includes(nameFilter);
    const matchYear = !yearFilter || getYear(campaign.fecha_inicio) === yearFilter;
    return matchName && matchYear;
  });

  renderCampaigns(filtered);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadCampaigns();

  // Filtros en tiempo real
  document.getElementById('filterName').addEventListener('input', filterCampaigns);
  document.getElementById('filterYear').addEventListener('change', filterCampaigns);

  // Limpiar filtros
  document.querySelector('form').addEventListener('reset', () => {
    setTimeout(filterCampaigns, 0);
  });

  // Exportar a CSV
  document.getElementById('exportBtn').addEventListener('click', exportCampaignsCSV);
});
