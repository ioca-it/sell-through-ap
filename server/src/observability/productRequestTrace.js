import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

export const PRODUCT_TRACE_DIAGNOSTIC_ID = 'PHASE1_066_PRODUCT_REQUEST_TRACE';

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

const ALLOWED_COMPONENTS = new Set(Object.values(PRODUCT_TRACE_COMPONENTS));
const ALLOWED_STAGES = new Set(Object.values(PRODUCT_TRACE_STAGES));
const ALLOWED_RESULTS = new Set(Object.values(PRODUCT_TRACE_RESULTS));
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
  });
};
