import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDataverseClient,
  DATAVERSE_FORMATTED_VALUE_ANNOTATION,
  DataverseRequestError,
} from '../src/integrations/dataverse/dataverseClient.js';

const jsonResponse = (payload, { contentType = 'application/json; charset=utf-8' } = {}) => (
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': contentType },
  })
);

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
    includeAnnotations: [DATAVERSE_FORMATTED_VALUE_ANNOTATION],
  }), [{ id: 1 }]);

  assert.equal(request.options.headers.Authorization, 'Bearer access-token');
  assert.equal(request.options.headers['OData-MaxVersion'], '4.0');
  assert.equal(request.options.headers['OData-Version'], '4.0');
  assert.equal(
    request.options.headers.Prefer,
    'odata.include-annotations="OData.Community.Display.V1.FormattedValue"',
  );
  assert.equal(request.url.searchParams.get('$select'), 'field_one,field_two');
  assert.equal(request.url.searchParams.get('$top'), '20');
});

test('omite Prefer cuando el consumidor no solicita anotaciones', async () => {
  let request;
  const client = createDataverseClient({
    baseUrl: 'https://organization.crm.dynamics.com',
    tokenProvider: { getToken: async () => 'access-token' },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ value: [] }) };
    },
  });

  assert.deepEqual(await client.retrieveMultiple({ entitySet: 'accounts' }), []);

  assert.equal(Object.hasOwn(request.options.headers, 'Prefer'), false);
});

test('acepta el contrato estándar Dataverse 200 con @odata.context y value poblado', async () => {
  const client = createDataverseClient({
    baseUrl: 'https://organization.crm.dynamics.com',
    tokenProvider: { getToken: async () => 'access-token' },
    fetchImpl: async () => jsonResponse({
      '@odata.context': 'https://organization.crm.dynamics.com/api/data/v9.2/$metadata#productpricelevels',
      value: [{ syntheticId: 1 }],
    }),
  });

  assert.deepEqual(
    await client.retrieveMultiple({ entitySet: 'productpricelevels' }),
    [{ syntheticId: 1 }],
  );
});

test('acepta el contrato estándar Dataverse 200 con value vacío', async () => {
  const client = createDataverseClient({
    baseUrl: 'https://organization.crm.dynamics.com',
    tokenProvider: { getToken: async () => 'access-token' },
    fetchImpl: async () => jsonResponse({
      '@odata.context': 'https://organization.crm.dynamics.com/api/data/v9.2/$metadata#accounts',
      value: [],
    }),
  });

  assert.deepEqual(await client.retrieveMultiple({ entitySet: 'accounts' }), []);
});

test('acepta JSON válido aunque Content-Type no sea JSON porque no lo usa como condición', async () => {
  const events = [];
  const client = createDataverseClient({
    baseUrl: 'https://organization.crm.dynamics.com',
    tokenProvider: { getToken: async () => 'access-token' },
    diagnosticLogger: (event) => events.push(event),
    fetchImpl: async () => jsonResponse({ value: [{ syntheticId: 1 }] }, {
      contentType: 'text/plain',
    }),
  });

  assert.deepEqual(await client.retrieveMultiple({ entitySet: 'accounts' }), [
    { syntheticId: 1 },
  ]);
  assert.deepEqual(events, []);
});

test('retrieveAll sigue la paginación Dataverse sin aceptar otro origen', async () => {
  const requests = [];
  const client = createDataverseClient({
    baseUrl: 'https://organization.crm.dynamics.com',
    tokenProvider: { getToken: async () => 'access-token' },
    fetchImpl: async (url) => {
      requests.push(url);
      if (requests.length === 1) {
        return jsonResponse({
          '@odata.context': 'https://organization.crm.dynamics.com/api/data/v9.2/$metadata#accounts',
          value: [{ id: 1 }],
          '@odata.nextLink': 'https://organization.crm.dynamics.com/api/data/v9.2/accounts?$skiptoken=next',
        });
      }
      return jsonResponse({ value: [{ id: 2 }] });
    },
  });

  assert.deepEqual(await client.retrieveAll({ entitySet: 'accounts' }), [
    { id: 1 },
    { id: 2 },
  ]);
  assert.equal(requests.length, 2);

  const invalidClient = createDataverseClient({
    baseUrl: 'https://organization.crm.dynamics.com',
    tokenProvider: { getToken: async () => 'access-token' },
    fetchImpl: async () => jsonResponse({
        value: [],
        '@odata.nextLink': 'https://attacker.invalid/api/data/v9.2/accounts',
    }),
  });
  await assert.rejects(
    invalidClient.retrieveAll({ entitySet: 'accounts' }),
    DataverseRequestError,
  );
});

test('clasifica 200 con JSON válido y shape inesperado como invalid_response', async () => {
  const events = [];
  const client = createDataverseClient({
    baseUrl: 'https://organization.crm.dynamics.com',
    tokenProvider: { getToken: async () => 'access-token' },
    diagnosticLogger: (event) => events.push(event),
    fetchImpl: async () => jsonResponse({
      value: {},
      '@odata.nextLink': 'https://organization.crm.dynamics.com/api/data/v9.2/productpricelevels?$skiptoken=unused',
    }, { contentType: 'text/plain' }),
  });

  await assert.rejects(
    client.retrieveMultiple({ entitySet: 'productpricelevels' }),
    DataverseRequestError,
  );
  assert.deepEqual(events, [{
    component: 'DataverseClient',
    diagnosticId: 'DATAVERSE_UPSTREAM_ERROR',
    operation: 'retrieveMultiple',
    failureType: 'invalid_response',
    upstreamStatus: 200,
    structuredErrorMetadata: false,
    hasValueArray: false,
    hasNextLink: true,
    bodyType: 'object',
    contentTypeValid: false,
    parseSuccess: true,
  }]);
});

test('clasifica 200 con JSON inválido como invalid_response sin registrar el body', async () => {
  const events = [];
  const client = createDataverseClient({
    baseUrl: 'https://organization.crm.dynamics.com',
    tokenProvider: { getToken: async () => 'access-token' },
    diagnosticLogger: (event) => events.push(event),
    fetchImpl: async () => new Response('{json-invalido', {
      status: 200,
      headers: { 'Content-Type': 'application/json; odata.metadata=minimal' },
    }),
  });

  await assert.rejects(
    client.retrieveMultiple({ entitySet: 'productpricelevels' }),
    DataverseRequestError,
  );
  assert.deepEqual(events, [{
    component: 'DataverseClient',
    diagnosticId: 'DATAVERSE_UPSTREAM_ERROR',
    operation: 'retrieveMultiple',
    failureType: 'invalid_response',
    upstreamStatus: 200,
    structuredErrorMetadata: false,
    hasValueArray: false,
    hasNextLink: false,
    bodyType: 'unparsed',
    contentTypeValid: true,
    parseSuccess: false,
  }]);
  assert.doesNotMatch(JSON.stringify(events), /json-invalido/);
});

test('clasifica body vacío 200 como fallo de parse JSON', async () => {
  const events = [];
  const client = createDataverseClient({
    baseUrl: 'https://organization.crm.dynamics.com',
    tokenProvider: { getToken: async () => 'access-token' },
    diagnosticLogger: (event) => events.push(event),
    fetchImpl: async () => new Response('', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  });

  await assert.rejects(
    client.retrieveMultiple({ entitySet: 'accounts' }),
    DataverseRequestError,
  );
  assert.equal(events[0].failureType, 'invalid_response');
  assert.equal(events[0].parseSuccess, false);
  assert.equal(events[0].bodyType, 'unparsed');
  assert.equal(events[0].contentTypeValid, true);
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

test('expone solo las operaciones productivas de lectura Dataverse', () => {
  const client = createDataverseClient({
    baseUrl: 'https://org.crm.dynamics.com',
    tokenProvider: { getToken: async () => 'access-token' },
    fetchImpl: async () => ({ ok: true, json: async () => ({ value: [] }) }),
  });

  assert.deepEqual(Object.keys(client), ['retrieveMultiple', 'retrieveAll']);
});
