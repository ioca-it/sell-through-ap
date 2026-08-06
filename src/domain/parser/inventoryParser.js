// =============================================================================
// Propósito: interpretar el texto actual del Inventario del Cliente.
// Responsabilidad: validar columnas, aplicar aliases/defaults y normalizar filas.
// Dependencias: normalización pura de encabezados; no accede a fuentes ni React.
// Preparación IA: expone entradas normalizadas para ensamblaje determinista.
// Preparación Dataverse: separa el formato físico sin asumir tablas o columnas.
// =============================================================================

import { normalizeHeader } from '../../utils/headerUtils.js';

// Conserva la prioridad vigente: todos los aliases exactos antes de los parciales.
const findColumn = (headers, ...keywords) => {
  for (const keyword of keywords) {
    const index = headers.findIndex((header) => header === keyword);
    if (index >= 0) return index;
  }
  for (const keyword of keywords) {
    const index = headers.findIndex((header) => header.includes(keyword));
    if (index >= 0) return index;
  }
  return -1;
};

// Conserva el parser entero tolerante que elimina caracteres no numéricos.
const parseIntSafe = (value) =>
  parseInt(String(value || '0').replace(/[^\d-]/g, '')) || 0;

// Devuelve una fila por registro de Inventario y conserva SKU duplicados.
export const parseInventory = (rawInventory) => {
  const lines = rawInventory.trim().split('\n').filter((line) => line.trim());
  const headers = lines[0].split(/\t|,|;/).map((header) => normalizeHeader(header));
  const columns = {
    tienda: findColumn(headers, 'tienda', 'cuenta', 'sucursal'),
    codigo: findColumn(headers, 'codigo', 'codigocliente'),
    ean13: findColumn(headers, 'ean13', 'ean'),
    sku: findColumn(headers, 'sku'),
    marca: findColumn(headers, 'marca'),
    tier: findColumn(headers, 'tier'),
    eol: findColumn(headers, 'eol'),
    nombre: findColumn(headers, 'nombre', 'modelo', 'descripcion'),
    origenInv: findColumn(headers, 'origen'),
    invSeguridad: findColumn(headers, 'inventarioseguridad', 'invseguridad', 'safetystock'),
    invInicial: findColumn(headers, 'invinicial', 'inventarioinicial'),
    compra: findColumn(headers, 'compra', 'compras', 'recibido'),
    ventas: findColumn(headers, 'ventas', 'sales'),
    invProyectado: findColumn(headers, 'invproyectado', 'inventarioproyectado', 'proyectado'),
    invFinal: findColumn(headers, 'invfinal', 'inventariofinal', 'final'),
  };

  if (columns.sku < 0) {
    return {
      inventoryRecords: null,
      error: "El Inventario necesita columna 'SKU'. Detecté: " + lines[0],
    };
  }
  if (columns.invFinal < 0) {
    return {
      inventoryRecords: null,
      error: "El Inventario necesita columna 'Inv Final' o equivalente.",
    };
  }

  const inventoryRecords = [];
  lines.slice(1).forEach((line) => {
    const values = line.split(/\t|,|;/).map((value) => value.trim());
    const sku = (values[columns.sku] || '').trim();
    if (!sku) return;

    inventoryRecords.push({
      sku,
      tienda: columns.tienda >= 0 ? (values[columns.tienda] || 'N/A').trim() : 'N/A',
      codigo: columns.codigo >= 0 ? (values[columns.codigo] || '').trim() : '',
      ean13: columns.ean13 >= 0 ? (values[columns.ean13] || '').trim() : '',
      nombreInv: columns.nombre >= 0 ? (values[columns.nombre] || '').trim() : '',
      tier: columns.tier >= 0 ? (values[columns.tier] || '').trim().toUpperCase() : '',
      eolInvRaw: columns.eol >= 0 ? (values[columns.eol] || '').trim().toUpperCase() : '',
      origenInv: columns.origenInv >= 0
        ? (values[columns.origenInv] || '').trim().toUpperCase()
        : '',
      invSeguridad: columns.invSeguridad >= 0 ? parseIntSafe(values[columns.invSeguridad]) : 0,
      invInicial: columns.invInicial >= 0 ? parseIntSafe(values[columns.invInicial]) : 0,
      compra: columns.compra >= 0 ? parseIntSafe(values[columns.compra]) : 0,
      ventas: columns.ventas >= 0 ? parseIntSafe(values[columns.ventas]) : 0,
      invProyectadoDisponible: columns.invProyectado >= 0,
      invProyectadoInformado: columns.invProyectado >= 0
        ? parseIntSafe(values[columns.invProyectado])
        : 0,
      invFinal: parseIntSafe(values[columns.invFinal]),
    });
  });

  return { inventoryRecords, error: null };
};
