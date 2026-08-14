import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDataverseClient,
  DataverseRequestError,
  isInvalidFieldOrFilterError,
} from '../src/integrations/dataverse/dataverseClient.js';

test('centraliza token, headers OData y parámetros internos', async () => {
  let request;
  const client = createDataverseClient({
    baseUrl: 'https://organization.crm.dynamics.com',
    tokenProvider: { getToken: async () => 'access-token' },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ value: [{ id: 1 }] }) };
    },
  });

  assert.deepEqual(await client.retrieveMultiple({
    entitySet: 'accounts',
    select: ['field_one', 'field_two'],
    filter: "contains(field_one,'value')",
    orderBy: 'field_one asc',
    top: 20,
  }), [{ id: 1 }]);

  assert.equal(request.options.headers.Authorization, 'Bearer access-token');
  assert.equal(request.options.headers['OData-MaxVersion'], '4.0');
  assert.equal(request.options.headers['OData-Version'], '4.0');
  assert.equal(request.url.searchParams.get('$select'), 'field_one,field_two');
  assert.equal(request.url.searchParams.get('$top'), '20');
});

test('normaliza errores Dataverse sin propagar respuestas técnicas', async () => {
  const client = createDataverseClient({
    baseUrl: 'https://organization.crm.dynamics.com',
    tokenProvider: { getToken: async () => 'access-token' },
    fetchImpl: async () => ({ ok: false, status: 500 }),
  });

  await assert.rejects(
    client.retrieveMultiple({ entitySet: 'accounts' }),
    (error) => error instanceof DataverseRequestError
      && error.code === 'DATAVERSE_REQUEST_FAILED'
      && !error.message.includes('500'),
  );
});

test('rechaza Entity Sets arbitrarios inválidos', async () => {
  const client = createDataverseClient({
    baseUrl: 'https://organization.crm.dynamics.com',
    tokenProvider: { getToken: async () => 'access-token' },
    fetchImpl: async () => ({ ok: true, json: async () => ({ value: [] }) }),
  });

  await assert.rejects(
    client.retrieveMultiple({ entitySet: 'accounts?$select=secret' }),
    /Entity Set inválido/,
  );
});

test('cancela por timeout y devuelve un error Dataverse normalizado', async () => {
  const client = createDataverseClient({
    baseUrl: 'https://organization.crm.dynamics.com',
    tokenProvider: { getToken: async () => 'access-token' },
    timeoutMs: 1,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('aborted')));
    }),
  });

  await assert.rejects(
    client.retrieveMultiple({ entitySet: 'accounts' }),
    (error) => error instanceof DataverseRequestError
      && error.message === 'No fue posible consultar Dataverse.',
  );
});

test('conserva internamente la categoría inválida sin ampliar el error público', async () => {
  const client = createDataverseClient({
    baseUrl: 'https://organization.crm.dynamics.com',
    tokenProvider: { getToken: async () => 'access-token' },
    diagnosticLogger: () => {},
    fetchImpl: async () => ({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: 'BadRequest',
          message: "Could not find a property named 'unknown_field'.",
        },
      }),
    }),
  });

  await assert.rejects(
    client.retrieveMultiple({ entitySet: 'accounts' }),
    (error) => isInvalidFieldOrFilterError(error)
      && error.code === 'DATAVERSE_REQUEST_FAILED'
      && Object.keys(error).every((key) => key !== 'diagnosticId'),
  );
});

test('los probes temporales devuelven PASS/FAIL sin leer payloads ni emitir diagnósticos', async () => {
  const events = [];
  let bodyRead = false;
  let bodyCancelCount = 0;
  let requestCount = 0;
  const client = createDataverseClient({
    baseUrl: 'https://organization.crm.dynamics.com',
    tokenProvider: { getToken: async () => 'access-token-sensitive' },
    diagnosticLogger: (event) => events.push(event),
    fetchImpl: async () => {
      requestCount += 1;
      if (requestCount === 1) {
        return {
          ok: false,
          status: 400,
          body: { cancel: async () => { bodyCancelCount += 1; } },
          json: async () => {
            bodyRead = true;
            return { error: { message: 'sensitive upstream payload' } };
          },
        };
      }
      return {
        ok: true,
        status: 200,
        body: { cancel: async () => { bodyCancelCount += 1; } },
        json: async () => {
          bodyRead = true;
          return { value: [{ name: 'Sensitive Customer' }] };
        },
      };
    },
  });

  assert.equal(await client.probeRetrieveMultiple({ entitySet: 'accounts', top: 1 }), false);
  assert.equal(await client.probeRetrieveMultiple({ entitySet: 'accounts', top: 1 }), true);
  assert.equal(bodyRead, false);
  assert.equal(bodyCancelCount, 2);
  assert.deepEqual(events, []);
});
