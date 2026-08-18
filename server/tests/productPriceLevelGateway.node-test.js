import test from 'node:test';
import assert from 'node:assert/strict';
import {
  consolidateProductPriceLevelRows,
  createProductPriceLevelGateway,
  extractProductBrands,
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
  crbbe_urlproducto: ' https://products.invalid/sku-001 ',
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
  priceChina: null,
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

test('normaliza crbbe_urlproducto hacia productUrl con fallback vacío', () => {
  assert.equal(
    mapProductPriceLevelRow(rawRow({
      crbbe_urlproducto: ' https://products.invalid/trimmed ',
    })).productUrl,
    'https://products.invalid/trimmed',
  );
  assert.equal(
    mapProductPriceLevelRow(rawRow({ crbbe_urlproducto: null })).productUrl,
    '',
  );
  assert.equal(
    mapProductPriceLevelRow(rawRow({ crbbe_urlproducto: undefined })).productUrl,
    '',
  );
  assert.equal(
    mapProductPriceLevelRow(rawRow({ crbbe_urlproducto: '   ' })).productUrl,
    '',
  );
});

test('normaliza amount distinguiendo cero real de precio no disponible', () => {
  assert.equal(mapProductPriceLevelRow(rawRow({ amount: 0 })).amount, 0);
  assert.equal(mapProductPriceLevelRow(rawRow({ amount: null })).amount, null);
  assert.equal(mapProductPriceLevelRow(rawRow({ amount: undefined })).amount, null);
  assert.equal(mapProductPriceLevelRow(rawRow({ amount: '18.5' })).amount, 18.5);
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

test('gateway consulta productpricelevels con ambas compañías y marca antes de paginar', async () => {
  const calls = [];
  const gateway = createProductPriceLevelGateway({
    dataverseClient: {
      retrieveAll: async (query) => {
        calls.push(query);
        return [rawRow()];
      },
    },
  });

  assert.deepEqual(await gateway.loadProducts({ brand: 'Skullcandy' }), [expectedProduct]);
  assert.equal(calls[0].entitySet, 'productpricelevels');
  assert.equal(
    calls[0].filter,
    "(crbbe_companiacompradora eq 'IOCA USA INC' or crbbe_companiacompradora eq 'SAND SPORTS, CORP.') and crbbe_nombremarca eq 'Skullcandy'",
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
    'crbbe_urlproducto',
    'amount',
    'crbbe_origen',
    'crbbe_companiacompradora',
  ]);
  assert.equal(
    calls[0].orderBy,
    'crbbe_sku asc,crbbe_origen asc,crbbe_companiacompradora asc,createdon asc',
  );
  assert.equal(Object.hasOwn(calls[0], 'top'), false);
  assert.equal(Object.hasOwn(calls[0], 'maxPageSize'), false);
  assert.equal(calls[0].select.includes('producturl'), false);
});

test('no reintroduce productpricelevel como Entity Set runtime del gateway', async () => {
  let runtimeEntitySet;
  const gateway = createProductPriceLevelGateway({
    dataverseClient: {
      retrieveAll: async ({ entitySet }) => {
        runtimeEntitySet = entitySet;
        return [];
      },
    },
  });

  await gateway.loadProducts({ brand: 'Skullcandy' });
  assert.notEqual(runtimeEntitySet, 'productpricelevel');
  assert.equal(runtimeEntitySet, 'productpricelevels');
});

test('lista marcas con filtro previo y groupby exclusivo sin retrieveAll global', async () => {
  const calls = [];
  const gateway = createProductPriceLevelGateway({
    dataverseClient: {
      retrieveAll: async () => {
        assert.fail('Brands no debe usar retrieveAll.');
      },
      retrieveGrouped: async (query) => {
        calls.push(query);
        return [
          { crbbe_nombremarca: ' ANKER ' },
          { crbbe_nombremarca: 'SKULLCANDY' },
        ];
      },
    },
  });

  assert.deepEqual(await gateway.loadBrands(), ['ANKER', 'SKULLCANDY']);
  assert.deepEqual(calls, [{
    entitySet: 'productpricelevels',
    filter: "(crbbe_companiacompradora eq 'IOCA USA INC' or crbbe_companiacompradora eq 'SAND SPORTS, CORP.')",
    groupBy: ['crbbe_nombremarca'],
    productTrace: undefined,
  }]);
});

test('propaga el mismo contexto Product desde loadBrands hasta retrieveGrouped', async () => {
  const productTrace = Object.freeze({ checkpoint() {}, paginationCheckpoint() {} });
  let receivedTrace;
  const gateway = createProductPriceLevelGateway({
    dataverseClient: {
      retrieveAll: async () => [],
      retrieveGrouped: async (query) => {
        receivedTrace = query.productTrace;
        return [];
      },
    },
  });

  await gateway.loadBrands({ productTrace });
  assert.equal(receivedTrace, productTrace);
});

test('marcas aplica trim, exclusión de vacíos, deduplicación exacta y orden estable', () => {
  assert.deepEqual(extractProductBrands([
    rawRow({ crbbe_nombremarca: ' SKULLCANDY ' }),
    rawRow({ crbbe_nombremarca: 'ANKER' }),
    rawRow({ crbbe_nombremarca: 'ANKER ' }),
    rawRow({ crbbe_nombremarca: null }),
    rawRow({ crbbe_nombremarca: undefined }),
    rawRow({ crbbe_nombremarca: '   ' }),
  ]), ['ANKER', 'SKULLCANDY']);
});

test('escapa brand OData y aplica el filtro en la llamada inicial a retrieveAll', async () => {
  let query;
  const gateway = createProductPriceLevelGateway({
    dataverseClient: {
      retrieveAll: async (receivedQuery) => {
        query = receivedQuery;
        return [];
      },
    },
  });

  await gateway.loadProducts({ brand: "O'Brien" });
  assert.equal(
    query.filter,
    "(crbbe_companiacompradora eq 'IOCA USA INC' or crbbe_companiacompradora eq 'SAND SPORTS, CORP.') and crbbe_nombremarca eq 'O''Brien'",
  );
});

test('la defensa backend no mezcla registros de otra marca', async () => {
  const gateway = createProductPriceLevelGateway({
    dataverseClient: {
      retrieveAll: async () => [
        rawRow({ crbbe_sku: 'A-1', crbbe_nombremarca: 'Skullcandy' }),
        rawRow({ crbbe_sku: 'B-1', crbbe_nombremarca: 'Anker' }),
      ],
    },
  });

  assert.deepEqual(
    (await gateway.loadProducts({ brand: 'Skullcandy' })).map(({ sku }) => sku),
    ['A-1'],
  );
});

test('cargas consecutivas A y B consultan y consolidan datasets independientes', async () => {
  const filters = [];
  const gateway = createProductPriceLevelGateway({
    dataverseClient: {
      retrieveAll: async ({ filter }) => {
        filters.push(filter);
        if (filter.includes("crbbe_nombremarca eq 'ANKER'")) {
          return [rawRow({ crbbe_sku: 'A-1', crbbe_nombremarca: 'ANKER' })];
        }
        return [rawRow({ crbbe_sku: 'B-1', crbbe_nombremarca: 'SKULLCANDY' })];
      },
    },
  });

  assert.deepEqual(
    (await gateway.loadProducts({ brand: 'ANKER' })).map(({ sku }) => sku),
    ['A-1'],
  );
  assert.deepEqual(
    (await gateway.loadProducts({ brand: 'SKULLCANDY' })).map(({ sku }) => sku),
    ['B-1'],
  );
  assert.equal(filters.length, 2);
  assert.notEqual(filters[0], filters[1]);
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

test('mantiene null cuando un SKU no tiene fila para uno de los orígenes', () => {
  const onlyUSA = consolidateProductPriceLevelRows([rawRow({ amount: 25 })])[0];
  const onlyChina = consolidateProductPriceLevelRows([
    rawRow({ amount: 18, crbbe_origen: 'CHINA' }),
  ])[0];
  assert.deepEqual(
    { priceUSA: onlyUSA.priceUSA, priceChina: onlyUSA.priceChina },
    { priceUSA: 25, priceChina: null },
  );
  assert.deepEqual(
    { priceUSA: onlyChina.priceUSA, priceChina: onlyChina.priceChina },
    { priceUSA: null, priceChina: 18 },
  );
});

test('amount null/undefined conserva precio no disponible y no genera conflicto', () => {
  const product = consolidateProductPriceLevelRows([
    rawRow({ amount: null }),
    rawRow({ amount: undefined }),
  ])[0];
  assert.equal(product.priceUSA, null);
  assert.equal(product.priceChina, null);
});

test('conserva cero real para USA y CHINA', () => {
  const product = consolidateProductPriceLevelRows([
    rawRow({ amount: 0, crbbe_origen: 'USA' }),
    rawRow({ amount: 0, crbbe_origen: 'CHINA' }),
  ])[0];
  assert.equal(product.priceUSA, 0);
  assert.equal(product.priceChina, 0);
});

test('null y un valor real del mismo origen conservan el valor sin falso conflicto', () => {
  const product = consolidateProductPriceLevelRows([
    rawRow({ amount: null, crbbe_origen: 'USA' }),
    rawRow({ amount: 25, crbbe_origen: 'USA' }),
  ])[0];
  assert.equal(product.priceUSA, 25);
  assert.equal(product.priceChina, null);
});

test('omite SKU vacío/inválido y conserva URLs vacías', () => {
  const products = consolidateProductPriceLevelRows([
    rawRow({ crbbe_sku: '  ' }),
    rawRow({
      crbbe_sku: 'VALIDO',
      crbbe_imagenproducto: null,
      crbbe_urlproducto: undefined,
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
  ['productUrl', { crbbe_urlproducto: 'https://products.invalid/other' }],
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

test('cero y otro número distinto generan conflicto de precio', () => {
  assert.throws(
    () => consolidateProductPriceLevelRows([
      rawRow({ amount: 0 }),
      rawRow({ amount: 25 }),
    ]),
    (error) => error instanceof ProductMasterConflictError
      && error.conflicts.some((conflict) => (
        conflict.conflictType === 'PRICE'
        && assert.deepEqual(conflict.values, [0, 25]) === undefined
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
  assert.equal(Object.hasOwn(product, 'crbbe_urlproducto'), false);
  assert.doesNotMatch(JSON.stringify(product), /crbbe_|createdon|amount|companiacompradora/);
});
