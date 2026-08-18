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
  PRODUCT_TRACE_DIAGNOSTIC_ID,
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
  return () => createProductRequestTrace({
    logger: (event) => events.push(event),
    now: () => {
      clock += 3;
      return clock;
    },
    createTraceId: () => {
      traceSequence += 1;
      return `phase1-066-trace-${traceSequence}`;
    },
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
      const response = await fetch(`${baseUrl}/api/products/master`, {
        headers: { Authorization: 'Bearer sensitive-browser-jwt' },
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { products: [] });
      await nextTurn();
    }
  });

  assert.deepEqual(authenticationSnapshots[0], [PRODUCT_TRACE_STAGES.REQUEST_RECEIVED]);
  const traceIds = [...new Set(events.map(({ traceId }) => traceId))];
  assert.deepEqual(traceIds, ['phase1-066-trace-1', 'phase1-066-trace-2']);

  const expectedStages = Object.values(PRODUCT_TRACE_STAGES);
  traceIds.forEach((traceId) => {
    const requestEvents = events.filter((event) => event.traceId === traceId);
    assert.deepEqual(requestEvents.map(({ stage }) => stage), expectedStages);
    assert.equal(requestEvents.every((event) => (
      event.diagnosticId === PRODUCT_TRACE_DIAGNOSTIC_ID
      && Number.isInteger(event.elapsedMs)
      && event.elapsedMs >= 0
      && event.traceId === traceId
    )), true);
  });

  events.forEach((event) => {
    assert.deepEqual(Object.keys(event), [
      'component',
      'diagnosticId',
      'stage',
      'elapsedMs',
      'result',
      'traceId',
    ]);
  });
  assert.doesNotMatch(
    JSON.stringify(events),
    /sensitive-browser-jwt|sensitive-dataverse-token|test-user|Authorization|Bearer/i,
  );
});

test('emite PRODUCT_RESPONSE_SENT solo después de finalizar la respuesta Product', async () => {
  const events = [];
  let resolveProducts;
  const productsPending = new Promise((resolve) => {
    resolveProducts = resolve;
  });
  const productService = createProductService({
    productGateway: { loadProducts: async () => productsPending },
  });
  const app = createProductApp({
    productService,
    productTraceFactory: createTraceFactory(events),
  });

  await withServer(app, async (baseUrl) => {
    const responsePending = fetch(`${baseUrl}/api/products/master`);
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

test('Maestro Cliente no genera trazabilidad temporal Phase1-066', async () => {
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
