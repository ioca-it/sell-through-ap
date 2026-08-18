import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyDataverseFailure,
  DATAVERSE_DIAGNOSTIC_IDS,
} from '../src/integrations/dataverse/dataverseDiagnostics.js';
import {
  createDataverseClient,
  DataverseRequestError,
} from '../src/integrations/dataverse/dataverseClient.js';

test('clasifica errores Dataverse con los siete identificadores seguros', () => {
  const cases = [
    {
      input: { status: 400, odataErrorMetadata: { code: 'BadRequest', message: 'Request rejected.' } },
      expected: DATAVERSE_DIAGNOSTIC_IDS.BAD_REQUEST,
    },
    {
      input: {
        status: 400,
        odataErrorMetadata: {
          code: 'ODataError',
          message: "Could not find a property named 'unknown_field' on type 'account'.",
        },
      },
      expected: DATAVERSE_DIAGNOSTIC_IDS.INVALID_FIELD_OR_FILTER,
    },
    { input: { status: 401 }, expected: DATAVERSE_DIAGNOSTIC_IDS.UNAUTHORIZED },
    { input: { status: 403 }, expected: DATAVERSE_DIAGNOSTIC_IDS.FORBIDDEN },
    { input: { status: 429 }, expected: DATAVERSE_DIAGNOSTIC_IDS.RATE_LIMITED },
    { input: { status: 503 }, expected: DATAVERSE_DIAGNOSTIC_IDS.UPSTREAM_ERROR },
    { input: { networkError: true }, expected: DATAVERSE_DIAGNOSTIC_IDS.NETWORK_ERROR },
  ];

  for (const { input, expected } of cases) {
    assert.equal(classifyDataverseFailure(input), expected);
  }
});

test('registra solo metadata derivada sin secretos, PII, query ni error crudo', async () => {
  const originalWarn = console.warn;
  const logLines = [];
  console.warn = (...values) => logLines.push(values.join(' '));
  const client = createDataverseClient({
    baseUrl: 'https://organization.crm.dynamics.com',
    tokenProvider: { getToken: async () => 'access-token-sensitive' },
    fetchImpl: async () => ({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: 'secret-client-code-CL0000041',
          message: [
            "Could not find a property named 'new_tipocliente'.",
            'Customer CL0000041 Customer Name',
            'Authorization: Bearer jwt-sensitive',
            'client_secret=secret-sensitive',
            'Cookie=session-sensitive',
            'https://organization.crm.dynamics.com/api/data/v9.2/accounts?$filter=sensitive',
          ].join(' '),
        },
      }),
    }),
  });

  try {
    await assert.rejects(
      client.retrieveMultiple({
        entitySet: 'accounts',
        filter: "contains(new_codigocliente,'CL0000041')",
      }),
      (error) => error instanceof DataverseRequestError,
    );
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(logLines.length, 1);
  const event = JSON.parse(logLines[0]);
  assert.deepEqual(event, {
    component: 'DataverseClient',
    diagnosticId: 'DATAVERSE_INVALID_FIELD_OR_FILTER',
    operation: 'retrieveMultiple',
    failureType: 'http',
    upstreamStatus: 400,
    structuredErrorMetadata: true,
  });
  assert.doesNotMatch(
    logLines[0],
    /access-token-sensitive|Authorization|jwt-sensitive|client_secret|secret-sensitive|Cookie|session-sensitive|CL0000041|Customer Name|new_tipocliente|\$filter|https:\/\//,
  );
});

test('clasifica fallos de transporte sin registrar el error o stack', async () => {
  const events = [];
  const client = createDataverseClient({
    baseUrl: 'https://organization.crm.dynamics.com',
    tokenProvider: { getToken: async () => 'access-token-sensitive' },
    diagnosticLogger: (event) => events.push(event),
    fetchImpl: async () => {
      const error = new TypeError([
        'network secret CL0000041',
        'https://organization.crm.dynamics.com/api/data/v9.2/accounts?$filter=sensitive',
        'Authorization Bearer access-token-sensitive',
      ].join(' '));
      error.stack = 'stack with Authorization Bearer jwt-sensitive tenant-sensitive';
      throw error;
    },
  });

  await assert.rejects(
    client.retrieveMultiple({ entitySet: 'accounts' }),
    (error) => error instanceof DataverseRequestError,
  );
  assert.deepEqual(events, [{
    component: 'DataverseClient',
    diagnosticId: 'DATAVERSE_NETWORK_ERROR',
    operation: 'retrieveMultiple',
    failureType: 'network',
    structuredErrorMetadata: false,
    networkCategory: 'NETWORK_FETCH_FAILED',
    timeoutConfiguredMs: 30000,
    tokenAcquired: true,
    baseUrlConfigured: true,
    baseUrlProtocolValid: true,
  }]);
  assert.doesNotMatch(
    JSON.stringify(events),
    /secret|CL0000041|Authorization|stack|jwt-sensitive|tenant|\$filter|https:\/\//,
  );
});
