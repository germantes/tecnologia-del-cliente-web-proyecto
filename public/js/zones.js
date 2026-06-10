// zones.js — Gestión de zonas

let allZones = [];
let allCampaigns = [];
let zonesByCampaign = {}; // Mapeo de campaña -> zonas
let campaignsWithZones = new Set(); // IDs de campañas que tienen zonas asignadas
let editingZone = null;

// Cargar zonas y campañas al iniciar
async function loadZones() {
  try {
    const data = await getZones();
    allZones = data.data || data;
    
    const campaigns = await getCampanias();
    allCampaigns = campaigns.data || campaigns;
    
    // Cargar relaciones de zonas por campaña
    await loadZonesByCampaign();
    
    renderZones(allZones);
    populateCampaignFilter();
    populateZoneFilter();
  } catch (error) {
    console.error('Error al cargar zonas:', error);
    document.getElementById('container').innerHTML = '<p>Error al cargar las zonas</p>';
  }
}

// Cargar zonas para cada campaña
async function loadZonesByCampaign() {
  for (const campaign of allCampaigns) {
    try {
      const zonesData = await getZonesByCompany(campaign.id_campania);
      zonesByCampaign[campaign.id_campania] = zonesData.map(z => z.id_zona);
      
      // Si la campaña tiene zonas asignadas, agregarla al set
      if (zonesData.length > 0) {
        campaignsWithZones.add(campaign.id_campania);
      }
    } catch (error) {
      console.warn(`Error cargando zonas para campaña ${campaign.id_campania}:`, error);
      zonesByCampaign[campaign.id_campania] = [];
    }
  }
}

// Renderizar zonas en el grid
function renderZones(zones) {
  const container = document.getElementById('container');
  
  if (zones.length === 0) {
    container.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No hay zonas disponibles</p>';
    return;
  }

  container.innerHTML = zones.map(zone => {
    // Extraer valores de las relaciones anidadas
    const nombreDistrito = zone.distrito?.nombre_distrito || '-';
    const zonaGeografica = zone.zona?.zona_geografica || '-';
    
    return `
      <div class="card">
        <div class="brand">
          <h2>${zone.cp}</h2>
        </div>
        <div class="values">
          <div class="value">
            <p>Localidad:</p>
            <p>${zone.localidad || '-'}</p>
          </div>
          <div class="value">
            <p>Distrito:</p>
            <p>${nombreDistrito}</p>
          </div>
          <div class="value">
            <p>Zona Geográfica:</p>
            <p>${zonaGeografica}</p>
          </div>
        </div>
        <div class="card-actions" style="padding: 15px; text-align: center;">
          <button class="btn-editar" type="button" onclick="openEditModal('${zone.cp}')">Editar</button>
        </div>
      </div>
    `;
  }).join('');
}

// Abrir modal de edición
function openEditModal(zoneId) {
  // Redirigir a la página de edición React
  window.location.href = `/edit/zona?id=${zoneId}`;
}

// Llenar el select de campañas dinámicamente (solo las que tienen zonas asignadas)
function populateCampaignFilter() {
  const campaignSelect = document.getElementById('filterCampaign');
  if (!campaignSelect) return;
  
  const currentValue = campaignSelect.value;
  
  campaignSelect.innerHTML = '<option value="">Todas las campañas</option>';
  
  // Filtrar campañas que tienen zonas asignadas y ordenarlas por nombre
  allCampaigns
    .filter(campaign => campaignsWithZones.has(campaign.id_campania))
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
    .forEach(campaign => {
      const option = document.createElement('option');
      option.value = campaign.id_campania;
      option.textContent = campaign.nombre;
      campaignSelect.appendChild(option);
    });

  campaignSelect.value = currentValue;
}

// Llenar el select de zonas dinámicamente
function populateZoneFilter() {
  const zones = new Set();
  allZones.forEach(zone => {
    const zonaGeografica = zone.zona?.zona_geografica;
    if (zonaGeografica) zones.add(zonaGeografica);
  });

  const zoneSelect = document.getElementById('filterZone');
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

// Filtrar zonas
function filterZones() {
  const searchFilter = document.getElementById('filterSearch').value.toLowerCase();
  const zoneFilter = document.getElementById('filterZone').value;
  const campaignFilter = document.getElementById('filterCampaign')?.value || '';

  const filtered = allZones.filter(zone => {
    const matchSearch = !searchFilter || 
      (zone.localidad && zone.localidad.toLowerCase().includes(searchFilter)) ||
      zone.cp.toLowerCase().includes(searchFilter);
    
    const zonaGeografica = zone.zona?.zona_geografica;
    const matchZone = !zoneFilter || zonaGeografica === zoneFilter;
    
    // Filtrar por campaña si está seleccionada
    let matchCampaign = !campaignFilter;
    if (campaignFilter && zonesByCampaign[campaignFilter]) {
      const zoneId = zone.id_zona;
      matchCampaign = zoneId && zonesByCampaign[campaignFilter].includes(zoneId);
    }
    
    return matchSearch && matchZone && matchCampaign;
  });

  renderZones(filtered);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadZones();

  // Filtros en tiempo real
  document.getElementById('filterSearch').addEventListener('input', filterZones);
  document.getElementById('filterZone').addEventListener('change', filterZones);
  document.getElementById('filterCampaign')?.addEventListener('change', filterZones);

  // Limpiar filtros
  document.querySelector('form').addEventListener('reset', () => {
    setTimeout(filterZones, 0);
  });

  // Exportar a CSV
  document.getElementById('exportBtn').addEventListener('click', exportZonesCSV);
});
