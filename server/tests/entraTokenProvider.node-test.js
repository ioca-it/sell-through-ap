import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEntraTokenProvider,
  EntraAuthenticationError,
} from '../src/auth/entraTokenProvider.js';

const configuration = {
  tenantId: 'tenant-id',
  clientId: 'client-id',
  clientSecret: 'client-secret',
  dataverseBaseUrl: 'https://organization.crm.dynamics.com',
};

test('solicita client_credentials con scope derivado y sin hardcodear la organización', async () => {
  let request;
  const provider = createEntraTokenProvider({
    ...configuration,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        json: async () => ({ access_token: 'token-value', expires_in: 3600 }),
      };
    },
  });

  assert.equal(await provider.getToken(), 'token-value');
  assert.equal(
    request.url,
    'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token',
  );
  assert.equal(request.options.body.get('grant_type'), 'client_credentials');
  assert.equal(
    request.options.body.get('scope'),
    'https://organization.crm.dynamics.com/.default',
  );
});

test('reutiliza token en cache y lo renueva al alcanzar el margen de seguridad', async () => {
  let currentTime = 0;
  let calls = 0;
  const provider = createEntraTokenProvider({
    ...configuration,
    now: () => currentTime,
    safetyMarginSeconds: 60,
    fetchImpl: async () => {
      calls += 1;
      return {
        ok: true,
        json: async () => ({ access_token: `token-${calls}`, expires_in: 120 }),
      };
    },
  });

  assert.equal(await provider.getToken(), 'token-1');
  currentTime = 59000;
  assert.equal(await provider.getToken(), 'token-1');
  currentTime = 60000;
  assert.equal(await provider.getToken(), 'token-2');
  assert.equal(calls, 2);
});

test('comparte una solicitud Entra concurrente', async () => {
  let calls = 0;
  const provider = createEntraTokenProvider({
    ...configuration,
    fetchImpl: async () => {
      calls += 1;
      return {
        ok: true,
        json: async () => ({ access_token: 'shared-token', expires_in: 3600 }),
      };
    },
  });

  assert.deepEqual(await Promise.all([provider.getToken(), provider.getToken()]), [
    'shared-token',
    'shared-token',
  ]);
  assert.equal(calls, 1);
});

test('normaliza errores Entra sin incluir respuesta ni secreto', async () => {
  const provider = createEntraTokenProvider({
    ...configuration,
    fetchImpl: async () => ({ ok: false, status: 401 }),
  });

  await assert.rejects(provider.getToken(), (error) => {
    assert.ok(error instanceof EntraAuthenticationError);
    assert.equal(error.statusCode, 502);
    assert.doesNotMatch(error.message, /client-secret|401/);
    return true;
  });
});
