// campaigns.js — Gestión de campañas

let allCampaigns = [];

// Cargar campañas al iniciar
async function loadCampaigns() {
  try {
    const data = await getCampanias();
    allCampaigns = data.data || data;
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
    <div class="card">
      <div class="brand">
        <h2>${campaign.nombre}</h2>
      </div>
      <div class="values">
        <div class="value">
          <p>ID:</p>
          <p>${campaign.id_campania}</p>
        </div>
        <div class="value">
          <p>Inicio:</p>
          <p>${formatDate(campaign.fecha_inicio)}</p>
        </div>
        <div class="value">
          <p>Fin:</p>
          <p>${formatDate(campaign.fecha_fin)}</p>
        </div>
        <div class="value">
          <p>Tipo:</p>
          <p>${campaign.tipo}</p>
        </div>
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
