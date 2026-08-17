import test from 'node:test';
import assert from 'node:assert/strict';
import { createDataverseClient } from '../src/integrations/dataverse/dataverseClient.js';
import {
  resetProductPriceLevelMetadataDiagnosticForTests,
  runProductPriceLevelMetadataDiagnosticOnce,
} from '../src/integrations/dataverse/productPriceLevelMetadataDiagnostic.js';

test.beforeEach(() => {
  resetProductPriceLevelMetadataDiagnosticForTests();
});

test('registra únicamente metadata allowlist y nunca datos Product o autenticación', async () => {
  const events = [];
  const attributes = [{
    LogicalName: 'crbbe_producturl',
    SchemaName: 'crbbe_ProductUrl',
    AttributeType: 'String',
    IsValidForRead: true,
    sku: 'SKU-REAL',
    productName: 'PRODUCTO-REAL',
    storedUrl: 'https://private.invalid/product',
    Authorization: 'Bearer TOKEN-SENSIBLE',
    stack: 'STACK-SENSIBLE',
  }, {
    LogicalName: 'crbbe_internalreference',
    SchemaName: 'crbbe_InternalReference',
    AttributeType: 'String',
    IsValidForRead: false,
    payload: 'PAYLOAD-SENSIBLE',
  }];

  assert.equal(await runProductPriceLevelMetadataDiagnosticOnce({
    dataverseClient: {
      retrieveEntityAttributeMetadataCandidates: async (query) => {
        assert.deepEqual(query, {
          entitySetName: 'productpricelevels',
          nameConcepts: ['url', 'product', 'producto'],
        });
        return attributes;
      },
    },
    diagnosticLogger: (event) => events.push(event),
  }), true);

  assert.deepEqual(events, [{
    component: 'ProductPriceLevelMetadataDiagnostic',
    diagnosticId: 'PHASE1_048_PRODUCT_URL_METADATA',
    stage: 'TRIGGER',
    result: 'REACHED',
  }, {
    component: 'ProductPriceLevelMetadataDiagnostic',
    diagnosticId: 'PHASE1_048_PRODUCT_URL_METADATA',
    stage: 'CANDIDATES',
    result: 'FOUND',
    candidateCount: 2,
  }, {
    component: 'ProductPriceLevelMetadataDiagnostic',
    diagnosticId: 'PHASE1_048_PRODUCT_URL_METADATA',
    logicalName: 'crbbe_producturl',
    schemaName: 'crbbe_ProductUrl',
    attributeType: 'String',
    isValidForRead: true,
    result: 'CANDIDATE',
  }, {
    component: 'ProductPriceLevelMetadataDiagnostic',
    diagnosticId: 'PHASE1_048_PRODUCT_URL_METADATA',
    logicalName: 'crbbe_internalreference',
    schemaName: 'crbbe_InternalReference',
    attributeType: 'String',
    isValidForRead: false,
    result: 'NOT_CANDIDATE',
  }]);
  events.slice(2).forEach((event) => {
    assert.deepEqual(Object.keys(event), [
      'component',
      'diagnosticId',
      'logicalName',
      'schemaName',
      'attributeType',
      'isValidForRead',
      'result',
    ]);
  });

  const serialized = JSON.stringify(events);
  assert.doesNotMatch(serialized, /SKU-REAL|PRODUCTO-REAL|private\.invalid/);
  assert.doesNotMatch(serialized, /Authorization|Bearer|TOKEN-SENSIBLE|secret/i);
  assert.doesNotMatch(serialized, /PAYLOAD-SENSIBLE|STACK-SENSIBLE|stack/i);
});

test('protege concurrentemente la consulta de metadata once-per-process', async () => {
  let calls = 0;
  const events = [];
  let resolveMetadata;
  const metadataPending = new Promise((resolve) => {
    resolveMetadata = resolve;
  });
  const dataverseClient = {
    retrieveEntityAttributeMetadataCandidates: async () => {
      calls += 1;
      return metadataPending;
    },
  };

  const diagnosticLogger = (event) => events.push(event);
  const first = runProductPriceLevelMetadataDiagnosticOnce({
    dataverseClient,
    diagnosticLogger,
  });
  const second = runProductPriceLevelMetadataDiagnosticOnce({
    dataverseClient,
    diagnosticLogger,
  });
  assert.equal(await second, false);
  assert.equal(calls, 1);
  resolveMetadata([]);
  assert.equal(await first, true);
  assert.equal(
    await runProductPriceLevelMetadataDiagnosticOnce({ dataverseClient }),
    false,
  );
  assert.equal(calls, 1);
  assert.equal(events.filter(({ stage }) => stage === 'TRIGGER').length, 1);
  assert.equal(events.filter(({ stage }) => stage === 'CANDIDATES').length, 1);
});

test('omite filas con nombres de metadata inseguros sin registrar su contenido', async () => {
  const events = [];
  await runProductPriceLevelMetadataDiagnosticOnce({
    dataverseClient: {
      retrieveEntityAttributeMetadataCandidates: async () => [{
        LogicalName: 'crbbe_producturl\nAuthorization: Bearer TOKEN',
        SchemaName: 'crbbe_ProductUrl',
        AttributeType: 'String',
        IsValidForRead: true,
      }],
    },
    diagnosticLogger: (event) => events.push(event),
  });
  assert.deepEqual(events, [{
    component: 'ProductPriceLevelMetadataDiagnostic',
    diagnosticId: 'PHASE1_048_PRODUCT_URL_METADATA',
    stage: 'TRIGGER',
    result: 'REACHED',
  }, {
    component: 'ProductPriceLevelMetadataDiagnostic',
    diagnosticId: 'PHASE1_048_PRODUCT_URL_METADATA',
    stage: 'CANDIDATES',
    result: 'NONE',
    candidateCount: 0,
  }]);
  assert.doesNotMatch(JSON.stringify(events), /Authorization|Bearer|TOKEN/i);
});

const metadataFailureResponse = () => ({
  ok: false,
  status: 403,
  body: { cancel: async () => {} },
  json: async () => ({
    error: {
      message: 'OData payload Authorization Bearer TOKEN SKU-REAL precio=99',
    },
  }),
});

const createMetadataClient = (fetchImpl) => createDataverseClient({
  baseUrl: 'https://org.crm.dynamics.com',
  tokenProvider: { getToken: async () => 'TOKEN-NO-REGISTRAR' },
  fetchImpl,
});

test('registra trigger y fallo sanitizado al resolver EntityDefinition', async () => {
  const events = [];
  await runProductPriceLevelMetadataDiagnosticOnce({
    dataverseClient: createMetadataClient(async () => metadataFailureResponse()),
    diagnosticLogger: (event) => events.push(event),
  });

  assert.deepEqual(events, [{
    component: 'ProductPriceLevelMetadataDiagnostic',
    diagnosticId: 'PHASE1_048_PRODUCT_URL_METADATA',
    stage: 'TRIGGER',
    result: 'REACHED',
  }, {
    component: 'ProductPriceLevelMetadataDiagnostic',
    diagnosticId: 'PHASE1_048_PRODUCT_URL_METADATA',
    stage: 'ENTITY_DEFINITION',
    result: 'FAIL',
  }]);
  assert.doesNotMatch(
    JSON.stringify(events),
    /OData|payload|Authorization|Bearer|TOKEN|SKU-REAL|precio|https?:\/\//i,
  );
});

test('registra trigger y fallo sanitizado al consultar Attributes', async () => {
  const events = [];
  let requests = 0;
  await runProductPriceLevelMetadataDiagnosticOnce({
    dataverseClient: createMetadataClient(async () => {
      requests += 1;
      if (requests === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            value: [{
              LogicalName: 'productpricelevel',
              EntitySetName: 'productpricelevels',
            }],
          }),
        };
      }
      return metadataFailureResponse();
    }),
    diagnosticLogger: (event) => events.push(event),
  });

  assert.equal(requests, 2);
  assert.deepEqual(events, [{
    component: 'ProductPriceLevelMetadataDiagnostic',
    diagnosticId: 'PHASE1_048_PRODUCT_URL_METADATA',
    stage: 'TRIGGER',
    result: 'REACHED',
  }, {
    component: 'ProductPriceLevelMetadataDiagnostic',
    diagnosticId: 'PHASE1_048_PRODUCT_URL_METADATA',
    stage: 'ATTRIBUTES',
    result: 'FAIL',
  }]);
  assert.doesNotMatch(
    JSON.stringify(events),
    /OData|payload|Authorization|Bearer|TOKEN|SKU-REAL|precio|https?:\/\//i,
  );
});
