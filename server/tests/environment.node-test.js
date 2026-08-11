import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveDataverseScope,
  loadEnvironment,
} from '../src/config/environment.js';

const validEnvironment = () => ({
  AUTH_TENANT_ID: 'auth-tenant-test',
  AUTH_API_CLIENT_ID: 'auth-api-client-test',
  AUTH_REQUIRED_SCOPE: 'Customers.Read',
  DV_TENANT_ID: 'tenant-test',
  DV_CLIENT_ID: 'client-test',
  DV_CLIENT_SECRET: 'secret-test',
  DV_BASE_URL: 'https://organization.crm.dynamics.com/',
  ALLOWED_ORIGINS: 'http://localhost:5173,https://sell-through-ap.vercel.app',
  RATE_LIMIT_WINDOW_MS: '60000',
  RATE_LIMIT_MAX_REQUESTS: '60',
  PORT: '4100',
});

test('loadEnvironment exige toda la configuración backend sensible', () => {
  for (const key of [
    'AUTH_TENANT_ID',
    'AUTH_API_CLIENT_ID',
    'AUTH_REQUIRED_SCOPE',
    'DV_TENANT_ID',
    'DV_CLIENT_ID',
    'DV_CLIENT_SECRET',
    'DV_BASE_URL',
    'ALLOWED_ORIGINS',
    'RATE_LIMIT_WINDOW_MS',
    'RATE_LIMIT_MAX_REQUESTS',
  ]) {
    const environment = validEnvironment();
    delete environment[key];
    assert.throws(() => loadEnvironment(environment), new RegExp(key));
  }
});

test('deriva scope desde el origen de DV_BASE_URL', () => {
  assert.equal(
    deriveDataverseScope('https://organization.crm.dynamics.com/some/path'),
    'https://organization.crm.dynamics.com/.default',
  );
});

test('normaliza configuración portable y orígenes CORS explícitos', () => {
  const config = loadEnvironment(validEnvironment());

  assert.equal(config.port, 4100);
  assert.equal(config.dataverse.baseUrl, 'https://organization.crm.dynamics.com');
  assert.equal(config.dataverse.scope, 'https://organization.crm.dynamics.com/.default');
  assert.deepEqual(config.auth, {
    tenantId: 'auth-tenant-test',
    audience: 'auth-api-client-test',
    requiredScope: 'Customers.Read',
  });
  assert.deepEqual(config.rateLimit, { windowMs: 60000, maxRequests: 60 });
  assert.deepEqual(config.allowedOrigins, [
    'http://localhost:5173',
    'https://sell-through-ap.vercel.app',
  ]);
});

test('rechaza wildcard CORS y DV_BASE_URL sin HTTPS', () => {
  assert.throws(
    () => loadEnvironment({ ...validEnvironment(), ALLOWED_ORIGINS: '*' }),
    /no admite/,
  );
  assert.throws(
    () => loadEnvironment({ ...validEnvironment(), DV_BASE_URL: 'http://insecure.test' }),
    /HTTPS/,
  );
});

test('rechaza configuración inválida de rate limiting', () => {
  assert.throws(
    () => loadEnvironment({ ...validEnvironment(), RATE_LIMIT_MAX_REQUESTS: '0' }),
    /RATE_LIMIT_MAX_REQUESTS/,
  );
  assert.throws(
    () => loadEnvironment({ ...validEnvironment(), RATE_LIMIT_WINDOW_MS: 'abc' }),
    /RATE_LIMIT_WINDOW_MS/,
  );
});
