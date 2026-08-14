import { createServer } from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app/createApp.js';

const customer = Object.freeze({
  customerCode: 'C-001',
  customerName: 'Cliente Uno',
  country: 'Guatemala',
});

const createService = () => ({
  search: async () => [customer],
  getByCode: async (code) => (code === 'C-001' ? customer : null),
});

const createTestApp = (options) => createApp({
  authenticator: { authenticate: async () => ({ subject: 'test-user' }) },
  rateLimiter: { check: async () => ({ allowed: true, retryAfterSeconds: 0 }) },
  ...options,
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

test('expone búsqueda específica por código y nombre', async () => {
  const calls = [];
  const customerService = createService();
  customerService.search = async (type, query) => {
    calls.push({ type, query });
    return [customer];
  };
  const app = createTestApp({
    customerService,
    allowedOrigins: ['http://localhost:5173'],
  });

  await withServer(app, async (baseUrl) => {
    const codeResponse = await fetch(`${baseUrl}/api/customers/search?type=code&q=C-`);
    const nameResponse = await fetch(`${baseUrl}/api/customers/search?type=name&q=Uno`);
    assert.deepEqual((await codeResponse.json()).customers, [customer]);
    assert.deepEqual((await nameResponse.json()).customers, [customer]);
  });
  assert.deepEqual(calls, [
    { type: 'code', query: 'C-' },
    { type: 'name', query: 'Uno' },
  ]);
});

test('expone lectura específica y 404 para cliente inexistente', async () => {
  const app = createTestApp({
    customerService: createService(),
    allowedOrigins: ['http://localhost:5173'],
  });

  await withServer(app, async (baseUrl) => {
    const found = await fetch(`${baseUrl}/api/customers/C-001`);
    assert.deepEqual((await found.json()).customer, customer);
    const missing = await fetch(`${baseUrl}/api/customers/NO-EXISTE`);
    assert.equal(missing.status, 404);
  });
});

test('rechaza OData y parámetros arbitrarios enviados por frontend', async () => {
  const app = createTestApp({
    customerService: createService(),
    allowedOrigins: ['http://localhost:5173'],
  });

  await withServer(app, async (baseUrl) => {
    for (const parameter of [
      '%24select=client_secret',
      '%24filter=customertype%20eq%20999',
    ]) {
      const response = await fetch(
        `${baseUrl}/api/customers/search?type=code&q=C&${parameter}`,
      );
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error.code, 'INVALID_CUSTOMER_REQUEST');
    }
  });
});

test('CORS permite orígenes configurados, soporta preflight y nunca usa wildcard', async () => {
  const app = createTestApp({
    customerService: createService(),
    allowedOrigins: [
      'http://localhost:5173',
      'https://sell-through-ap.vercel.app',
    ],
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/customers/search?type=code&q=C`, {
      headers: { Origin: 'https://sell-through-ap.vercel.app' },
    });
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://sell-through-ap.vercel.app');
    assert.notEqual(response.headers.get('access-control-allow-origin'), '*');

    const preflight = await fetch(`${baseUrl}/api/customers/search`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5173' },
    });
    assert.equal(preflight.status, 204);
    assert.match(
      preflight.headers.get('access-control-allow-headers'),
      /Authorization/,
    );
  });
});

test('CORS rechaza orígenes no configurados', async () => {
  const app = createTestApp({
    customerService: createService(),
    allowedOrigins: ['http://localhost:5173'],
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/customers/search?type=code&q=C`, {
      headers: { Origin: 'https://unauthorized.example' },
    });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  });
});

test('errores internos no exponen secretos, tokens ni mensajes técnicos', async () => {
  const customerService = createService();
  customerService.search = async () => {
    const error = new Error('DV_CLIENT_SECRET=secret access_token=token-value');
    error.statusCode = 502;
    error.code = 'DATAVERSE_REQUEST_FAILED';
    throw error;
  };
  const app = createTestApp({
    customerService,
    allowedOrigins: ['http://localhost:5173'],
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/customers/search?type=code&q=C`);
    const payload = await response.json();
    const body = JSON.stringify(payload);
    assert.equal(response.status, 502);
    assert.deepEqual(payload, {
      error: {
        code: 'DATAVERSE_REQUEST_FAILED',
        message: 'No fue posible procesar la solicitud.',
      },
    });
    assert.doesNotMatch(body, /secret|token-value|DV_CLIENT_SECRET/);
  });
});
