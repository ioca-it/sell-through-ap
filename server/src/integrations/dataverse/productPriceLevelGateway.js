// Única frontera que conoce productpricelevel y sus LogicalNames. Devuelve el
// contrato Product consolidado y nunca publica campos auxiliares Dataverse.

import { DATAVERSE_FORMATTED_VALUE_ANNOTATION } from './dataverseClient.js';
import { quoteODataString } from './odata.js';

const PRODUCT_SOURCE = Object.freeze({
  entitySet: 'productpricelevel',
  fields: Object.freeze({
    brand: 'crbbe_nombremarca',
    sku: 'crbbe_sku',
    productName: 'crbbe_nombreproducto',
    category: 'crbbe_nombrecategoria',
    discontinuationDate: 'crbbe_validohasta',
    creationDate: 'createdon',
    level: 'crbbe_clasificacioncomercial',
    status: 'crbbe_etapa',
    imageUrl: 'crbbe_imagenproducto',
    productUrl: 'producturl',
    amount: 'amount',
    origin: 'crbbe_origen',
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
  'creationDate',
  'level',
  'status',
  'imageUrl',
  'productUrl',
]);

const createProduct = (row) => ({
  sku: row.sku,
  productName: row.productName,
  brand: row.brand,
  category: row.category,
  discontinuationDate: row.discontinuationDate,
  creationDate: row.creationDate,
  level: row.level,
  status: row.status,
  imageUrl: row.imageUrl,
  productUrl: row.productUrl,
  priceUSA: null,
  priceChina: null,
});

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
  if (field === 'discontinuationDate' || field === 'creationDate') {
    return comparableDate(rawRow[PRODUCT_SOURCE.fields[field]]);
  }
  return row[field];
};

const addAttributeValues = (attributesBySku, rawRow, row) => {
  if (!attributesBySku.has(row.sku)) attributesBySku.set(row.sku, new Map());
  const attributes = attributesBySku.get(row.sku);
  PRODUCT_ATTRIBUTE_FIELDS.forEach((field) => {
    const value = comparableAttributeValue(rawRow, row, field);
    if (!value) return;
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
            left.localeCompare(right)
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

  rows.forEach((rawRow) => {
    const row = mapProductPriceLevelRow(rawRow);
    // El filtro OData es obligatorio; esta defensa backend impide publicar una
    // compañía ajena aunque una respuesta upstream no respete el predicado.
    if (!ALLOWED_BUYER_COMPANY_SET.has(row.buyerCompany) || !row.sku) return;
    if (!products.has(row.sku)) products.set(row.sku, createProduct(row));
    addAttributeValues(attributesBySku, rawRow, row);

    const product = products.get(row.sku);
    PRODUCT_ATTRIBUTE_FIELDS.forEach((field) => {
      if (!product[field] && row[field]) product[field] = row[field];
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

const PRODUCT_COMPANY_FILTER = `(${ALLOWED_BUYER_COMPANIES
  .map((company) => (
    `${PRODUCT_SOURCE.fields.buyerCompany} eq ${quoteODataString(company)}`
  ))
  .join(' or ')})`;

export const createProductPriceLevelGateway = ({ dataverseClient } = {}) => {
  if (!dataverseClient || typeof dataverseClient.retrieveAll !== 'function') {
    throw new Error('ProductPriceLevelGateway: Dataverse Client inválido.');
  }

  return Object.freeze({
    async loadProducts() {
      const rows = await dataverseClient.retrieveAll({
        entitySet: PRODUCT_SOURCE.entitySet,
        select: Object.freeze(Object.values(PRODUCT_SOURCE.fields)),
        filter: PRODUCT_COMPANY_FILTER,
        orderBy: [
          PRODUCT_SOURCE.fields.sku,
          PRODUCT_SOURCE.fields.origin,
          PRODUCT_SOURCE.fields.buyerCompany,
          PRODUCT_SOURCE.fields.creationDate,
        ].map((field) => `${field} asc`).join(','),
        includeAnnotations: Object.freeze([DATAVERSE_FORMATTED_VALUE_ANNOTATION]),
      });
      return consolidateProductPriceLevelRows(rows);
    },
  });
};
