import { createServer } from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app/createApp.js';

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
    loadMaster: async () => {
      calls += 1;
      return [product];
    },
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/products/master`);
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).products, [product]);
  });
  assert.equal(calls, 1);
});

test('rechaza OData y cualquier parámetro arbitrario del frontend', async () => {
  const app = createTestApp({ loadMaster: async () => [product] });
  await withServer(app, async (baseUrl) => {
    for (const query of [
      '%24filter=crbbe_origen%20eq%20USA',
      '%24select=amount',
      'company=IOCA',
    ]) {
      const response = await fetch(`${baseUrl}/api/products/master?${query}`);
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
    assert.equal((await fetch(`${baseUrl}/api/products/master`)).status, 200);
  });
  assert.equal(authentications, 1);
});

test('publica conflicto sin elegir, sumar o promediar un precio', async () => {
  const conflict = new Error('Conflicto funcional pendiente');
  conflict.code = 'PRODUCT_MASTER_CONFLICT';
  conflict.statusCode = 409;
  const app = createTestApp({
    loadMaster: async () => {
      throw conflict;
    },
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/products/master`);
    assert.equal(response.status, 409);
    assert.equal((await response.json()).error.code, 'PRODUCT_MASTER_CONFLICT');
  });
});
