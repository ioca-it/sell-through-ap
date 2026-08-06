// =============================================================================
// Propósito: interpretar el texto actual del Maestro de Productos.
// Responsabilidad: detectar columnas, aplicar aliases/defaults y normalizar SKU.
// Dependencias: utilidades puras de encabezados y fechas; no accede a fuentes.
// Preparación IA: contrato explícito para cambios revisables y caracterizables.
// Preparación Dataverse: desacopla el formato de entrada sin asumir entidades.
// =============================================================================

import { parseFecha } from '../../utils/dateUtils.js';
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

// Convierte el costo textual y conserva cero para entradas vacías o inválidas.
const parseCosto = (value) => {
  if (!value) return 0;
  const clean = String(value).replace(/\$/g, '').replace(/,/g, '').trim();
  const number = parseFloat(clean);
  return isNaN(number) ? 0 : number;
};

// Devuelve el Maestro indexado por SKU; el último duplicado reemplaza al anterior.
export const parseMaster = (rawMaster) => {
  const lines = rawMaster.trim().split('\n').filter((line) => line.trim());
  const headers = lines[0].split(/\t|,|;/).map((header) => normalizeHeader(header));
  const columns = {
    marca: findColumn(headers, 'marca'),
    sku: findColumn(headers, 'sku'),
    modelo: findColumn(headers, 'modelos', 'modelo', 'nombre', 'descripcion'),
    categoria: findColumn(headers, 'categorias', 'categoria', 'category', 'cat'),
    fecha: findColumn(headers, 'fechadescontinuacion', 'fechaeol', 'fecha'),
    estado: findColumn(headers, 'estado', 'status'),
    usa: findColumn(headers, 'usa', 'exwmia'),
    china: findColumn(headers, 'china'),
  };

  if (columns.sku < 0) {
    return {
      masterBySku: null,
      error: "El Maestro necesita columna 'SKU'. Detecté: " + lines[0],
    };
  }

  const masterBySku = {};
  lines.slice(1).forEach((line) => {
    const values = line.split(/\t|,|;/).map((value) => value.trim());
    const sku = (values[columns.sku] || '').trim();
    if (!sku) return;

    const rawStatus = columns.estado >= 0
      ? (values[columns.estado] || '').trim().toUpperCase()
      : 'ACTIVO';
    const estado = rawStatus === 'EOL' || rawStatus === 'DESCONTINUADO' ? 'EOL' : 'ACTIVO';
    const fechaStr = columns.fecha >= 0 ? (values[columns.fecha] || '').trim() : '';
    const fecha = estado === 'EOL' ? parseFecha(fechaStr) : null;
    const rawCategory = (columns.categoria >= 0 ? values[columns.categoria] : '')
      .trim()
      .toUpperCase();

    masterBySku[sku] = {
      sku,
      marca: (columns.marca >= 0 ? values[columns.marca] : '').trim().toUpperCase(),
      modelo: (columns.modelo >= 0 ? values[columns.modelo] : '').trim(),
      categoria: rawCategory || 'SIN CATEGORIA',
      estado,
      fecha,
      fechaStr: fechaStr === '-' ? '' : fechaStr,
      costoUSA: columns.usa >= 0 ? parseCosto(values[columns.usa]) : 0,
      costoCHINA: columns.china >= 0 ? parseCosto(values[columns.china]) : 0,
    };
  });

  return { masterBySku, error: null };
};
