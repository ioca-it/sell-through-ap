// Contrato Product normalizado. Ningún nombre físico de una fuente pertenece
// a este módulo; fechas y precios se adaptan al contrato histórico del motor.

import { normalizeFechaStr } from '../../utils/dateUtils.js';

const normalizeText = (value) => (
  value === null || value === undefined ? '' : String(value).trim()
);

const normalizeDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizePrice = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  if (typeof value === 'boolean') return null;
  const price = Number(value);
  return Number.isFinite(price) ? price : null;
};

export const isAvailablePrice = (value) => (
  typeof value === 'number' && Number.isFinite(value)
);

export const multiplyPrice = (price, quantity) => (
  isAvailablePrice(price) && typeof quantity === 'number' && Number.isFinite(quantity)
    ? price * quantity
    : null
);

export const subtractPrices = (left, right) => (
  isAvailablePrice(left) && isAvailablePrice(right) ? left - right : null
);

export const sumPriceValues = (values) => {
  let total = 0;
  for (const value of values) {
    if (!isAvailablePrice(value)) return null;
    total += value;
  }
  return total;
};

export const normalizeProduct = (product = {}) => {
  const fechaStrSource = Object.prototype.hasOwnProperty.call(product, 'fechaStr')
    ? product.fechaStr
    : product.discontinuationDate;
  return Object.freeze({
    sku: normalizeText(product.sku),
    productName: normalizeText(product.productName),
    brand: normalizeText(product.brand),
    category: normalizeText(product.category),
    discontinuationDate: normalizeDate(product.discontinuationDate),
    fechaStr: normalizeFechaStr(fechaStrSource),
    creationDate: normalizeDate(product.creationDate),
    level: normalizeText(product.level),
    status: normalizeText(product.status),
    imageUrl: normalizeText(product.imageUrl),
    productUrl: normalizeText(product.productUrl),
    priceUSA: normalizePrice(product.priceUSA),
    priceChina: normalizePrice(product.priceChina),
  });
};

export const isProduct = (product) => (
  product !== null
  && typeof product === 'object'
  && !Array.isArray(product)
  && typeof product.sku === 'string'
  && product.sku !== ''
  && typeof product.productName === 'string'
  && typeof product.brand === 'string'
  && typeof product.category === 'string'
  && (product.discontinuationDate === null || product.discontinuationDate instanceof Date)
  && typeof product.fechaStr === 'string'
  && (product.creationDate === null || product.creationDate instanceof Date)
  && typeof product.level === 'string'
  && typeof product.status === 'string'
  && typeof product.imageUrl === 'string'
  && typeof product.productUrl === 'string'
  && (product.priceUSA === null || isAvailablePrice(product.priceUSA))
  && (product.priceChina === null || isAvailablePrice(product.priceChina))
);

// Adapta Product al contrato legado consumido por Record Assembler sin cambiar
// las reglas existentes de status, categorías, fechas o costos.
export const productToMasterRecord = (product) => {
  const normalized = normalizeProduct(product);
  const rawStatus = normalized.status.toUpperCase();
  return Object.freeze({
    sku: normalized.sku,
    marca: normalized.brand.toUpperCase(),
    modelo: normalized.productName,
    categoria: normalized.category.toUpperCase() || '—',
    estado: rawStatus === 'EOL' || rawStatus === 'DESCONTINUADO' ? 'EOL' : 'ACTIVO',
    fecha: normalized.discontinuationDate,
    fechaStr: normalized.fechaStr,
    creationDate: normalized.creationDate,
    level: normalized.level,
    imageUrl: normalized.imageUrl,
    productUrl: normalized.productUrl,
    costoUSA: normalized.priceUSA,
    costoCHINA: normalized.priceChina,
  });
};

export const masterRecordToProduct = (masterRecord) => normalizeProduct({
  sku: masterRecord.sku,
  productName: masterRecord.modelo,
  brand: masterRecord.marca,
  category: masterRecord.categoria === '—' ? '' : masterRecord.categoria,
  discontinuationDate: masterRecord.fecha,
  fechaStr: masterRecord.fechaStr,
  creationDate: masterRecord.creationDate,
  level: masterRecord.level,
  status: masterRecord.estado,
  imageUrl: masterRecord.imageUrl,
  productUrl: masterRecord.productUrl,
  priceUSA: masterRecord.costoUSA,
  priceChina: masterRecord.costoCHINA,
});

export const indexProductsBySku = (products) => {
  if (!Array.isArray(products)) {
    throw new Error('Product: el Maestro normalizado debe ser un arreglo.');
  }

  return products.reduce((index, product) => {
    const normalized = normalizeProduct(product);
    if (!isProduct(normalized)) {
      throw new Error('Product: el Maestro contiene un Product inválido.');
    }
    index[normalized.sku] = productToMasterRecord(normalized);
    return index;
  }, {});
};
