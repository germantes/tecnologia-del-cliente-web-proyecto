// zones.js — Gestión de zonas

let allZones = [];

// Cargar zonas al iniciar
async function loadZones() {
  try {
    const data = await getZones();
    allZones = data.data || data;
    renderZones(allZones);
    populateZoneFilter();
  } catch (error) {
    console.error('Error al cargar zonas:', error);
    document.getElementById('container').innerHTML = '<p>Error al cargar las zonas</p>';
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
      </div>
    `;
  }).join('');
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

  const filtered = allZones.filter(zone => {
    const matchSearch = !searchFilter || 
      (zone.localidad && zone.localidad.toLowerCase().includes(searchFilter)) ||
      zone.cp.toLowerCase().includes(searchFilter);
    
    const zonaGeografica = zone.zona?.zona_geografica;
    const matchZone = !zoneFilter || zonaGeografica === zoneFilter;
    
    return matchSearch && matchZone;
  });

  renderZones(filtered);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadZones();

  // Filtros en tiempo real
  document.getElementById('filterSearch').addEventListener('input', filterZones);
  document.getElementById('filterZone').addEventListener('change', filterZones);

  // Limpiar filtros
  document.querySelector('form').addEventListener('reset', () => {
    setTimeout(filterZones, 0);
  });
});
