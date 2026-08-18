import { createServer } from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app/createApp.js';
import {
  createDataverseClient,
  DataverseRequestError,
} from '../src/integrations/dataverse/dataverseClient.js';
import { createProductPriceLevelGateway } from '../src/integrations/dataverse/productPriceLevelGateway.js';
import { createProductService } from '../src/modules/products/productService.js';
import {
  createProductRequestTrace,
  PRODUCT_PAGINATION_DIAGNOSTIC_ID,
  PRODUCT_PAGINATION_STAGES,
  PRODUCT_TRACE_DIAGNOSTIC_ID,
  PRODUCT_TRACE_OPERATIONS,
  PRODUCT_TRACE_STAGES,
} from '../src/observability/productRequestTrace.js';

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

const nextTurn = () => new Promise((resolve) => setImmediate(resolve));

const createTraceFactory = (events) => {
  let traceSequence = 0;
  let clock = 100;
  return ({ operation } = {}) => createProductRequestTrace({
    logger: (event) => events.push(event),
    now: () => {
      clock += 3;
      return clock;
    },
    createTraceId: () => {
      traceSequence += 1;
      return `phase1-066-trace-${traceSequence}`;
    },
    operation,
  });
};

const createProductApp = ({
  productService,
  productTraceFactory,
  authenticator = { authenticate: async () => ({ subject: 'test-user' }) },
  customerService = { search: async () => [], getByCode: async () => null },
} = {}) => createApp({
  customerService,
  productService,
  allowedOrigins: ['http://localhost:5173'],
  authenticator,
  rateLimiter: { check: async () => ({ allowed: true, retryAfterSeconds: 0 }) },
  productTraceFactory,
});

test('reconstruye en orden el flujo Product completo con un traceId efímero por request', async () => {
  const events = [];
  const authenticationSnapshots = [];
  const productTraceFactory = createTraceFactory(events);
  const dataverseClient = createDataverseClient({
    baseUrl: 'https://organization.crm.dynamics.com',
    tokenProvider: { getToken: async () => 'sensitive-dataverse-token' },
    fetchImpl: async () => new Response(JSON.stringify({ value: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  });
  const productService = createProductService({
    productGateway: createProductPriceLevelGateway({ dataverseClient }),
  });
  const app = createProductApp({
    productService,
    productTraceFactory,
    authenticator: {
      authenticate: async (request) => {
        authenticationSnapshots.push(events.map(({ stage }) => stage));
        assert.equal(request.headers.authorization, 'Bearer sensitive-browser-jwt');
        return { subject: 'test-user' };
      },
    },
  });

  await withServer(app, async (baseUrl) => {
    for (let requestNumber = 0; requestNumber < 2; requestNumber += 1) {
      const response = await fetch(`${baseUrl}/api/products/master?brand=Skullcandy`, {
        headers: { Authorization: 'Bearer sensitive-browser-jwt' },
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { products: [] });
      await nextTurn();
    }
  });

  assert.deepEqual(authenticationSnapshots[0], [PRODUCT_TRACE_STAGES.REQUEST_RECEIVED]);
  const phase066Events = events.filter(({ diagnosticId }) => (
    diagnosticId === PRODUCT_TRACE_DIAGNOSTIC_ID
  ));
  const traceIds = [...new Set(phase066Events.map(({ traceId }) => traceId))];
  assert.deepEqual(traceIds, ['phase1-066-trace-1', 'phase1-066-trace-2']);

  const expectedStages = Object.values(PRODUCT_TRACE_STAGES);
  traceIds.forEach((traceId) => {
    const requestEvents = phase066Events.filter((event) => event.traceId === traceId);
    assert.deepEqual(requestEvents.map(({ stage }) => stage), expectedStages);
    assert.equal(requestEvents.every((event) => (
      event.diagnosticId === PRODUCT_TRACE_DIAGNOSTIC_ID
      && Number.isInteger(event.elapsedMs)
      && event.elapsedMs >= 0
      && event.traceId === traceId
      && event.operation === PRODUCT_TRACE_OPERATIONS.MASTER
    )), true);
  });

  phase066Events.forEach((event) => {
    assert.deepEqual(Object.keys(event), [
      'component',
      'diagnosticId',
      'stage',
      'elapsedMs',
      'result',
      'traceId',
      'operation',
    ]);
  });
  assert.doesNotMatch(
    JSON.stringify(events),
    /sensitive-browser-jwt|sensitive-dataverse-token|test-user|Authorization|Bearer/i,
  );
});

test('extiende el flujo y la paginación Product a GET brands con operación aislada', async () => {
  const events = [];
  const productTraceFactory = createTraceFactory(events);
  const dataverseClient = createDataverseClient({
    baseUrl: 'https://organization.crm.dynamics.com',
    tokenProvider: { getToken: async () => 'sensitive-dataverse-token' },
    fetchImpl: async (url) => {
      if (!url.searchParams.has('$skiptoken')) {
        return new Response(JSON.stringify({
          value: [
            {
              crbbe_nombremarca: 'BRAND-SENSITIVE-1',
              crbbe_companiacompradora: 'IOCA USA INC',
            },
            {
              crbbe_nombremarca: 'BRAND-SENSITIVE-2',
              crbbe_companiacompradora: 'SAND SPORTS, CORP.',
            },
          ],
          '@odata.nextLink': 'https://organization.crm.dynamics.com/api/data/v9.2/productpricelevels?$skiptoken=query-sensitive',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        value: [{
          crbbe_nombremarca: 'BRAND-SENSITIVE-3',
          crbbe_companiacompradora: 'IOCA USA INC',
        }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });
  const productService = createProductService({
    productGateway: createProductPriceLevelGateway({ dataverseClient }),
  });
  const app = createProductApp({ productService, productTraceFactory });

  await withServer(app, async (baseUrl) => {
    for (let requestNumber = 0; requestNumber < 2; requestNumber += 1) {
      const response = await fetch(`${baseUrl}/api/products/brands`);
      assert.equal(response.status, 200);
      assert.deepEqual((await response.json()).brands, [
        'BRAND-SENSITIVE-1',
        'BRAND-SENSITIVE-2',
        'BRAND-SENSITIVE-3',
      ]);
      await nextTurn();
    }
  });

  const requestEvents = events.filter(({ diagnosticId }) => (
    diagnosticId === PRODUCT_TRACE_DIAGNOSTIC_ID
  ));
  const traceIds = [...new Set(requestEvents.map(({ traceId }) => traceId))];
  assert.deepEqual(traceIds, ['phase1-066-trace-1', 'phase1-066-trace-2']);
  traceIds.forEach((traceId) => {
    const stages = requestEvents
      .filter((event) => event.traceId === traceId)
      .map(({ stage }) => stage);
    assert.deepEqual(stages, [
      PRODUCT_TRACE_STAGES.REQUEST_RECEIVED,
      PRODUCT_TRACE_STAGES.AUTH_VALIDATED,
      PRODUCT_TRACE_STAGES.SERVICE_STARTED,
      PRODUCT_TRACE_STAGES.TOKEN_REQUEST_STARTED,
      PRODUCT_TRACE_STAGES.TOKEN_ACQUIRED,
      PRODUCT_TRACE_STAGES.FETCH_STARTED,
      PRODUCT_TRACE_STAGES.FETCH_COMPLETED,
      PRODUCT_TRACE_STAGES.TOKEN_REQUEST_STARTED,
      PRODUCT_TRACE_STAGES.TOKEN_ACQUIRED,
      PRODUCT_TRACE_STAGES.FETCH_STARTED,
      PRODUCT_TRACE_STAGES.FETCH_COMPLETED,
      PRODUCT_TRACE_STAGES.RESPONSE_SENT,
    ]);
  });

  const paginationEvents = events.filter(({ diagnosticId }) => (
    diagnosticId === PRODUCT_PAGINATION_DIAGNOSTIC_ID
  ));
  assert.equal(events.every(({ operation }) => (
    operation === PRODUCT_TRACE_OPERATIONS.BRANDS
  )), true);
  traceIds.forEach((traceId) => {
    const completed = paginationEvents.filter((event) => (
      event.traceId === traceId
      && event.stage === PRODUCT_PAGINATION_STAGES.PAGE_FETCH_COMPLETED
    ));
    assert.deepEqual(completed.map((event) => ({
      pageNumber: event.pageNumber,
      recordsReturned: event.recordsReturned,
      hasNextLink: event.hasNextLink,
      cumulativeRecords: event.cumulativeRecords,
    })), [
      { pageNumber: 1, recordsReturned: 2, hasNextLink: true, cumulativeRecords: 2 },
      { pageNumber: 2, recordsReturned: 1, hasNextLink: false, cumulativeRecords: 3 },
    ]);
    const summary = paginationEvents.find((event) => (
      event.traceId === traceId
      && event.stage === PRODUCT_PAGINATION_STAGES.PAGINATION_COMPLETED
    ));
    assert.equal(summary.totalPages, 2);
    assert.equal(summary.totalRecords, 3);
    assert.equal(summary.totalFetchElapsedMs, completed.reduce(
      (total, event) => total + event.fetchElapsedMs,
      0,
    ));
  });
  assert.doesNotMatch(
    JSON.stringify(events),
    /BRAND-SENSITIVE|query-sensitive|crbbe_|productpricelevels|sensitive-dataverse-token/i,
  );
});

test('correlaciona y contabiliza cada página Product sin registrar contenido sensible', async () => {
  const events = [];
  const productTrace = createTraceFactory(events)();
  let tokenCalls = 0;
  let fetchCalls = 0;
  const dataverseClient = createDataverseClient({
    baseUrl: 'https://organization.crm.dynamics.com',
    tokenProvider: {
      getToken: async () => {
        tokenCalls += 1;
        return 'sensitive-dataverse-token';
      },
    },
    fetchImpl: async () => {
      fetchCalls += 1;
      if (fetchCalls === 1) {
        return new Response(JSON.stringify({
          value: [
            { crbbe_sku: 'SKU-SENSIBLE-1', amount: 25 },
            { crbbe_sku: 'SKU-SENSIBLE-2', amount: 18 },
          ],
          '@odata.nextLink': 'https://organization.crm.dynamics.com/api/data/v9.2/productpricelevels?$skiptoken=query-sensitive-1',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (fetchCalls === 2) {
        return new Response(JSON.stringify({
          value: [{
            crbbe_nombreproducto: 'Producto Sensible',
            crbbe_urlproducto: 'https://products.invalid/sensitive',
            customerId: 'customer-sensitive',
          }],
          '@odata.nextLink': 'https://organization.crm.dynamics.com/api/data/v9.2/productpricelevels?$skiptoken=query-sensitive-2',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ value: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });

  const rows = await dataverseClient.retrieveAll({
    entitySet: 'productpricelevels',
    productTrace,
  });
  assert.equal(rows.length, 3);
  assert.equal(tokenCalls, 3);
  assert.equal(fetchCalls, 3);

  const paginationEvents = events.filter(({ diagnosticId }) => (
    diagnosticId === PRODUCT_PAGINATION_DIAGNOSTIC_ID
  ));
  const startedEvents = paginationEvents.filter(({ stage }) => (
    stage === PRODUCT_PAGINATION_STAGES.PAGE_FETCH_STARTED
  ));
  const completedEvents = paginationEvents.filter(({ stage }) => (
    stage === PRODUCT_PAGINATION_STAGES.PAGE_FETCH_COMPLETED
  ));
  const [summaryEvent] = paginationEvents.filter(({ stage }) => (
    stage === PRODUCT_PAGINATION_STAGES.PAGINATION_COMPLETED
  ));

  assert.deepEqual(startedEvents.map(({ pageNumber }) => pageNumber), [1, 2, 3]);
  startedEvents.forEach((event) => {
    assert.deepEqual(Object.keys(event), [
      'component',
      'diagnosticId',
      'stage',
      'elapsedMs',
      'traceId',
      'operation',
      'pageNumber',
    ]);
  });
  assert.deepEqual(completedEvents.map((event) => ({
    traceId: event.traceId,
    pageNumber: event.pageNumber,
    recordsReturned: event.recordsReturned,
    hasNextLink: event.hasNextLink,
    cumulativeRecords: event.cumulativeRecords,
  })), [
    {
      traceId: 'phase1-066-trace-1',
      pageNumber: 1,
      recordsReturned: 2,
      hasNextLink: true,
      cumulativeRecords: 2,
    },
    {
      traceId: 'phase1-066-trace-1',
      pageNumber: 2,
      recordsReturned: 1,
      hasNextLink: true,
      cumulativeRecords: 3,
    },
    {
      traceId: 'phase1-066-trace-1',
      pageNumber: 3,
      recordsReturned: 0,
      hasNextLink: false,
      cumulativeRecords: 3,
    },
  ]);
  completedEvents.forEach((event) => {
    assert.deepEqual(Object.keys(event), [
      'component',
      'diagnosticId',
      'stage',
      'elapsedMs',
      'traceId',
      'operation',
      'pageNumber',
      'fetchElapsedMs',
      'recordsReturned',
      'hasNextLink',
      'cumulativeRecords',
    ]);
    assert.equal(Number.isInteger(event.fetchElapsedMs), true);
    assert.equal(event.fetchElapsedMs >= 0, true);
  });
  assert.deepEqual(summaryEvent, {
    component: 'DataverseClient',
    diagnosticId: PRODUCT_PAGINATION_DIAGNOSTIC_ID,
    stage: PRODUCT_PAGINATION_STAGES.PAGINATION_COMPLETED,
    elapsedMs: summaryEvent.elapsedMs,
    traceId: 'phase1-066-trace-1',
    operation: PRODUCT_TRACE_OPERATIONS.MASTER,
    totalPages: 3,
    totalRecords: 3,
    totalFetchElapsedMs: completedEvents.reduce(
      (total, event) => total + event.fetchElapsedMs,
      0,
    ),
  });
  assert.doesNotMatch(
    JSON.stringify(paginationEvents),
    /SKU-SENSIBLE|Producto Sensible|products\.invalid|query-sensitive|customer-sensitive|amount|crbbe_|@odata\.nextLink|access-token|Authorization|Bearer/i,
  );
});

test('emite PRODUCT_RESPONSE_SENT solo después de finalizar la respuesta Product', async () => {
  const events = [];
  let resolveProducts;
  const productsPending = new Promise((resolve) => {
    resolveProducts = resolve;
  });
  const productService = createProductService({
    productGateway: {
      loadBrands: async () => [],
      loadProducts: async () => productsPending,
    },
  });
  const app = createProductApp({
    productService,
    productTraceFactory: createTraceFactory(events),
  });

  await withServer(app, async (baseUrl) => {
    const responsePending = fetch(`${baseUrl}/api/products/master?brand=Skullcandy`);
    await nextTurn();
    assert.equal(
      events.some(({ stage }) => stage === PRODUCT_TRACE_STAGES.RESPONSE_SENT),
      false,
    );

    resolveProducts([]);
    const response = await responsePending;
    assert.deepEqual(await response.json(), { products: [] });
    await nextTurn();
    assert.equal(events.at(-1).stage, PRODUCT_TRACE_STAGES.RESPONSE_SENT);
  });
});

test('Maestro Cliente no genera trazabilidad Product Phase1-066/068', async () => {
  const events = [];
  const customer = {
    customerCode: 'C-001',
    customerName: 'Cliente Uno',
    country: 'Guatemala',
    customerType: 'Distribuidor',
  };
  const app = createProductApp({
    productService: { loadMaster: async () => [] },
    productTraceFactory: createTraceFactory(events),
    customerService: {
      search: async () => [customer],
      getByCode: async () => customer,
    },
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/customers/search?type=code&q=C-001`);
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).customers, [customer]);
  });
  assert.deepEqual(events, []);
});

test('fallo de fetch conserva DATAVERSE_NETWORK_ERROR y completa el checkpoint con FAIL', async () => {
  const traceEvents = [];
  const diagnosticEvents = [];
  const productTrace = createTraceFactory(traceEvents)();
  const dataverseClient = createDataverseClient({
    baseUrl: 'https://organization.crm.dynamics.com',
    tokenProvider: { getToken: async () => 'sensitive-dataverse-token' },
    diagnosticLogger: (event) => diagnosticEvents.push(event),
    fetchImpl: async () => {
      throw new TypeError('sensitive upstream network detail');
    },
  });

  await assert.rejects(
    dataverseClient.retrieveMultiple({ entitySet: 'productpricelevels', productTrace }),
    (error) => error instanceof DataverseRequestError
      && error.code === 'DATAVERSE_REQUEST_FAILED',
  );

  assert.deepEqual(traceEvents.map(({ stage, result }) => ({ stage, result })), [
    { stage: PRODUCT_TRACE_STAGES.TOKEN_REQUEST_STARTED, result: 'REACHED' },
    { stage: PRODUCT_TRACE_STAGES.TOKEN_ACQUIRED, result: 'PASS' },
    { stage: PRODUCT_TRACE_STAGES.FETCH_STARTED, result: 'REACHED' },
    { stage: PRODUCT_TRACE_STAGES.FETCH_COMPLETED, result: 'FAIL' },
  ]);
  assert.deepEqual(diagnosticEvents, [{
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
    JSON.stringify({ traceEvents, diagnosticEvents }),
    /sensitive upstream|sensitive-dataverse-token/i,
  );
});
