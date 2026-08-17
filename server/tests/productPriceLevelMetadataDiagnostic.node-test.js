import test from 'node:test';
import assert from 'node:assert/strict';
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
  events.forEach((event) => {
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

  const first = runProductPriceLevelMetadataDiagnosticOnce({ dataverseClient });
  const second = runProductPriceLevelMetadataDiagnosticOnce({ dataverseClient });
  assert.equal(await second, false);
  assert.equal(calls, 1);
  resolveMetadata([]);
  assert.equal(await first, true);
  assert.equal(
    await runProductPriceLevelMetadataDiagnosticOnce({ dataverseClient }),
    false,
  );
  assert.equal(calls, 1);
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
  assert.deepEqual(events, []);
});
