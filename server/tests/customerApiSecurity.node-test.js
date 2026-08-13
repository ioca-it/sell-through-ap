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

const createAuthenticator = ({ diagnosticLogger = () => {} } = {}) => createCustomerApiAuthenticator({
  tenantId,
  audience,
  requiredScope,
  jwks,
  diagnosticLogger,
});
const authenticator = createAuthenticator();

const signToken = ({
  tokenIssuer = issuer,
  tokenAudience = audience,
  tokenTenant = tenantId,
  scope = requiredScope,
  expirationTime = '5m',
  signingKey = privateKey,
  tokenSubject = 'user-subject',
  tokenObjectId = 'user-object-id',
  tokenUsername,
  tokenSecret,
} = {}) => new SignJWT({
  tid: tokenTenant,
  scp: scope,
  oid: tokenObjectId,
  ...(tokenUsername ? { preferred_username: tokenUsername } : {}),
  ...(tokenSecret ? { diagnosticSecret: tokenSecret } : {}),
})
  .setProtectedHeader({ alg: 'RS256', kid: 'security-test-key' })
  .setIssuer(tokenIssuer)
  .setAudience(tokenAudience)
  .setSubject(tokenSubject)
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
  const diagnostics = [];
  const app = createSecureApp({
    requestAuthenticator: createAuthenticator({
      diagnosticLogger: (reason) => diagnostics.push(reason),
    }),
  });

  await withServer(app, async (baseUrl) => {
    const searchResponse = await fetch(`${baseUrl}/api/customers/search?type=code&q=C`, {
      headers: { Origin: 'https://sell-through-ap.vercel.app' },
    });
    assert.equal(searchResponse.status, 401);
    assert.equal(searchResponse.headers.get('access-control-allow-origin'), 'https://sell-through-ap.vercel.app');
    assert.deepEqual(await searchResponse.json(), {
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Se requiere autenticación válida.',
      },
    });
    const byCodeResponse = await fetch(`${baseUrl}/api/customers/C-001`);
    assert.equal(byCodeResponse.status, 401);
    assert.deepEqual(await byCodeResponse.json(), {
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Se requiere autenticación válida.',
      },
    });
  });
  assert.deepEqual(diagnostics, ['JWT_MISSING_BEARER', 'JWT_MISSING_BEARER']);
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
  const sensitiveValues = {
    tokenSubject: 'sensitive-user-subject',
    tokenObjectId: 'sensitive-user-object-id',
    tokenUsername: 'sensitive.user@example.com',
    tokenSecret: 'sensitive-client-secret',
  };
  const sensitiveToken = await signToken({
    signingKey: untrustedPrivateKey,
    ...sensitiveValues,
  });
  const capturedLogs = [];
  const originalWarn = console.warn;
  console.warn = (...values) => capturedLogs.push(values.join(' '));
  const requestAuthenticator = createCustomerApiAuthenticator({
    tenantId,
    audience,
    requiredScope,
    jwks,
  });

  try {
    await withServer(createSecureApp({ requestAuthenticator }), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/customers/search?type=code&q=C`, {
        headers: { Authorization: `Bearer ${sensitiveToken}` },
      });
      const body = await response.json();
      assert.equal(response.status, 401);
      assert.deepEqual(body, {
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Se requiere autenticación válida.',
        },
      });
      assert.ok(!JSON.stringify(body).includes(sensitiveToken));
    });
  } finally {
    console.warn = originalWarn;
  }

  assert.deepEqual(capturedLogs, [
    '[CustomerApiAuthenticator] JWT_SIGNATURE_REJECTED',
  ]);
  const loggedText = capturedLogs.join(' ');
  for (const sensitiveValue of [
    sensitiveToken,
    `Bearer ${sensitiveToken}`,
    'Authorization',
    ...Object.values(sensitiveValues),
  ]) {
    assert.ok(!loggedText.includes(sensitiveValue));
  }
});

test('token válido sin scope responde 403', async () => {
  const token = await signToken({ scope: 'Other.Scope' });
  const diagnostics = [];
  const requestAuthenticator = createAuthenticator({
    diagnosticLogger: (reason) => diagnostics.push(reason),
  });

  await withServer(createSecureApp({ requestAuthenticator }), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/customers/search?type=name&q=Uno`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      error: {
        code: 'INSUFFICIENT_SCOPE',
        message: 'La identidad no tiene el permiso requerido.',
      },
    });
  });
  assert.deepEqual(diagnostics, ['JWT_SCOPE_MISSING']);
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
    {
      token: await signToken({ expirationTime: Math.floor(Date.now() / 1000) - 60 }),
      reason: 'JWT_EXPIRED',
    },
    {
      token: await signToken({ tokenIssuer: 'https://issuer.invalid/v2.0' }),
      reason: 'JWT_ISSUER_REJECTED',
    },
    {
      token: await signToken({ tokenAudience: 'other-api' }),
      reason: 'JWT_AUDIENCE_REJECTED',
    },
    {
      token: await signToken({ tokenTenant: 'other-tenant' }),
      reason: 'JWT_TENANT_MISMATCH',
    },
  ];

  for (const [index, { token, reason }] of invalidTokens.entries()) {
    await context.test(`token inválido ${index + 1}`, async () => {
      const diagnostics = [];
      const diagnosticAuthenticator = createAuthenticator({
        diagnosticLogger: (diagnosticReason) => diagnostics.push(diagnosticReason),
      });
      await assert.rejects(
        diagnosticAuthenticator.authenticate({
          headers: { authorization: `Bearer ${token}` },
        }),
        (error) => error.statusCode === 401 && error.code === 'AUTHENTICATION_REQUIRED',
      );
      assert.deepEqual(diagnostics, [reason]);
    });
  }
});

test('token malformado usa diagnóstico genérico sin exponer su contenido', async () => {
  const malformedToken = 'not-a-complete-jwt';
  const diagnostics = [];
  const diagnosticAuthenticator = createAuthenticator({
    diagnosticLogger: (reason) => diagnostics.push(reason),
  });

  await assert.rejects(
    diagnosticAuthenticator.authenticate({
      headers: { authorization: `Bearer ${malformedToken}` },
    }),
    (error) => error.statusCode === 401 && error.code === 'AUTHENTICATION_REQUIRED',
  );
  assert.deepEqual(diagnostics, ['JWT_VERIFICATION_REJECTED']);
  assert.ok(!diagnostics.join(' ').includes(malformedToken));
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
