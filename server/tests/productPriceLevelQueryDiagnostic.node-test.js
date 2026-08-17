import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDataverseClient,
  DataverseRequestError,
} from '../src/integrations/dataverse/dataverseClient.js';
import { createProductPriceLevelGateway } from '../src/integrations/dataverse/productPriceLevelGateway.js';
import {
  resetProductPriceLevelQueryDiagnosticForTests,
  runProductPriceLevelQueryDiagnosticOnce,
} from '../src/integrations/dataverse/productPriceLevelQueryDiagnostic.js';

const EXPECTED_FIELDS = Object.freeze([
  'crbbe_nombremarca',
  'crbbe_sku',
  'crbbe_nombreproducto',
  'crbbe_nombrecategoria',
  'crbbe_validohasta',
  'createdon',
  'crbbe_clasificacioncomercial',
  'crbbe_etapa',
  'crbbe_imagenproducto',
  'producturl',
  'amount',
  'crbbe_origen',
  'crbbe_companiacompradora',
]);

const invalidFieldResponse = () => ({
  ok: false,
  status: 400,
  json: async () => ({
    error: {
      code: '0x80060888',
      message: 'Could not find a property named invalid_field on the selected entity.',
    },
  }),
});

const badRequestResponse = () => ({
  ok: false,
  status: 400,
  json: async () => ({
    error: {
      code: 'BUSINESS_RULE',
      message: 'A business rule prevented this operation.',
    },
  }),
});

const probePassResponse = (onCancel = () => {}) => ({
  ok: true,
  status: 200,
  body: { cancel: async () => onCancel() },
});

const createClient = ({ fetchImpl, diagnosticLogger }) => createDataverseClient({
  baseUrl: 'https://org.crm.dynamics.com',
  tokenProvider: { getToken: async () => 'TOKEN-NO-REGISTRAR' },
  fetchImpl,
  diagnosticLogger,
});

test.beforeEach(() => {
  resetProductPriceLevelQueryDiagnosticForTests();
});

test('prueba campos individuales, continúa tras FAIL y emite solo eventos allowlist', async () => {
  const calls = [];
  const events = [];
  let skuSelectCalls = 0;
  const dataverseClient = {
    probeRetrieveMultiple: async (query) => {
      calls.push(query);
      if (query.select?.length === 1 && query.select[0] === 'crbbe_sku') {
        skuSelectCalls += 1;
        if (skuSelectCalls === 1) {
          throw new Error(
            'OData original payload Authorization Bearer JWT SKU-REAL PRODUCTO-REAL '
              + 'MARCA-REAL CATEGORIA-REAL precio=99 https://private.invalid secret',
          );
        }
      }
      return true;
    },
  };

  assert.equal(await runProductPriceLevelQueryDiagnosticOnce({
    dataverseClient,
    diagnosticLogger: (event) => events.push(event),
  }), true);

  assert.equal(calls.length, 26);
  assert.equal(events.length, 26);
  assert.deepEqual(
    events.filter(({ category }) => category === 'select_field').map(({ element }) => element),
    EXPECTED_FIELDS,
  );
  calls.slice(1, 14).forEach((query) => {
    assert.equal(query.entitySet, 'productpricelevels');
    assert.equal(query.select.length, 1);
    assert.equal(query.top, 1);
  });
  assert.equal(
    events.find(({ category, element }) => (
      category === 'select_field' && element === 'crbbe_sku'
    )).result,
    'FAIL',
  );
  assert.equal(
    events.find(({ category, element }) => (
      category === 'select_field' && element === 'crbbe_nombreproducto'
    )).result,
    'PASS',
  );
  assert.deepEqual(
    [...new Set(events.map(({ category }) => category))],
    [
      'entity_set',
      'select_field',
      'select_composition',
      'filter_string_literal',
      'filter_composition',
      'orderby_field',
      'orderby_composition',
      'annotation_header',
      'top_integer',
      'composed_query',
    ],
  );
  events.forEach((event, index) => {
    assert.deepEqual(Object.keys(event), [
      'component',
      'diagnosticId',
      'sequence',
      'category',
      'element',
      'result',
    ]);
    assert.equal(event.component, 'ProductPriceLevelQueryDiagnostic');
    assert.equal(event.diagnosticId, 'PHASE1_046_PRODUCT_QUERY_PROBE');
    assert.equal(event.sequence, index + 1);
    assert.match(event.result, /^(?:PASS|FAIL)$/);
  });

  const serializedLogs = JSON.stringify(events);
  assert.doesNotMatch(serializedLogs, /IOCA USA INC|SAND SPORTS, CORP\./);
  assert.doesNotMatch(
    serializedLogs,
    /SKU-REAL|PRODUCTO-REAL|MARCA-REAL|CATEGORIA-REAL|precio=99/,
  );
  assert.doesNotMatch(serializedLogs, /Authorization|Bearer|JWT|TOKEN-NO-REGISTRAR|secret/i);
  assert.doesNotMatch(serializedLogs, /OData original|invalid_field|payload/i);
  assert.doesNotMatch(serializedLogs, /\$(?:filter|select|orderby)|\seq\s/i);
  assert.doesNotMatch(serializedLogs, /https?:\/\//i);
});

test('protege la secuencia completa once-per-process', async () => {
  let calls = 0;
  const events = [];
  const dataverseClient = {
    probeRetrieveMultiple: async () => {
      calls += 1;
      return true;
    },
  };

  assert.equal(await runProductPriceLevelQueryDiagnosticOnce({
    dataverseClient,
    diagnosticLogger: (event) => events.push(event),
  }), true);
  assert.equal(await runProductPriceLevelQueryDiagnosticOnce({
    dataverseClient,
    diagnosticLogger: (event) => events.push(event),
  }), false);
  assert.equal(calls, 26);
  assert.equal(events.length, 26);
});

test('detiene probes específicos cuando falla el Entity Set baseline', async () => {
  let calls = 0;
  const events = [];
  await runProductPriceLevelQueryDiagnosticOnce({
    dataverseClient: {
      probeRetrieveMultiple: async () => {
        calls += 1;
        return false;
      },
    },
    diagnosticLogger: (event) => events.push(event),
  });

  assert.equal(calls, 1);
  assert.deepEqual(events, [{
    component: 'ProductPriceLevelQueryDiagnostic',
    diagnosticId: 'PHASE1_046_PRODUCT_QUERY_PROBE',
    sequence: 1,
    category: 'entity_set',
    element: 'productpricelevels',
    result: 'FAIL',
  }]);
});

test('no se ejecuta en Product exitoso ni ante un error no clasificado', async () => {
  let probes = 0;
  let shouldFail = false;
  const dataverseClient = {
    retrieveAll: async () => {
      if (shouldFail) throw new DataverseRequestError();
      return [];
    },
    probeRetrieveMultiple: async () => {
      probes += 1;
      return true;
    },
  };
  const gateway = createProductPriceLevelGateway({ dataverseClient });
  assert.deepEqual(await gateway.loadProducts(), []);
  assert.equal(probes, 0);

  shouldFail = true;
  await assert.rejects(gateway.loadProducts(), DataverseRequestError);
  assert.equal(probes, 0);
});

test('no se ejecuta ante HTTP 400 distinto de invalid field/filter', async () => {
  const dataverseEvents = [];
  let fetchCalls = 0;
  const client = createClient({
    fetchImpl: async () => {
      fetchCalls += 1;
      return badRequestResponse();
    },
    diagnosticLogger: (event) => dataverseEvents.push(event),
  });
  const productEvents = [];
  const gateway = createProductPriceLevelGateway({
    dataverseClient: client,
    diagnosticLogger: (event) => productEvents.push(event),
  });

  await assert.rejects(gateway.loadProducts(), DataverseRequestError);
  assert.equal(fetchCalls, 1);
  assert.equal(dataverseEvents[0].diagnosticId, 'DATAVERSE_BAD_REQUEST');
  assert.deepEqual(productEvents, []);
});

test('se ejecuta después del 400 específico, conserva 502 y no repite probes', async () => {
  const timeline = [];
  const requestUrls = [];
  let fetchCalls = 0;
  let cancelledBodies = 0;
  const client = createClient({
    fetchImpl: async (url) => {
      fetchCalls += 1;
      requestUrls.push(url);
      if (fetchCalls === 1 || fetchCalls === 28) return invalidFieldResponse();
      return probePassResponse(() => {
        cancelledBodies += 1;
      });
    },
    diagnosticLogger: (event) => timeline.push(event),
  });
  const gateway = createProductPriceLevelGateway({
    dataverseClient: client,
    diagnosticLogger: (event) => timeline.push(event),
  });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await assert.rejects(
      gateway.loadProducts(),
      (error) => error.code === 'DATAVERSE_REQUEST_FAILED'
        && error.statusCode === 502,
    );
  }

  assert.equal(fetchCalls, 28);
  assert.equal(cancelledBodies, 26);
  assert.equal(timeline[0].component, 'DataverseClient');
  assert.equal(timeline[0].diagnosticId, 'DATAVERSE_INVALID_FIELD_OR_FILTER');
  assert.equal(timeline[0].upstreamStatus, 400);
  assert.equal(timeline[1].component, 'ProductPriceLevelQueryDiagnostic');
  assert.equal(
    timeline.filter(({ diagnosticId }) => (
      diagnosticId === 'PHASE1_046_PRODUCT_QUERY_PROBE'
    )).length,
    26,
  );
  requestUrls.forEach((url) => {
    assert.equal(url.pathname, '/api/data/v9.2/productpricelevels');
  });
});
