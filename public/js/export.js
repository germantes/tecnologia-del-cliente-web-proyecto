// export.js — Funcionalidad genérica de exportación a CSV

/**
 * Exporta datos a CSV
 * @param {Array} data - Array de objetos a exportar
 * @param {String} filename - Nombre del archivo CSV
 * @param {Array} columns - Array de nombres de columnas a incluir (opcional, usa todas si no se especifica)
 */
function exportToCSV(data, filename, columns = null) {
  if (!data || data.length === 0) {
    alert('No hay datos para exportar');
    return;
  }

  // Determinar columnas a exportar
  let columnsToExport = columns;
  if (!columnsToExport) {
    // Si no se especifican columnas, usar todas las del primer objeto
    columnsToExport = Object.keys(data[0]).filter(key => !key.startsWith('_'));
  }

  // Crear encabezados
  const headers = columnsToExport.map(col => `"${col}"`).join(',');

  // Crear filas
  const rows = data.map(row => {
    return columnsToExport.map(col => {
      let value = getNestedValue(row, col);
      
      // Manejar valores nulos/undefined
      if (value === null || value === undefined) {
        value = '';
      }
      
      // Convertir a string y escapar comillas
      value = String(value).replace(/"/g, '""');
      
      // Envolver en comillas si contiene comas, saltos de línea o comillas
      if (value.includes(',') || value.includes('\n') || value.includes('"')) {
        value = `"${value}"`;
      }
      
      return value;
    }).join(',');
  });

  // Combinar encabezados y filas
  const csv = [headers, ...rows].join('\n');

  // Crear blob y descargar
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

/**
 * Obtiene un valor anidado de un objeto usando notación de punto
 * @param {Object} obj - Objeto del que extraer el valor
 * @param {String} path - Ruta del valor (ej: "zona.zona_geografica")
 * @returns {*} El valor encontrado o undefined
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, prop) => {
    if (current && typeof current === 'object') {
      return current[prop];
    }
    return undefined;
  }, obj);
}

/**
 * Aplanador de objetos anidados para exportación
 * Convierte objetos anidados en propiedades planas
 * @param {Array} data - Array de objetos con propiedades anidadas
 * @returns {Array} Array con objetos aplanados
 */
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

/**
 * Exporta datos filtrados de zonas a CSV
 * Se debe llamar desde zones.js
 */
function exportZonesCSV() {
  if (typeof allZones === 'undefined') {
    alert('Error: datos de zonas no disponibles');
    return;
  }

  // Obtener datos filtrados (los que se muestran actualmente)
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

  // Aplanar datos para mejor exportación
  const flatData = flattenData(filtered);

  // Definir columnas a exportar en orden
  const columns = ['cp', 'localidad', 'distrito.nombre_distrito', 'zona.zona_geografica'];

  // Exportar
  const timestamp = new Date().toISOString().split('T')[0];
  exportToCSV(flatData, `zonas_${timestamp}`, columns);
}

/**
 * Exporta datos filtrados de campañas a CSV
 * Se debe llamar desde campaigns.js
 */
function exportCampaignsCSV() {
  if (typeof allCampaigns === 'undefined') {
    alert('Error: datos de campañas no disponibles');
    return;
  }

  // Obtener datos filtrados (los que se muestran actualmente)
  const nameFilter = document.getElementById('filterName').value.toLowerCase();
  const yearFilter = document.getElementById('filterYear').value;

  const filtered = allCampaigns.filter(campaign => {
    const matchName = campaign.nombre.toLowerCase().includes(nameFilter);
    const matchYear = !yearFilter || new Date(campaign.fecha_inicio).getFullYear().toString() === yearFilter;
    return matchName && matchYear;
  });

  // Definir columnas a exportar en orden
  const columns = ['id_campania', 'nombre', 'fecha_inicio', 'fecha_fin', 'tipo'];

  // Exportar
  const timestamp = new Date().toISOString().split('T')[0];
  exportToCSV(filtered, `campanias_${timestamp}`, columns);
}
