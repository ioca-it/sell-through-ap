import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDataverseClient,
  DataverseRequestError,
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

test('emite la categoría inválida sanitizada sin ampliar el error público', async () => {
  const events = [];
  const client = createDataverseClient({
    baseUrl: 'https://organization.crm.dynamics.com',
    tokenProvider: { getToken: async () => 'access-token' },
    diagnosticLogger: (event) => events.push(event),
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
    (error) => error instanceof DataverseRequestError
      && error.code === 'DATAVERSE_REQUEST_FAILED'
      && Object.keys(error).every((key) => key !== 'diagnosticId'),
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].diagnosticId, 'DATAVERSE_INVALID_FIELD_OR_FILTER');
  assert.equal(events[0].upstreamStatus, 400);
});
