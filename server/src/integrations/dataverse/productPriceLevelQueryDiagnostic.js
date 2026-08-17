import { DATAVERSE_FORMATTED_VALUE_ANNOTATION } from './dataverseClient.js';
import { quoteODataString } from './odata.js';

const COMPONENT = 'ProductPriceLevelQueryDiagnostic';
const DIAGNOSTIC_ID = 'PHASE1_046_PRODUCT_QUERY_PROBE';
const ENTITY_SET = 'productpricelevels';
const FIELDS = Object.freeze([
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
const BUYER_FIELD = 'crbbe_companiacompradora';
const BUYER_LITERALS = Object.freeze([
  'IOCA USA INC',
  'SAND SPORTS, CORP.',
]);
const ORDER_FIELDS = Object.freeze([
  'crbbe_sku',
  'crbbe_origen',
  'crbbe_companiacompradora',
  'createdon',
]);
const COMPANY_FILTER = `(${BUYER_LITERALS
  .map((company) => `${BUYER_FIELD} eq ${quoteODataString(company)}`)
  .join(' or ')})`;
const ORDER_BY = ORDER_FIELDS.map((field) => `${field} asc`).join(',');

const freezeQuery = (query) => Object.freeze({
  ...query,
  ...(Array.isArray(query.select) ? { select: Object.freeze([...query.select]) } : {}),
  ...(Array.isArray(query.includeAnnotations)
    ? { includeAnnotations: Object.freeze([...query.includeAnnotations]) }
    : {}),
});

const createProbe = (category, element, query) => Object.freeze({
  category,
  element,
  query: freezeQuery({ entitySet: ENTITY_SET, ...query }),
});

const PROBES = Object.freeze([
  createProbe('entity_set', ENTITY_SET, { top: 1 }),
  ...FIELDS.map((field) => createProbe('select_field', field, {
    select: [field],
    top: 1,
  })),
  createProbe('select_composition', 'product_select', {
    select: FIELDS,
    top: 1,
  }),
  ...BUYER_LITERALS.map((literal, index) => createProbe(
    'filter_string_literal',
    `${BUYER_FIELD}:text_${index + 1}`,
    {
      select: [BUYER_FIELD],
      filter: `${BUYER_FIELD} eq ${quoteODataString(literal)}`,
      top: 1,
    },
  )),
  createProbe('filter_composition', `${BUYER_FIELD}:or`, {
    select: [BUYER_FIELD],
    filter: COMPANY_FILTER,
    top: 1,
  }),
  ...ORDER_FIELDS.map((field) => createProbe('orderby_field', field, {
    select: [field],
    orderBy: `${field} asc`,
    top: 1,
  })),
  createProbe('orderby_composition', 'product_order', {
    select: ORDER_FIELDS,
    orderBy: ORDER_BY,
    top: 1,
  }),
  createProbe('annotation_header', DATAVERSE_FORMATTED_VALUE_ANNOTATION, {
    select: ['crbbe_clasificacioncomercial', 'crbbe_etapa'],
    includeAnnotations: [DATAVERSE_FORMATTED_VALUE_ANNOTATION],
    top: 1,
  }),
  createProbe('top_integer', '$top', {
    top: 1,
  }),
  createProbe('composed_query', 'product_master_query', {
    select: FIELDS,
    filter: COMPANY_FILTER,
    orderBy: ORDER_BY,
    includeAnnotations: [DATAVERSE_FORMATTED_VALUE_ANNOTATION],
    top: 1,
  }),
]);

let executedInProcess = false;

const defaultLogger = (event) => console.warn(JSON.stringify(event));

const emitProbe = (probe, sequence, passed, diagnosticLogger) => {
  const event = Object.freeze({
    component: COMPONENT,
    diagnosticId: DIAGNOSTIC_ID,
    sequence,
    category: probe.category,
    element: probe.element,
    result: passed ? 'PASS' : 'FAIL',
  });
  try {
    diagnosticLogger(event);
  } catch {
    // La telemetría temporal nunca modifica el fallo público original.
  }
};

export const runProductPriceLevelQueryDiagnosticOnce = async ({
  dataverseClient,
  diagnosticLogger = defaultLogger,
} = {}) => {
  if (executedInProcess
    || typeof dataverseClient?.probeRetrieveMultiple !== 'function') {
    return false;
  }
  executedInProcess = true;

  for (let index = 0; index < PROBES.length; index += 1) {
    const probe = PROBES[index];
    let passed = false;
    try {
      passed = await dataverseClient.probeRetrieveMultiple(probe.query) === true;
    } catch {
      passed = false;
    }
    emitProbe(probe, index + 1, passed, diagnosticLogger);

    // Sin baseline válido, consultas más específicas no aportarían evidencia
    // confiable y solo aumentarían tráfico upstream.
    if (index === 0 && !passed) break;
  }
  return true;
};

export const resetProductPriceLevelQueryDiagnosticForTests = () => {
  executedInProcess = false;
};
