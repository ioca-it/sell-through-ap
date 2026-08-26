import { createServer } from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app/createApp.js';
import {
  createDataverseClient,
  DataverseRequestError,
} from '../src/integrations/dataverse/dataverseClient.js';
import {
  createProductPriceLevelGateway,
  ProductMasterConflictError,
} from '../src/integrations/dataverse/productPriceLevelGateway.js';
import { createProductService } from '../src/modules/products/productService.js';

const product = Object.freeze({
  sku: 'SKU-001',
  productName: 'Producto Uno',
  brand: 'Marca',
  category: 'Categoría',
  discontinuationDate: '2027-06-30T00:00:00.000Z',
  creationDate: '2026-08-01T00:00:00.000Z',
  level: 'BETTER',
  status: 'ACTIVO',
  imageUrl: '',
  productUrl: '',
  aplicaMasterPack: null,
  cantidadMasterPack: null,
  aplicaInnerPack: null,
  cantidadInnerPack: null,
  priceUSA: 25,
  priceChina: 18,
});

const createTestApp = (productService) => createApp({
  customerService: {
    search: async () => [],
    getByCode: async () => null,
  },
  productService,
  allowedOrigins: ['http://localhost:5173'],
  authenticator: { authenticate: async () => ({ subject: 'test-user' }) },
  rateLimiter: { check: async () => ({ allowed: true, retryAfterSeconds: 0 }) },
});

const withServer = async (app, assertion) => {
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try {
    await assertion(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (
      error ? reject(error) : resolve()
    )));
  }
};

test('expone únicamente la carga funcional de Maestro Producto', async () => {
  let calls = 0;
  const app = createTestApp({
    loadMaster: async ({ brand }) => {
      calls += 1;
      assert.equal(brand, 'Marca');
      return [product];
    },
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/products/master?brand=Marca`);
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).products, [product]);
  });
  assert.equal(calls, 1);
});

test('flujo Product procesa el contrato estándar Dataverse 200 hasta la API', async () => {
  const baseRow = {
    crbbe_nombremarca: product.brand,
    crbbe_sku: product.sku,
    crbbe_nombreproducto: product.productName,
    crbbe_nombrecategoria: product.category,
    crbbe_validohasta: product.discontinuationDate,
    crbbe_validodesde: product.creationDate,
    crbbe_clasificacioncomercial: product.level,
    crbbe_etapa: product.status,
    crbbe_imagenproducto: product.imageUrl,
    crbbe_urlproducto: product.productUrl,
    crbbe_nombrecompania: 'IOCA USA INC',
    crbbe_companiacompradora: 'IOCA USA INC',
  };
  const dataverseClient = createDataverseClient({
    baseUrl: 'https://organization.crm.dynamics.com',
    tokenProvider: { getToken: async () => 'access-token' },
    fetchImpl: async () => new Response(JSON.stringify({
      '@odata.context': 'https://organization.crm.dynamics.com/api/data/v9.2/$metadata#productpricelevels',
      value: [
        { ...baseRow, crbbe_origen: 'USA', amount: product.priceUSA },
        { ...baseRow, crbbe_origen: 'CHINA', amount: product.priceChina },
      ],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; odata.metadata=minimal' },
    }),
  });
  const productService = createProductService({
    productGateway: createProductPriceLevelGateway({ dataverseClient }),
  });
  const app = createTestApp(productService);

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/products/master?brand=Marca`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { products: [product] });
  });
});

test('preserva null y cero en el contrato HTTP Product', async () => {
  const prices = { ...product, priceUSA: 0, priceChina: null };
  const app = createTestApp({ loadMaster: async () => [prices] });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/products/master?brand=Marca`);
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).products, [prices]);
  });
});

test('rechaza OData y cualquier parámetro arbitrario del frontend', async () => {
  const app = createTestApp({ loadMaster: async () => [product] });
  await withServer(app, async (baseUrl) => {
    for (const query of [
      'brand=Marca&%24filter=crbbe_origen%20eq%20USA',
      'brand=Marca&%24select=amount',
      'brand=Marca&%24orderby=crbbe_validodesde',
      'brand=Marca&%24top=10',
      'brand=Marca&company=IOCA',
    ]) {
      const response = await fetch(`${baseUrl}/api/products/master?${query}`);
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error.code, 'INVALID_PRODUCT_REQUEST');
    }
  });
});

test('Product Master requiere una única brand válida y nunca llama el servicio sin ella', async () => {
  let calls = 0;
  const app = createTestApp(createProductService({
    productGateway: {
      loadBrands: async () => [],
      loadProducts: async () => {
        calls += 1;
        return [product];
      },
    },
  }));
  await withServer(app, async (baseUrl) => {
    for (const query of ['', '?brand=', '?brand=%20%20', '?brand=Marca&brand=Otra']) {
      const response = await fetch(`${baseUrl}/api/products/master${query}`);
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error.code, 'INVALID_PRODUCT_REQUEST');
    }
  });
  assert.equal(calls, 0);
});

test('Product Service valida tipo, trim y longitud de brand antes del Gateway', async () => {
  const calls = [];
  const service = createProductService({
    productGateway: {
      loadBrands: async () => [],
      loadProducts: async (input) => {
        calls.push(input);
        return [];
      },
    },
  });

  assert.throws(() => service.loadMaster({ brand: null }), /debe ser texto/);
  assert.throws(() => service.loadMaster({ brand: '   ' }), /es requerida/);
  assert.throws(() => service.loadMaster({ brand: 'A'.repeat(101) }), /demasiado larga/);
  await service.loadMaster({ brand: '  Skullcandy  ' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].brand, 'Skullcandy');
});

test('GET brands autenticado publica solo el contrato funcional', async () => {
  let authentications = 0;
  const app = createApp({
    customerService: { search: async () => [], getByCode: async () => null },
    productService: {
      listBrands: async () => ['ANKER', 'SKULLCANDY'],
      loadMaster: async () => [],
    },
    allowedOrigins: ['http://localhost:5173'],
    authenticator: {
      authenticate: async () => {
        authentications += 1;
        return { subject: 'test-user' };
      },
    },
    rateLimiter: { check: async () => ({ allowed: true, retryAfterSeconds: 0 }) },
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/products/brands`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { brands: ['ANKER', 'SKULLCANDY'] });
  });
  assert.equal(authentications, 1);
});

test('GET brands rechaza OData y parámetros desconocidos', async () => {
  const app = createTestApp({ listBrands: async () => ['ANKER'], loadMaster: async () => [] });
  await withServer(app, async (baseUrl) => {
    for (const query of ['%24filter=x', '%24select=x', 'q=ANKER']) {
      const response = await fetch(`${baseUrl}/api/products/brands?${query}`);
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error.code, 'INVALID_PRODUCT_REQUEST');
    }
  });
});

test('protege Product API con el mismo autenticador y rate limiter', async () => {
  let authentications = 0;
  const app = createApp({
    customerService: { search: async () => [], getByCode: async () => null },
    productService: { loadMaster: async () => [product] },
    allowedOrigins: ['http://localhost:5173'],
    authenticator: {
      authenticate: async () => {
        authentications += 1;
        return { subject: 'test-user' };
      },
    },
    rateLimiter: { check: async () => ({ allowed: true, retryAfterSeconds: 0 }) },
  });
  await withServer(app, async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/products/master?brand=Marca`)).status, 200);
  });
  assert.equal(authentications, 1);
});

test('publica PRODUCT_MASTER_CONFLICT estable sin detalles internos del atributo', async () => {
  const conflict = new ProductMasterConflictError([{
    conflictType: 'ATTRIBUTE',
    scope: 'SKU_ATTRIBUTE',
    sku: 'SKU-SENSIBLE',
    field: 'productUrl',
    values: ['https://private.invalid/one', 'https://private.invalid/two'],
  }]);
  const app = createTestApp({
    loadMaster: async () => {
      throw conflict;
    },
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/products/master?brand=Marca`);
    assert.equal(response.status, 409);
    const payload = await response.json();
    assert.deepEqual(payload, {
      error: {
        code: 'PRODUCT_MASTER_CONFLICT',
        message: 'El Maestro Producto contiene valores en conflicto que requieren definición funcional.',
      },
    });
    assert.doesNotMatch(JSON.stringify(payload), /SKU-SENSIBLE|productUrl|private\.invalid/);
  });
});

test('mantiene el HTTP público sanitizado ante el fallo Dataverse Product', async () => {
  const error = new DataverseRequestError('mensaje OData que no debe publicarse');
  const app = createTestApp({
    loadMaster: async () => {
      throw error;
    },
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/products/master?brand=Marca`);
    assert.equal(response.status, 502);
    const payload = await response.json();
    assert.deepEqual(payload, {
      error: {
        code: 'DATAVERSE_REQUEST_FAILED',
        message: 'No fue posible procesar la solicitud.',
      },
    });
    assert.doesNotMatch(JSON.stringify(payload), /mensaje OData/);
  });
});

test('mantiene Maestro Cliente sin regresión al compartir la aplicación', async () => {
  const customer = {
    customerCode: 'C-001',
    customerName: 'Cliente Uno',
    country: 'Guatemala',
    customerType: 'Distribuidor',
  };
  const app = createApp({
    customerService: {
      search: async () => [customer],
      getByCode: async () => customer,
    },
    productService: { loadMaster: async () => [] },
    allowedOrigins: ['http://localhost:5173'],
    authenticator: { authenticate: async () => ({ subject: 'test-user' }) },
    rateLimiter: { check: async () => ({ allowed: true, retryAfterSeconds: 0 }) },
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/customers/search?type=code&q=C-001`);
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).customers, [customer]);
  });
});
