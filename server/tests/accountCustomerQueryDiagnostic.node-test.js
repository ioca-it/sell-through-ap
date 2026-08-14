import test from 'node:test';
import assert from 'node:assert/strict';
import { createTemporaryAccountCustomerQueryDiagnostic } from '../src/integrations/dataverse/accountCustomerQueryDiagnostic.js';

const diagnosticShape = Object.freeze({
  operation: 'search_by_code',
  entitySet: 'accounts',
  selectFields: Object.freeze([
    'new_codigocliente',
    'name',
    'crbbe_nombrepais',
    'new_tipocliente',
  ]),
  eligibility: Object.freeze([
    Object.freeze({ field: 'customertype', value: 3 }),
    Object.freeze({ field: 'statecode', value: 0 }),
    Object.freeze({ field: 'crbbe_estadocliente', value: 4 }),
  ]),
  predicateType: 'contains',
  predicateField: 'new_codigocliente',
  orderByField: 'new_codigocliente',
  top: 20,
});

test('prueba cada componente y registra solo nombre/categoría con PASS', async () => {
  const calls = [];
  const events = [];
  const diagnostic = createTemporaryAccountCustomerQueryDiagnostic({
    dataverseClient: {
      probeRetrieveMultiple: async (query) => {
        calls.push(query);
        return true;
      },
    },
    diagnosticLogger: (event) => events.push(event),
  });

  await diagnostic.run(diagnosticShape);

  assert.equal(calls.length, 15);
  assert.deepEqual(calls[0], { entitySet: 'accounts', top: 1 });
  assert.deepEqual(
    calls.slice(1, 5).map(({ select }) => select[0]),
    ['new_codigocliente', 'name', 'crbbe_nombrepais', 'new_tipocliente'],
  );
  assert.deepEqual(
    calls.slice(5, 8).map(({ select }) => select[0]),
    ['customertype', 'statecode', 'crbbe_estadocliente'],
  );
  assert.deepEqual(
    calls.slice(8, 11).map(({ filter }) => filter),
    ['customertype eq 3', 'statecode eq 0', 'crbbe_estadocliente eq 4'],
  );
  assert.equal(calls[11].filter, "contains(new_codigocliente,'phase1-022-probe')");
  assert.equal(calls[12].orderBy, 'new_codigocliente asc');
  assert.equal(calls[13].top, 20);
  assert.deepEqual(calls[14], {
    entitySet: 'accounts',
    select: ['new_codigocliente', 'name', 'crbbe_nombrepais', 'new_tipocliente'],
    filter: "contains(new_codigocliente,'phase1-022-probe') and customertype eq 3 and statecode eq 0 and crbbe_estadocliente eq 4",
    orderBy: 'new_codigocliente asc',
    top: 20,
  });
  assert.equal(events.length, 15);
  assert.deepEqual(events.at(-1), {
    component: 'AccountCustomerQueryDiagnostic',
    diagnosticId: 'PHASE1_022_CUSTOMER_QUERY_PROBE',
    sequence: 15,
    category: 'composed_query',
    element: 'search_by_code',
    result: 'PASS',
  });
  assert.equal(events.every(({ result }) => result === 'PASS'), true);
  assert.doesNotMatch(
    JSON.stringify(events),
    /phase1-022-probe|contains\(|\beq\b|\$filter|\$select|Authorization|Bearer|token|Customer Name|https:\/\//,
  );
});

test('marca campos/expresiones FAIL, omite la composición y se ejecuta una sola vez', async () => {
  const calls = [];
  const events = [];
  const diagnostic = createTemporaryAccountCustomerQueryDiagnostic({
    dataverseClient: {
      probeRetrieveMultiple: async (query) => {
        calls.push(query);
        if (query.select?.[0] === 'new_tipocliente') return false;
        if (query.filter === 'crbbe_estadocliente eq 4') return false;
        return true;
      },
    },
    diagnosticLogger: (event) => events.push(event),
  });

  await diagnostic.run(diagnosticShape);
  await diagnostic.run(diagnosticShape);

  assert.equal(calls.length, 14);
  assert.equal(events.length, 14);
  assert.equal(events.some((event) => event.category === 'composed_query'), false);
  assert.deepEqual(
    events.filter(({ result }) => result === 'FAIL')
      .map(({ category, element }) => ({ category, element })),
    [
      { category: 'select_field', element: 'new_tipocliente' },
      { category: 'filter_numeric_literal', element: 'crbbe_estadocliente' },
    ],
  );
});

test('detiene la secuencia si falla el Entity Set base', async () => {
  const events = [];
  const diagnostic = createTemporaryAccountCustomerQueryDiagnostic({
    dataverseClient: { probeRetrieveMultiple: async () => false },
    diagnosticLogger: (event) => events.push(event),
  });

  await diagnostic.run(diagnosticShape);

  assert.deepEqual(events, [{
    component: 'AccountCustomerQueryDiagnostic',
    diagnosticId: 'PHASE1_022_CUSTOMER_QUERY_PROBE',
    sequence: 1,
    category: 'entity_set',
    element: 'accounts',
    result: 'FAIL',
  }]);
});
