import { createServer } from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
} from 'jose';
import { createApp } from '../src/app/createApp.js';
import { createCustomerApiAuthenticator } from '../src/auth/customerApiAuthenticator.js';
import { createRateLimiter } from '../src/security/rateLimiter.js';

const tenantId = 'auth-tenant-id';
const audience = 'customer-api-client-id';
const requiredScope = 'Customers.Read';
const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
const { publicKey, privateKey } = await generateKeyPair('RS256');
const { privateKey: untrustedPrivateKey } = await generateKeyPair('RS256');
const publicJwk = await exportJWK(publicKey);
publicJwk.kid = 'security-test-key';
publicJwk.alg = 'RS256';
publicJwk.use = 'sig';
const jwks = createLocalJWKSet({ keys: [publicJwk] });

const authenticator = createCustomerApiAuthenticator({
  tenantId,
  audience,
  requiredScope,
  jwks,
});

const signToken = ({
  tokenIssuer = issuer,
  tokenAudience = audience,
  tokenTenant = tenantId,
  scope = requiredScope,
  expirationTime = '5m',
  signingKey = privateKey,
} = {}) => new SignJWT({
  tid: tokenTenant,
  scp: scope,
  oid: 'user-object-id',
})
  .setProtectedHeader({ alg: 'RS256', kid: 'security-test-key' })
  .setIssuer(tokenIssuer)
  .setAudience(tokenAudience)
  .setSubject('user-subject')
  .setIssuedAt()
  .setExpirationTime(expirationTime)
  .sign(signingKey);

const customer = Object.freeze({
  customerCode: 'C-001',
  customerName: 'Cliente Uno',
  country: 'Guatemala',
});

const createService = () => ({
  search: async () => [customer],
  getByCode: async () => customer,
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

const createSecureApp = ({
  customerService = createService(),
  requestAuthenticator = authenticator,
  rateLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 100 }),
} = {}) => createApp({
  customerService,
  allowedOrigins: [
    'http://localhost:5173',
    'https://sell-through-ap.vercel.app',
  ],
  authenticator: requestAuthenticator,
  rateLimiter,
});

test('/health es anónimo y no consulta auth, rate limit ni Customer', async () => {
  const calls = { auth: 0, rate: 0, customer: 0 };
  const app = createSecureApp({
    customerService: {
      search: async () => { calls.customer += 1; },
      getByCode: async () => { calls.customer += 1; },
    },
    requestAuthenticator: {
      authenticate: async () => { calls.auth += 1; },
    },
    rateLimiter: {
      check: async () => { calls.rate += 1; },
    },
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });
  assert.deepEqual(calls, { auth: 0, rate: 0, customer: 0 });
});

test('Customer API sin Authorization responde 401 aunque CORS permita el origen', async () => {
  const app = createSecureApp();

  await withServer(app, async (baseUrl) => {
    const searchResponse = await fetch(`${baseUrl}/api/customers/search?type=code&q=C`, {
      headers: { Origin: 'https://sell-through-ap.vercel.app' },
    });
    assert.equal(searchResponse.status, 401);
    assert.equal(searchResponse.headers.get('access-control-allow-origin'), 'https://sell-through-ap.vercel.app');
    assert.equal((await fetch(`${baseUrl}/api/customers/C-001`)).status, 401);
  });
});

test('rate limit por IP también protege intentos sin autenticación', async () => {
  const app = createSecureApp({
    rateLimiter: createRateLimiter({ windowMs: 60000, maxRequests: 1 }),
  });

  await withServer(app, async (baseUrl) => {
    const url = `${baseUrl}/api/customers/search?type=code&q=C`;
    assert.equal((await fetch(url)).status, 401);
    const rejected = await fetch(url);
    assert.equal(rejected.status, 429);
    assert.ok(Number(rejected.headers.get('retry-after')) >= 1);
  });
});

test('token inválido responde 401 sin exponerlo en respuesta o logs', async () => {
  const sensitiveToken = await signToken({ signingKey: untrustedPrivateKey });
  const capturedLogs = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...values) => capturedLogs.push(values.join(' '));
  console.error = (...values) => capturedLogs.push(values.join(' '));

  try {
    await withServer(createSecureApp(), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/customers/search?type=code&q=C`, {
        headers: { Authorization: `Bearer ${sensitiveToken}` },
      });
      const body = JSON.stringify(await response.json());
      assert.equal(response.status, 401);
      assert.ok(!body.includes(sensitiveToken));
    });
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
  assert.equal(capturedLogs.join(''), '');
});

test('token válido sin scope responde 403', async () => {
  const token = await signToken({ scope: 'Other.Scope' });

  await withServer(createSecureApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/customers/search?type=name&q=Uno`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, 'INSUFFICIENT_SCOPE');
  });
});

test('token válido con scope permite Customer API', async () => {
  const token = await signToken();

  await withServer(createSecureApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/customers/search?type=code&q=C`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Origin: 'http://localhost:5173',
      },
    });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).customers, [customer]);
  });
});

test('rechaza token expirado, issuer, audience y tenant inválidos', async (context) => {
  const invalidTokens = [
    await signToken({ expirationTime: Math.floor(Date.now() / 1000) - 60 }),
    await signToken({ tokenIssuer: 'https://issuer.invalid/v2.0' }),
    await signToken({ tokenAudience: 'other-api' }),
    await signToken({ tokenTenant: 'other-tenant' }),
  ];

  for (const [index, token] of invalidTokens.entries()) {
    await context.test(`token inválido ${index + 1}`, async () => {
      await assert.rejects(
        authenticator.authenticate({ headers: { authorization: `Bearer ${token}` } }),
        (error) => error.statusCode === 401 && error.code === 'AUTHENTICATION_REQUIRED',
      );
    });
  }
});

test('rate limit responde 429 con Retry-After y no afecta /health', async () => {
  const token = await signToken();
  const app = createSecureApp({
    rateLimiter: createRateLimiter({ windowMs: 60000, maxRequests: 1 }),
  });

  await withServer(app, async (baseUrl) => {
    const options = { headers: { Authorization: `Bearer ${token}` } };
    assert.equal((await fetch(`${baseUrl}/api/customers/search?type=code&q=C`, options)).status, 200);
    const rejected = await fetch(`${baseUrl}/api/customers/search?type=code&q=C`, options);
    assert.equal(rejected.status, 429);
    assert.ok(Number(rejected.headers.get('retry-after')) >= 1);
    assert.equal((await fetch(`${baseUrl}/health`)).status, 200);
  });
});

test('customerCode con percent-encoding malformado responde 400', async () => {
  const token = await signToken();

  await withServer(createSecureApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/customers/%E0%A4%A`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'INVALID_CUSTOMER_REQUEST');
  });
});
