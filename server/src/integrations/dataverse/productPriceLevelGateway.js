// Frontera runtime que conoce productpricelevels y sus LogicalNames. Este
// gateway devuelve el contrato Product y no publica campos auxiliares.

import { DATAVERSE_FORMATTED_VALUE_ANNOTATION } from './dataverseClient.js';
import { quoteODataString } from './odata.js';

const PRODUCT_SOURCE = Object.freeze({
  entitySet: 'productpricelevels',
  fields: Object.freeze({
    brand: 'crbbe_nombremarca',
    sku: 'crbbe_sku',
    productName: 'crbbe_nombreproducto',
    category: 'crbbe_nombrecategoria',
    discontinuationDate: 'crbbe_validohasta',
    creationDate: 'crbbe_validodesde',
    level: 'crbbe_clasificacioncomercial',
    status: 'crbbe_etapa',
    imageUrl: 'crbbe_imagenproducto',
    productUrl: 'crbbe_urlproducto',
    aplicaMasterPack: 'crbbe_aplicaamasterpack',
    cantidadMasterPack: 'crbbe_cantidadenmasterpack',
    aplicaInnerPack: 'crbbe_aplicaainnerpack',
    cantidadInnerPack: 'crbbe_cantidadinnerpack',
    amount: 'amount',
    origin: 'crbbe_origen',
    companyName: 'crbbe_nombrecompania',
    buyerCompany: 'crbbe_companiacompradora',
  }),
});

const ALLOWED_BUYER_COMPANIES = Object.freeze([
  'IOCA USA INC',
  'SAND SPORTS, CORP.',
]);
const ALLOWED_BUYER_COMPANY_SET = new Set(ALLOWED_BUYER_COMPANIES);
const FORMATTED_FIELDS = Object.freeze(['level', 'status']);

const formattedProperty = (field) => (
  `${PRODUCT_SOURCE.fields[field]}@${DATAVERSE_FORMATTED_VALUE_ANNOTATION}`
);

const normalizeText = (value) => (
  value === null || value === undefined ? '' : String(value).trim()
);

const compareBrands = (left, right) => (
  left.localeCompare(right, 'es', { sensitivity: 'variant' })
  || (left < right ? -1 : left > right ? 1 : 0)
);

const normalizeDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

// Las fechas válidas se comparan por instante canónico. Si Dataverse entrega
// texto no vacío inválido, se conserva trimmed solo para detectar divergencias,
// sin publicarlo ni volver equivalentes artificialmente dos valores distintos.
const comparableDate = (value) => {
  const text = normalizeText(value);
  if (!text) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? text : date.toISOString();
};

const normalizeAmount = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};

const normalizeNullableBoolean = (value) => (
  value === true || value === false ? value : null
);

const normalizePackQuantity = (value) => {
  if (value === null || value === undefined || typeof value === 'boolean') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const quantity = Number(value);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
};

// Si el campo es Choice solo se publica la etiqueta formateada. El valor fuente
// se usa como fallback únicamente cuando ya es texto, nunca como código numérico.
const readableValue = (row, field) => {
  const formatted = normalizeText(row[formattedProperty(field)]);
  if (formatted) return formatted;
  const raw = row[PRODUCT_SOURCE.fields[field]];
  if (typeof raw !== 'string') return '';
  const text = raw.trim();
  return text && !/^-?\d+$/.test(text) ? text : '';
};

export const mapProductPriceLevelRow = (row = {}) => Object.freeze({
  sku: normalizeText(row[PRODUCT_SOURCE.fields.sku]),
  productName: normalizeText(row[PRODUCT_SOURCE.fields.productName]),
  brand: normalizeText(row[PRODUCT_SOURCE.fields.brand]),
  category: normalizeText(row[PRODUCT_SOURCE.fields.category]),
  discontinuationDate: normalizeDate(row[PRODUCT_SOURCE.fields.discontinuationDate]),
  creationDate: normalizeDate(row[PRODUCT_SOURCE.fields.creationDate]),
  level: readableValue(row, 'level'),
  status: readableValue(row, 'status'),
  imageUrl: normalizeText(row[PRODUCT_SOURCE.fields.imageUrl]),
  productUrl: normalizeText(row[PRODUCT_SOURCE.fields.productUrl]),
  aplicaMasterPack: normalizeNullableBoolean(row[PRODUCT_SOURCE.fields.aplicaMasterPack]),
  cantidadMasterPack: normalizePackQuantity(row[PRODUCT_SOURCE.fields.cantidadMasterPack]),
  aplicaInnerPack: normalizeNullableBoolean(row[PRODUCT_SOURCE.fields.aplicaInnerPack]),
  cantidadInnerPack: normalizePackQuantity(row[PRODUCT_SOURCE.fields.cantidadInnerPack]),
  amount: normalizeAmount(row[PRODUCT_SOURCE.fields.amount]),
  origin: normalizeText(row[PRODUCT_SOURCE.fields.origin]).toUpperCase(),
  buyerCompany: normalizeText(row[PRODUCT_SOURCE.fields.buyerCompany]),
});

export class ProductMasterConflictError extends Error {
  constructor(conflicts) {
    super('El Maestro Producto contiene valores en conflicto que requieren definición funcional.');
    this.name = 'ProductMasterConflictError';
    this.code = 'PRODUCT_MASTER_CONFLICT';
    this.statusCode = 409;
    this.conflicts = Object.freeze(conflicts.map((conflict) => Object.freeze(conflict)));
  }
}

const PRODUCT_ATTRIBUTE_FIELDS = Object.freeze([
  'productName',
  'brand',
  'category',
  'discontinuationDate',
  'level',
  'status',
  'imageUrl',
  'productUrl',
  'aplicaMasterPack',
  'cantidadMasterPack',
  'aplicaInnerPack',
  'cantidadInnerPack',
]);

const createProduct = (row) => ({
  sku: row.sku,
  productName: row.productName,
  brand: row.brand,
  category: row.category,
  discontinuationDate: row.discontinuationDate,
  creationDate: null,
  level: row.level,
  status: row.status,
  imageUrl: row.imageUrl,
  productUrl: row.productUrl,
  aplicaMasterPack: row.aplicaMasterPack,
  cantidadMasterPack: row.cantidadMasterPack,
  aplicaInnerPack: row.aplicaInnerPack,
  cantidadInnerPack: row.cantidadInnerPack,
  priceUSA: null,
  priceChina: null,
});

const matchesCommercialCompany = (rawRow, buyerCompany) => (
  ALLOWED_BUYER_COMPANY_SET.has(buyerCompany)
  && normalizeText(rawRow[PRODUCT_SOURCE.fields.companyName]) === buyerCompany
);

const hasValidOrigin = (row) => row.origin !== '';

const isCommercialRow = (rawRow, row) => (
  matchesCommercialCompany(rawRow, row.buyerCompany)
  && hasValidOrigin(row)
  && row.sku
);

// Latest Product record = MAX(crbbe_validodesde) por SKU + origen + comprador. Todos
// los registros empatados en el máximo permanecen para que los conflictos
// incompatibles sigan visibles sin inventar una segunda precedencia.
const selectLatestRowsBySkuOriginBuyer = (rows) => {
  const groups = new Map();
  rows.forEach((rawRow) => {
    const row = mapProductPriceLevelRow(rawRow);
    if (!isCommercialRow(rawRow, row)) return;

    const key = `${row.sku}|${row.origin}|${row.buyerCompany}`;
    const current = groups.get(key);
    if (!current) {
      groups.set(key, { latestValidFrom: row.creationDate, rows: [{ rawRow, row }] });
      return;
    }

    if (current.latestValidFrom === null) {
      if (row.creationDate === null) current.rows.push({ rawRow, row });
      else groups.set(key, { latestValidFrom: row.creationDate, rows: [{ rawRow, row }] });
      return;
    }
    if (row.creationDate === null) return;
    if (row.creationDate > current.latestValidFrom) {
      groups.set(key, { latestValidFrom: row.creationDate, rows: [{ rawRow, row }] });
      return;
    }
    if (row.creationDate === current.latestValidFrom) current.rows.push({ rawRow, row });
  });
  return [...groups.values()].flatMap((group) => group.rows);
};

const addAmount = (amounts, key, amount, context) => {
  if (amount === null) return;
  if (!amounts.has(key)) amounts.set(key, { values: new Set(), context });
  amounts.get(key).values.add(amount);
};

const findAmountConflicts = (amounts, scope) => (
  [...amounts.values()]
    .filter(({ values }) => values.size > 1)
    .map(({ values, context }) => ({
      ...context,
      conflictType: 'PRICE',
      scope,
      values: Object.freeze([...values].sort((a, b) => a - b)),
    }))
    .sort((left, right) => (
      `${left.sku}|${left.origin}|${left.buyerCompany || ''}`
        .localeCompare(`${right.sku}|${right.origin}|${right.buyerCompany || ''}`)
    ))
);

const comparableAttributeValue = (rawRow, row, field) => {
  if (field === 'discontinuationDate') {
    return comparableDate(rawRow[PRODUCT_SOURCE.fields[field]]);
  }
  return row[field];
};

const addAttributeValues = (attributesBySku, rawRow, row) => {
  if (!attributesBySku.has(row.sku)) attributesBySku.set(row.sku, new Map());
  const attributes = attributesBySku.get(row.sku);
  PRODUCT_ATTRIBUTE_FIELDS.forEach((field) => {
    const value = comparableAttributeValue(rawRow, row, field);
    if (value === null || value === undefined || value === '') return;
    if (!attributes.has(field)) attributes.set(field, new Set());
    attributes.get(field).add(value);
  });
};

const findAttributeConflicts = (attributesBySku) => (
  [...attributesBySku.entries()]
    .flatMap(([sku, attributes]) => (
      [...attributes.entries()]
        .filter(([, values]) => values.size > 1)
        .map(([field, values]) => ({
          conflictType: 'ATTRIBUTE',
          scope: 'SKU_ATTRIBUTE',
          sku,
          field,
          values: Object.freeze([...values].sort((left, right) => (
            String(left).localeCompare(String(right))
          ))),
        }))
    ))
    .sort((left, right) => (
      `${left.sku}|${left.field}`.localeCompare(`${right.sku}|${right.field}`)
    ))
);

export const consolidateProductPriceLevelRows = (rows) => {
  if (!Array.isArray(rows)) {
    throw new Error('ProductPriceLevelGateway: Dataverse debe devolver un arreglo.');
  }

  const products = new Map();
  const amountsBySkuOriginBuyer = new Map();
  const amountsBySkuOrigin = new Map();
  const attributesBySku = new Map();
  const latestCreationDateBySku = new Map();

  selectLatestRowsBySkuOriginBuyer(rows).forEach(({ rawRow, row }) => {
    if (!products.has(row.sku)) products.set(row.sku, createProduct(row));
    addAttributeValues(attributesBySku, rawRow, row);
    if (row.creationDate
      && (!latestCreationDateBySku.has(row.sku)
        || row.creationDate > latestCreationDateBySku.get(row.sku))) {
      latestCreationDateBySku.set(row.sku, row.creationDate);
    }

    const product = products.get(row.sku);
    PRODUCT_ATTRIBUTE_FIELDS.forEach((field) => {
      const productHasValue = product[field] !== null
        && product[field] !== undefined
        && product[field] !== '';
      const rowHasValue = row[field] !== null && row[field] !== undefined && row[field] !== '';
      if (!productHasValue && rowHasValue) product[field] = row[field];
    });

    if (!['USA', 'CHINA'].includes(row.origin)) return;
    addAmount(
      amountsBySkuOriginBuyer,
      `${row.sku}|${row.origin}|${row.buyerCompany}`,
      row.amount,
      { sku: row.sku, origin: row.origin, buyerCompany: row.buyerCompany },
    );
    addAmount(
      amountsBySkuOrigin,
      `${row.sku}|${row.origin}`,
      row.amount,
      { sku: row.sku, origin: row.origin },
    );
  });

  const buyerConflicts = findAmountConflicts(
    amountsBySkuOriginBuyer,
    'SKU_ORIGIN_BUYER',
  );
  const crossBuyerConflicts = findAmountConflicts(amountsBySkuOrigin, 'SKU_ORIGIN')
    .filter((conflict) => !buyerConflicts.some((buyerConflict) => (
      buyerConflict.sku === conflict.sku && buyerConflict.origin === conflict.origin
    )));
  const attributeConflicts = findAttributeConflicts(attributesBySku);
  const conflicts = [...buyerConflicts, ...crossBuyerConflicts, ...attributeConflicts];
  if (conflicts.length > 0) throw new ProductMasterConflictError(conflicts);

  products.forEach((product, sku) => {
    product.creationDate = latestCreationDateBySku.get(sku) ?? null;
  });

  amountsBySkuOrigin.forEach(({ values, context }) => {
    if (values.size === 0) return;
    const [amount] = values;
    const product = products.get(context.sku);
    // Pivot funcional autorizado: el origen determina la única columna precio.
    if (context.origin === 'USA') product.priceUSA = amount;
    if (context.origin === 'CHINA') product.priceChina = amount;
  });

  return [...products.values()]
    .sort((left, right) => left.sku.localeCompare(right.sku))
    .map((product) => Object.freeze(product));
};

export const extractProductBrands = (rows) => {
  if (!Array.isArray(rows)) {
    throw new Error('ProductPriceLevelGateway: Dataverse debe devolver un arreglo.');
  }

  const brands = new Set();
  rows.forEach((row) => {
    const brand = normalizeText(row?.[PRODUCT_SOURCE.fields.brand]);
    if (brand) brands.add(brand);
  });
  return Object.freeze([...brands].sort(compareBrands));
};

const PRODUCT_COMPANY_FILTER = `(${ALLOWED_BUYER_COMPANIES
  .map((company) => (
    `${PRODUCT_SOURCE.fields.buyerCompany} eq ${quoteODataString(company)}`
  ))
  .join(' or ')})`;
const PRODUCT_COMMERCIAL_UNIVERSE_FILTER = [
  PRODUCT_COMPANY_FILTER,
  `${PRODUCT_SOURCE.fields.companyName} eq ${PRODUCT_SOURCE.fields.buyerCompany}`,
  `${PRODUCT_SOURCE.fields.origin} ne null`,
  `${PRODUCT_SOURCE.fields.origin} ne ''`,
].join(' and ');

export const createProductPriceLevelGateway = ({ dataverseClient } = {}) => {
  if (!dataverseClient || typeof dataverseClient.retrieveAll !== 'function') {
    throw new Error('ProductPriceLevelGateway: Dataverse Client inválido.');
  }

  return Object.freeze({
    async loadBrands({ productTrace } = {}) {
      if (typeof dataverseClient.retrieveGrouped !== 'function') {
        throw new Error('ProductPriceLevelGateway: Dataverse Client agregado inválido.');
      }
      // Dataverse filtra compradores y origen válido antes de agrupar la marca;
      // el resultado ya no recorre el Product Master global con retrieveAll().
      const rows = await dataverseClient.retrieveGrouped({
        entitySet: PRODUCT_SOURCE.entitySet,
        filter: PRODUCT_COMMERCIAL_UNIVERSE_FILTER,
        groupBy: Object.freeze([PRODUCT_SOURCE.fields.brand]),
        productTrace,
      });
      return extractProductBrands(rows);
    },

    async loadProducts({ brand, productTrace } = {}) {
      // Brand llega normalizada por Product Service. Incluirla aquí antes de
      // retrieveAll evita que la paginación recupere el Product Master global.
      const brandFilter = `${PRODUCT_SOURCE.fields.brand} eq ${quoteODataString(brand)}`;
      const rows = await dataverseClient.retrieveAll({
        entitySet: PRODUCT_SOURCE.entitySet,
        select: Object.freeze(Object.values(PRODUCT_SOURCE.fields)),
        filter: `${PRODUCT_COMMERCIAL_UNIVERSE_FILTER} and ${brandFilter}`,
        orderBy: [
          PRODUCT_SOURCE.fields.sku,
          PRODUCT_SOURCE.fields.origin,
          PRODUCT_SOURCE.fields.buyerCompany,
          PRODUCT_SOURCE.fields.creationDate,
        ].map((field) => `${field} asc`).join(','),
        includeAnnotations: Object.freeze([DATAVERSE_FORMATTED_VALUE_ANNOTATION]),
        productTrace,
      });
      // Defensa de contrato ante una respuesta upstream que no respete el
      // predicado; el ahorro de red proviene del filtro OData anterior.
      const matchingRows = rows.filter((row) => (
        normalizeText(row?.[PRODUCT_SOURCE.fields.brand]) === brand
      ));
      return consolidateProductPriceLevelRows(matchingRows);
    },
  });
};
