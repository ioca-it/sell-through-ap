import test from 'node:test';
import assert from 'node:assert/strict';
import {
  consolidateProductPriceLevelRows,
  createProductPriceLevelGateway,
  mapProductPriceLevelRow,
  ProductMasterConflictError,
} from '../src/integrations/dataverse/productPriceLevelGateway.js';

const FORMATTED = 'OData.Community.Display.V1.FormattedValue';
const rawRow = (overrides = {}) => ({
  crbbe_nombremarca: ' Skullcandy ',
  crbbe_sku: ' SKU-001 ',
  crbbe_nombreproducto: ' Crusher Evo ',
  crbbe_nombrecategoria: ' Audífonos ',
  crbbe_validohasta: '2027-06-30T00:00:00Z',
  createdon: '2026-08-01T12:00:00Z',
  crbbe_clasificacioncomercial: 100000001,
  [`crbbe_clasificacioncomercial@${FORMATTED}`]: ' Better ',
  crbbe_etapa: 100000000,
  [`crbbe_etapa@${FORMATTED}`]: ' Activo ',
  crbbe_imagenproducto: ' https://images.invalid/sku-001.png ',
  producturl: ' https://products.invalid/sku-001 ',
  amount: 25,
  crbbe_origen: ' USA ',
  crbbe_companiacompradora: 'IOCA USA INC',
  internalid: 'no-publicar',
  ...overrides,
});

const expectedProduct = {
  sku: 'SKU-001',
  productName: 'Crusher Evo',
  brand: 'Skullcandy',
  category: 'Audífonos',
  discontinuationDate: '2027-06-30T00:00:00.000Z',
  creationDate: '2026-08-01T12:00:00.000Z',
  level: 'Better',
  status: 'Activo',
  imageUrl: 'https://images.invalid/sku-001.png',
  productUrl: 'https://products.invalid/sku-001',
  priceUSA: 25,
  priceChina: 0,
};

test('mapea todos los campos y usa FormattedValue para level/status Choice', () => {
  const mapped = mapProductPriceLevelRow(rawRow());
  assert.deepEqual(mapped, {
    sku: expectedProduct.sku,
    productName: expectedProduct.productName,
    brand: expectedProduct.brand,
    category: expectedProduct.category,
    discontinuationDate: expectedProduct.discontinuationDate,
    creationDate: expectedProduct.creationDate,
    level: expectedProduct.level,
    status: expectedProduct.status,
    imageUrl: expectedProduct.imageUrl,
    productUrl: expectedProduct.productUrl,
    amount: 25,
    origin: 'USA',
    buyerCompany: 'IOCA USA INC',
  });
});

test('fallback de level/status no inventa etiquetas para Choice numérico', () => {
  const numericChoice = rawRow();
  delete numericChoice[`crbbe_clasificacioncomercial@${FORMATTED}`];
  delete numericChoice[`crbbe_etapa@${FORMATTED}`];
  assert.equal(mapProductPriceLevelRow(numericChoice).level, '');
  assert.equal(mapProductPriceLevelRow(numericChoice).status, '');
  assert.equal(mapProductPriceLevelRow(rawRow({
    crbbe_clasificacioncomercial: '100000001',
    [`crbbe_clasificacioncomercial@${FORMATTED}`]: undefined,
  })).level, '');

  const textFields = rawRow({
    crbbe_clasificacioncomercial: ' Good ',
    crbbe_etapa: ' EOL ',
    [`crbbe_clasificacioncomercial@${FORMATTED}`]: null,
    [`crbbe_etapa@${FORMATTED}`]: undefined,
  });
  assert.equal(mapProductPriceLevelRow(textFields).level, 'Good');
  assert.equal(mapProductPriceLevelRow(textFields).status, 'EOL');
});

test('gateway consulta productpricelevel con ambas compañías en backend', async () => {
  const calls = [];
  const gateway = createProductPriceLevelGateway({
    dataverseClient: {
      retrieveAll: async (query) => {
        calls.push(query);
        return [rawRow()];
      },
    },
  });

  assert.deepEqual(await gateway.loadProducts(), [expectedProduct]);
  assert.equal(calls[0].entitySet, 'productpricelevel');
  assert.equal(
    calls[0].filter,
    "(crbbe_companiacompradora eq 'IOCA USA INC' or crbbe_companiacompradora eq 'SAND SPORTS, CORP.')",
  );
  assert.deepEqual(calls[0].includeAnnotations, [FORMATTED]);
  assert.deepEqual(calls[0].select, [
    'crbbe_nombremarca',
    'crbbe_sku',
    'crbbe_nombreproducto',
    'crbbe_nombrecategoria',
    'crbbe_validohasta',
    'createdon',
    'crbbe_clasificacioncomercial',
    'crbbe_etapa',
    'crbbe_imagenproducto',
    'producturl',
    'amount',
    'crbbe_origen',
    'crbbe_companiacompradora',
  ]);
});

test('incluye IOCA y SAND, y excluye otras compañías en la defensa backend', () => {
  const products = consolidateProductPriceLevelRows([
    rawRow({ crbbe_sku: 'IOCA-1', crbbe_companiacompradora: 'IOCA USA INC' }),
    rawRow({ crbbe_sku: 'SAND-1', crbbe_companiacompradora: 'SAND SPORTS, CORP.' }),
    rawRow({ crbbe_sku: 'OTRA-1', crbbe_companiacompradora: 'OTRA COMPAÑIA' }),
  ]);
  assert.deepEqual(products.map(({ sku }) => sku), ['IOCA-1', 'SAND-1']);
});

test('consolida USA y CHINA del mismo SKU sin sumar ni promediar', () => {
  const products = consolidateProductPriceLevelRows([
    rawRow({ amount: 25, crbbe_origen: 'USA' }),
    rawRow({ amount: 18, crbbe_origen: 'CHINA' }),
  ]);
  assert.deepEqual(products, [{ ...expectedProduct, priceChina: 18 }]);
});

test('mantiene cero controlado cuando un SKU solo tiene un origen', () => {
  const onlyUSA = consolidateProductPriceLevelRows([rawRow({ amount: 25 })])[0];
  const onlyChina = consolidateProductPriceLevelRows([
    rawRow({ amount: 18, crbbe_origen: 'CHINA' }),
  ])[0];
  assert.deepEqual(
    { priceUSA: onlyUSA.priceUSA, priceChina: onlyUSA.priceChina },
    { priceUSA: 25, priceChina: 0 },
  );
  assert.deepEqual(
    { priceUSA: onlyChina.priceUSA, priceChina: onlyChina.priceChina },
    { priceUSA: 0, priceChina: 18 },
  );
});

test('amount null/undefined no genera precio ni conflicto', () => {
  const product = consolidateProductPriceLevelRows([
    rawRow({ amount: null }),
    rawRow({ amount: undefined }),
  ])[0];
  assert.equal(product.priceUSA, 0);
  assert.equal(product.priceChina, 0);
});

test('omite SKU vacío/inválido y conserva URLs vacías', () => {
  const products = consolidateProductPriceLevelRows([
    rawRow({ crbbe_sku: '  ' }),
    rawRow({
      crbbe_sku: 'VALIDO',
      crbbe_imagenproducto: null,
      producturl: undefined,
    }),
  ]);
  assert.equal(products.length, 1);
  assert.equal(products[0].sku, 'VALIDO');
  assert.equal(products[0].imageUrl, '');
  assert.equal(products[0].productUrl, '');
});

test('normaliza fechas válidas y usa null para fechas ausentes o inválidas', () => {
  const product = consolidateProductPriceLevelRows([
    rawRow({ crbbe_validohasta: null, createdon: 'fecha-inválida' }),
  ])[0];
  assert.equal(product.discontinuationDate, null);
  assert.equal(product.creationDate, null);
});

test('mismo SKU y atributos equivalentes normalizados no generan conflicto', () => {
  const products = consolidateProductPriceLevelRows([
    rawRow(),
    rawRow({
      crbbe_nombreproducto: 'Crusher Evo',
      crbbe_validohasta: '2027-06-29T20:00:00-04:00',
      createdon: '2026-08-01T08:00:00-04:00',
      [`crbbe_clasificacioncomercial@${FORMATTED}`]: 'Better',
      [`crbbe_etapa@${FORMATTED}`]: 'Activo',
    }),
  ]);
  assert.deepEqual(products, [expectedProduct]);
});

test('atributo vacío seguido de valor inicializa sin conflicto', () => {
  const product = consolidateProductPriceLevelRows([
    rawRow({ crbbe_nombreproducto: '  ' }),
    rawRow({ crbbe_nombreproducto: ' Crusher Evo ' }),
  ])[0];
  assert.equal(product.productName, 'Crusher Evo');
});

test('atributo con valor seguido de vacío conserva el valor sin conflicto', () => {
  const product = consolidateProductPriceLevelRows([
    rawRow({ crbbe_nombreproducto: ' Crusher Evo ' }),
    rawRow({ crbbe_nombreproducto: null }),
  ])[0];
  assert.equal(product.productName, 'Crusher Evo');
});

const assertAttributeConflict = (field, override) => {
  assert.throws(
    () => consolidateProductPriceLevelRows([rawRow(), rawRow(override)]),
    (error) => error instanceof ProductMasterConflictError
      && error.code === 'PRODUCT_MASTER_CONFLICT'
      && error.statusCode === 409
      && error.conflicts.some((conflict) => (
        conflict.conflictType === 'ATTRIBUTE'
        && conflict.scope === 'SKU_ATTRIBUTE'
        && conflict.sku === 'SKU-001'
        && conflict.field === field
      )),
  );
};

test('fecha no vacía inválida no se vuelve equivalente a otra fecha', () => {
  assertAttributeConflict('discontinuationDate', { crbbe_validohasta: 'otra-fecha-inválida' });
});

[
  ['productName', { crbbe_nombreproducto: 'Crusher ANC' }],
  ['brand', { crbbe_nombremarca: 'Otra marca' }],
  ['category', { crbbe_nombrecategoria: 'Parlantes' }],
  ['level', { [`crbbe_clasificacioncomercial@${FORMATTED}`]: 'Best' }],
  ['status', { [`crbbe_etapa@${FORMATTED}`]: 'EOL' }],
  ['discontinuationDate', { crbbe_validohasta: '2027-07-01T00:00:00Z' }],
  ['creationDate', { createdon: '2026-08-02T12:00:00Z' }],
  ['imageUrl', { crbbe_imagenproducto: 'https://images.invalid/other.png' }],
  ['productUrl', { producturl: 'https://products.invalid/other' }],
].forEach(([field, override]) => {
  test(`detecta conflicto de atributo ${field} sin elegir precedencia`, () => {
    assertAttributeConflict(field, override);
  });
});

test('detecta determinísticamente precios distintos del mismo SKU/origen/comprador', () => {
  assert.throws(
    () => consolidateProductPriceLevelRows([
      rawRow({ amount: 25 }),
      rawRow({ amount: 26 }),
    ]),
    (error) => error instanceof ProductMasterConflictError
      && error.code === 'PRODUCT_MASTER_CONFLICT'
      && error.statusCode === 409
      && error.conflicts.some((conflict) => (
        conflict.conflictType === 'PRICE'
        && conflict.scope === 'SKU_ORIGIN_BUYER'
        && conflict.sku === 'SKU-001'
        && conflict.origin === 'USA'
        && conflict.buyerCompany === 'IOCA USA INC'
        && assert.deepEqual(conflict.values, [25, 26]) === undefined
      )),
  );
});

test('también bloquea precios distintos entre compradores sin precedencia autorizada', () => {
  assert.throws(
    () => consolidateProductPriceLevelRows([
      rawRow({ amount: 25, crbbe_companiacompradora: 'IOCA USA INC' }),
      rawRow({ amount: 26, crbbe_companiacompradora: 'SAND SPORTS, CORP.' }),
    ]),
    ProductMasterConflictError,
  );
});

test('el contrato final no expone nombres Dataverse ni campos auxiliares', () => {
  const product = consolidateProductPriceLevelRows([rawRow()])[0];
  assert.deepEqual(Object.keys(product), [
    'sku',
    'productName',
    'brand',
    'category',
    'discontinuationDate',
    'creationDate',
    'level',
    'status',
    'imageUrl',
    'productUrl',
    'priceUSA',
    'priceChina',
  ]);
  assert.doesNotMatch(JSON.stringify(product), /crbbe_|createdon|amount|companiacompradora/);
});
