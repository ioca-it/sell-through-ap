import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

export const PRODUCT_TRACE_DIAGNOSTIC_ID = 'PHASE1_066_PRODUCT_REQUEST_TRACE';
export const PRODUCT_PAGINATION_DIAGNOSTIC_ID =
  'PHASE1_068_PRODUCT_PAGINATION_TRACE';

export const PRODUCT_TRACE_COMPONENTS = Object.freeze({
  API: 'ProductApi',
  SERVICE: 'ProductService',
  DATAVERSE_CLIENT: 'DataverseClient',
});

export const PRODUCT_TRACE_STAGES = Object.freeze({
  REQUEST_RECEIVED: 'PRODUCT_REQUEST_RECEIVED',
  AUTH_VALIDATED: 'PRODUCT_AUTH_VALIDATED',
  SERVICE_STARTED: 'PRODUCT_SERVICE_STARTED',
  TOKEN_REQUEST_STARTED: 'DATAVERSE_TOKEN_REQUEST_STARTED',
  TOKEN_ACQUIRED: 'DATAVERSE_TOKEN_ACQUIRED',
  FETCH_STARTED: 'DATAVERSE_FETCH_STARTED',
  FETCH_COMPLETED: 'DATAVERSE_FETCH_COMPLETED',
  RESPONSE_SENT: 'PRODUCT_RESPONSE_SENT',
});

export const PRODUCT_TRACE_RESULTS = Object.freeze({
  REACHED: 'REACHED',
  PASS: 'PASS',
  FAIL: 'FAIL',
});

export const PRODUCT_PAGINATION_STAGES = Object.freeze({
  PAGE_FETCH_STARTED: 'PRODUCT_PAGE_FETCH_STARTED',
  PAGE_FETCH_COMPLETED: 'PRODUCT_PAGE_FETCH_COMPLETED',
  PAGINATION_COMPLETED: 'PRODUCT_PAGINATION_COMPLETED',
});

const ALLOWED_COMPONENTS = new Set(Object.values(PRODUCT_TRACE_COMPONENTS));
const ALLOWED_STAGES = new Set(Object.values(PRODUCT_TRACE_STAGES));
const ALLOWED_RESULTS = new Set(Object.values(PRODUCT_TRACE_RESULTS));
const ALLOWED_PAGINATION_STAGES = new Set(Object.values(PRODUCT_PAGINATION_STAGES));
const SAFE_TRACE_ID = /^[A-Za-z0-9_-]{1,128}$/;

const defaultLogger = (event) => console.info(JSON.stringify(event));

const readClock = (now) => {
  try {
    const value = now();
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
};

const sanitizeElapsedMs = (startMs, now) => {
  const elapsed = readClock(now) - startMs;
  return Math.max(0, Math.trunc(Number.isFinite(elapsed) ? elapsed : 0));
};

const isNonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;

const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;

// Contexto efímero y allowlisted: no recibe request, identidad, query ni payload.
export const createProductRequestTrace = ({
  logger = defaultLogger,
  now = () => performance.now(),
  createTraceId = randomUUID,
} = {}) => {
  if (typeof logger !== 'function' || typeof now !== 'function'
    || typeof createTraceId !== 'function') {
    throw new Error('ProductRequestTrace: configuración inválida.');
  }

  const traceId = createTraceId();
  if (typeof traceId !== 'string' || !SAFE_TRACE_ID.test(traceId)) {
    throw new Error('ProductRequestTrace: traceId inválido.');
  }
  const startMs = readClock(now);

  return Object.freeze({
    checkpoint({ component, stage, result }) {
      if (!ALLOWED_COMPONENTS.has(component)
        || !ALLOWED_STAGES.has(stage)
        || !ALLOWED_RESULTS.has(result)) {
        return false;
      }
      const event = Object.freeze({
        component,
        diagnosticId: PRODUCT_TRACE_DIAGNOSTIC_ID,
        stage,
        elapsedMs: sanitizeElapsedMs(startMs, now),
        result,
        traceId,
      });
      try {
        logger(event);
      } catch {
        // La trazabilidad temporal nunca altera el flujo funcional observado.
      }
      return true;
    },
    paginationCheckpoint({
      stage,
      pageNumber,
      fetchElapsedMs,
      recordsReturned,
      hasNextLink,
      cumulativeRecords,
      totalPages,
      totalRecords,
      totalFetchElapsedMs,
    } = {}) {
      if (!ALLOWED_PAGINATION_STAGES.has(stage)) return false;

      let event;
      if (stage === PRODUCT_PAGINATION_STAGES.PAGE_FETCH_STARTED) {
        if (!isPositiveInteger(pageNumber)) return false;
        event = Object.freeze({
          component: PRODUCT_TRACE_COMPONENTS.DATAVERSE_CLIENT,
          diagnosticId: PRODUCT_PAGINATION_DIAGNOSTIC_ID,
          stage,
          elapsedMs: sanitizeElapsedMs(startMs, now),
          traceId,
          pageNumber,
        });
      } else if (stage === PRODUCT_PAGINATION_STAGES.PAGE_FETCH_COMPLETED) {
        if (!isPositiveInteger(pageNumber)
          || !isNonNegativeInteger(fetchElapsedMs)
          || !isNonNegativeInteger(recordsReturned)
          || typeof hasNextLink !== 'boolean'
          || !isNonNegativeInteger(cumulativeRecords)) {
          return false;
        }
        event = Object.freeze({
          component: PRODUCT_TRACE_COMPONENTS.DATAVERSE_CLIENT,
          diagnosticId: PRODUCT_PAGINATION_DIAGNOSTIC_ID,
          stage,
          elapsedMs: sanitizeElapsedMs(startMs, now),
          traceId,
          pageNumber,
          fetchElapsedMs,
          recordsReturned,
          hasNextLink,
          cumulativeRecords,
        });
      } else {
        if (!isNonNegativeInteger(totalPages)
          || !isNonNegativeInteger(totalRecords)
          || !isNonNegativeInteger(totalFetchElapsedMs)) {
          return false;
        }
        event = Object.freeze({
          component: PRODUCT_TRACE_COMPONENTS.DATAVERSE_CLIENT,
          diagnosticId: PRODUCT_PAGINATION_DIAGNOSTIC_ID,
          stage,
          elapsedMs: sanitizeElapsedMs(startMs, now),
          traceId,
          totalPages,
          totalRecords,
          totalFetchElapsedMs,
        });
      }

      try {
        logger(event);
      } catch {
        // El diagnóstico de paginación tampoco altera la recuperación Product.
      }
      return true;
    },
  });
};
