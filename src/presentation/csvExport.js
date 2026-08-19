import { getSafeHttpUrl } from '../utils/safeUrl.js';
import { isAvailablePrice } from '../domain/product/product.js';
import { metricDefinitionsAsRows } from './metricDefinitions.js';

const escapeCsvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const serializeCsvRows = (rows) => rows
  .map((row) => row.map(escapeCsvCell).join(','))
  .join('\r\n');

const nullableFixed = (value, digits = 2) => (
  isAvailablePrice(value) ? value.toFixed(digits) : ''
);

export const SELL_THROUGH_CSV_HEADERS = Object.freeze([
  'SKU', 'Tienda', 'Modelo', 'Marca', 'Estado', 'Fecha EOL', 'Dias Desc',
  'Bucket', 'Fase', 'Origen', 'Costo USD', 'Inv Inicial', 'Compra', 'Ventas',
  'Inv Proyectado', 'Inv Final', 'Porcentaje de Rotación', 'Necesidad',
  'Reposición Final', 'Valor Inventario', 'Valor Ventas', 'Valor Reposición',
  'Desc %', 'Desc Consumi $', 'Aporte IOCA %', 'Aporte IOCA $',
  'Aporte Retail %', 'Aporte Retail $', 'Desc Total $', 'Producto URL', 'Imagen URL',
]);

export const buildSellThroughCsv = (resultados) => {
  const rows = resultados.recs.map((record) => [
    record.sku,
    record.tienda,
    record.modelo,
    record.marca,
    record.estado,
    record.fechaStr,
    record.diasDesc ?? '',
    record.bucket ?? '',
    record.fase ?? '',
    record.origen,
    nullableFixed(record.costo),
    record.invInicial,
    record.compra,
    record.ventas,
    record.invProyectado,
    record.invFinal,
    isAvailablePrice(record.porcentajeRotacion)
      ? `${record.porcentajeRotacion.toFixed(0)}%`
      : '',
    record.necesidadReposicion,
    record.reposicionSugerida,
    nullableFixed(record.valorInv),
    nullableFixed(record.valorVentas),
    nullableFixed(record.valorReposicion),
    `${((record.descPct ?? 0) * 100).toFixed(0)}%`,
    nullableFixed(record.descUSD),
    `${((record.ioaPct ?? 0) * 100).toFixed(0)}%`,
    nullableFixed(record.ioaUSD),
    `${((record.retailPct ?? 0) * 100).toFixed(0)}%`,
    nullableFixed(record.retailUSD),
    nullableFixed(record.descTotal),
    getSafeHttpUrl(record.productUrl) ?? '',
    getSafeHttpUrl(record.imageUrl) ?? '',
  ]);

  return serializeCsvRows([SELL_THROUGH_CSV_HEADERS, ...rows]);
};

export const buildDefinitionsCsv = () => serializeCsvRows([
  ['Indicador/Campo', 'Definición', 'Fórmula', 'Unidad', 'Fuente', 'Interpretación'],
  ...metricDefinitionsAsRows(),
]);
