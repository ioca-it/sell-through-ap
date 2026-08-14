import { quoteODataString } from './odata.js';

const DIAGNOSTIC_ID = 'PHASE1_022_CUSTOMER_QUERY_PROBE';
const DIAGNOSTIC_LITERAL = 'phase1-022-probe';
const SAFE_IDENTIFIER = /^[A-Za-z0-9_]+$/;

const defaultDiagnosticLogger = (event) => console.warn(JSON.stringify(event));

const emitProbeResult = (logger, { sequence, category, element, passed }) => {
  try {
    logger(Object.freeze({
      component: 'AccountCustomerQueryDiagnostic',
      diagnosticId: DIAGNOSTIC_ID,
      sequence,
      category,
      element,
      result: passed ? 'PASS' : 'FAIL',
    }));
  } catch {
    // Diagnostic output cannot replace the original sanitized Customer API error.
  }
};

const assertSafeIdentifier = (value, label) => {
  if (typeof value !== 'string' || !SAFE_IDENTIFIER.test(value)) {
    throw new Error(`AccountCustomerQueryDiagnostic: ${label} inválido.`);
  }
};

const validateShape = ({
  operation,
  entitySet,
  selectFields,
  eligibility,
  predicateType,
  predicateField,
  orderByField,
  top,
}) => {
  assertSafeIdentifier(operation, 'operation');
  assertSafeIdentifier(entitySet, 'entitySet');
  for (const field of selectFields) assertSafeIdentifier(field, 'select field');
  for (const { field, value } of eligibility) {
    assertSafeIdentifier(field, 'filter field');
    if (!Number.isInteger(value)) {
      throw new Error('AccountCustomerQueryDiagnostic: filter value inválido.');
    }
  }
  if (!['contains', 'equals'].includes(predicateType)) {
    throw new Error('AccountCustomerQueryDiagnostic: predicate type inválido.');
  }
  assertSafeIdentifier(predicateField, 'predicate field');
  assertSafeIdentifier(orderByField, 'orderBy field');
  if (!Number.isInteger(top) || top <= 0) {
    throw new Error('AccountCustomerQueryDiagnostic: top inválido.');
  }
};

const createProbes = (shape) => {
  validateShape(shape);
  const {
    operation,
    entitySet,
    selectFields,
    eligibility,
    predicateType,
    predicateField,
    orderByField,
    top,
  } = shape;
  const eligibilityFilter = eligibility
    .map(({ field, value }) => `${field} eq ${value}`)
    .join(' and ');
  const predicate = predicateType === 'contains'
    ? `contains(${predicateField},${quoteODataString(DIAGNOSTIC_LITERAL)})`
    : `${predicateField} eq ${quoteODataString(DIAGNOSTIC_LITERAL)}`;
  const combinedFilter = `${predicate} and ${eligibilityFilter}`;

  return [
    {
      category: 'entity_set',
      element: entitySet,
      query: { entitySet, top: 1 },
      stopOnFailure: true,
    },
    ...selectFields.map((field) => ({
      category: 'select_field',
      element: field,
      query: { entitySet, select: [field], top: 1 },
    })),
    ...eligibility.map(({ field }) => ({
      category: 'filter_field',
      element: field,
      query: { entitySet, select: [field], top: 1 },
    })),
    ...eligibility.map(({ field, value }) => ({
      category: 'filter_numeric_literal',
      element: field,
      query: { entitySet, filter: `${field} eq ${value}`, top: 1 },
    })),
    {
      category: 'predicate_string_literal',
      element: predicateField,
      query: { entitySet, filter: predicate, top: 1 },
    },
    {
      category: 'orderby_field',
      element: orderByField,
      query: { entitySet, orderBy: `${orderByField} asc`, top: 1 },
    },
    ...(top === 1 ? [] : [{
      category: 'top_integer',
      element: String(top),
      query: { entitySet, top },
    }]),
    {
      category: 'composed_query',
      element: operation,
      query: {
        entitySet,
        select: selectFields,
        filter: combinedFilter,
        orderBy: `${orderByField} asc`,
        top,
      },
      requiresPreviousPasses: true,
    },
  ];
};

export const createTemporaryAccountCustomerQueryDiagnostic = ({
  dataverseClient,
  diagnosticLogger = defaultDiagnosticLogger,
} = {}) => {
  if (typeof dataverseClient?.probeRetrieveMultiple !== 'function'
    || typeof diagnosticLogger !== 'function') {
    throw new Error('AccountCustomerQueryDiagnostic: dependencias inválidas.');
  }

  let hasRun = false;

  return Object.freeze({
    async run(shape) {
      if (hasRun) return;
      hasRun = true;

      // TEMPORARY Phase1-022: one backend-only sequence isolates the invalid
      // query element. It logs only hard-coded categories/names and PASS/FAIL,
      // never values, URLs, query strings, tokens or bodies; remove after isolation.
      const probes = createProbes(shape);
      let previousProbesPassed = true;
      for (const [index, probe] of probes.entries()) {
        if (probe.requiresPreviousPasses && !previousProbesPassed) continue;

        let passed = false;
        try {
          passed = await dataverseClient.probeRetrieveMultiple(probe.query) === true;
        } catch {
          passed = false;
        }
        emitProbeResult(diagnosticLogger, {
          sequence: index + 1,
          category: probe.category,
          element: probe.element,
          passed,
        });
        previousProbesPassed = previousProbesPassed && passed;
        if (probe.stopOnFailure && !passed) break;
      }
    },
  });
};
