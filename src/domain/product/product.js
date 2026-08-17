// Contrato Product normalizado. Ningún nombre físico de una fuente pertenece
// a este módulo; fechas y precios se adaptan al contrato histórico del motor.

const normalizeText = (value) => (
  value === null || value === undefined ? '' : String(value).trim()
);

const normalizeDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizePrice = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const price = Number(value);
  return Number.isFinite(price) ? price : 0;
};

export const normalizeProduct = (product = {}) => Object.freeze({
  sku: normalizeText(product.sku),
  productName: normalizeText(product.productName),
  brand: normalizeText(product.brand),
  category: normalizeText(product.category),
  discontinuationDate: normalizeDate(product.discontinuationDate),
  creationDate: normalizeDate(product.creationDate),
  level: normalizeText(product.level),
  status: normalizeText(product.status),
  imageUrl: normalizeText(product.imageUrl),
  productUrl: normalizeText(product.productUrl),
  priceUSA: normalizePrice(product.priceUSA),
  priceChina: normalizePrice(product.priceChina),
});

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
  && (product.creationDate === null || product.creationDate instanceof Date)
  && typeof product.level === 'string'
  && typeof product.status === 'string'
  && typeof product.imageUrl === 'string'
  && typeof product.productUrl === 'string'
  && typeof product.priceUSA === 'number'
  && Number.isFinite(product.priceUSA)
  && typeof product.priceChina === 'number'
  && Number.isFinite(product.priceChina)
);

const toIsoDate = (value) => (
  value instanceof Date && !Number.isNaN(value.getTime())
    ? value.toISOString().slice(0, 10)
    : ''
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
    fechaStr: toIsoDate(normalized.discontinuationDate),
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
