import { initializeAuthentication } from './authenticationService.js';
import { getAccessToken } from './customerApiAccessToken.js';

export const PRODUCT_MASTER_SMOKE_QUERY = 'phase1-042-product-smoke';

const DEFAULT_REQUEST_TIMEOUT_MS = 10000;
const CONSOLE_LABEL = 'Phase1-042 Real Dataverse Product Master Smoke Test';

const configuredApiBaseUrl = () => import.meta.env.VITE_API_BASE_URL;

const normalizeApiBaseUrl = (value) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('ProductMasterSmokeTest: falta "VITE_API_BASE_URL".');
  }
  const parsedUrl = new URL(value.trim());
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('ProductMasterSmokeTest: "VITE_API_BASE_URL" debe usar HTTP o HTTPS.');
  }
  return value.trim().replace(/\/+$/, '');
};

const createResult = (overrides = {}) => Object.freeze({
  httpStatus: null,
  productsReturned: null,
  renderJwtValidation: 'not_attempted',
  dataverseRequest: 'not_attempted',
  diagnostic: null,
  hasPriceUSA: null,
  hasPriceChina: null,
  hasNullPrice: null,
  hasFormattedLevel: null,
  hasFormattedStatus: null,
  ...overrides,
});

const isReadableLabel = (value) => (
  typeof value === 'string'
  && value.trim() !== ''
  && !/^-?\d+$/.test(value.trim())
);

const summarizeProducts = async (response) => {
  if (response.status !== 200 || typeof response.json !== 'function') return null;
  try {
    const payload = await response.json();
    if (!Array.isArray(payload?.products)
      || payload.products.some((product) => (
        !product || typeof product !== 'object' || Array.isArray(product)
      ))) {
      return null;
    }

    const products = payload.products;
    return Object.freeze({
      productsReturned: products.length,
      hasPriceUSA: products.some(({ priceUSA }) => Number.isFinite(priceUSA)),
      hasPriceChina: products.some(({ priceChina }) => Number.isFinite(priceChina)),
      hasNullPrice: products.some(({ priceUSA, priceChina }) => (
        priceUSA === null || priceChina === null
      )),
      hasFormattedLevel: products.some(({ level }) => isReadableLabel(level)),
      hasFormattedStatus: products.some(({ status }) => isReadableLabel(status)),
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    return null;
  }
};

const classifyJwtValidation = (httpStatus) => {
  if (httpStatus === 401 || httpStatus === 403) return 'rejected';
  if (httpStatus === 200 || httpStatus === 409 || httpStatus >= 500) return 'accepted';
  return 'not_confirmed';
};

const classifyDataverseRequest = (httpStatus) => (
  httpStatus === 200 || httpStatus === 409 || httpStatus >= 500
    ? 'attempted'
    : 'not_attempted'
);

const classifyDiagnostic = (httpStatus, summary) => {
  if (httpStatus === 200) return summary ? null : 'INVALID_RESPONSE';
  if (httpStatus === 401) return 'AUTHENTICATION_REJECTED';
  if (httpStatus === 403) return 'AUTHORIZATION_REJECTED';
  if (httpStatus === 409) return 'PRODUCT_MASTER_CONFLICT';
  if (httpStatus === 429) return 'RATE_LIMITED';
  if (httpStatus >= 500) return 'DATAVERSE_REQUEST_FAILED';
  return 'UNEXPECTED_RESPONSE';
};

export const isProductMasterSmokeTestRequested = (
  search = globalThis.location?.search ?? '',
) => new URLSearchParams(search).get(PRODUCT_MASTER_SMOKE_QUERY) === '1';

export const runProductMasterSmokeTest = async ({
  apiBaseUrl = configuredApiBaseUrl(),
  initialize = initializeAuthentication,
  acquireAccessToken = getAccessToken,
  fetchImpl = globalThis.fetch,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
} = {}) => {
  if (typeof initialize !== 'function' || typeof acquireAccessToken !== 'function'
    || typeof fetchImpl !== 'function' || !Number.isFinite(requestTimeoutMs)
    || requestTimeoutMs <= 0) {
    throw new Error('ProductMasterSmokeTest: dependencias inválidas.');
  }

  let endpoint;
  try {
    endpoint = new URL('/api/products/master', normalizeApiBaseUrl(apiBaseUrl));
  } catch {
    return createResult({ diagnostic: 'SMOKE_CONFIGURATION_INVALID' });
  }

  let account;
  try {
    account = await initialize();
  } catch {
    return createResult({ diagnostic: 'MSAL_AUTHENTICATION_FAILED' });
  }
  if (!account) return createResult({ diagnostic: 'SESSION_REQUIRED' });

  let accessToken;
  try {
    accessToken = await acquireAccessToken();
  } catch {
    return createResult({ diagnostic: 'ACCESS_TOKEN_ACQUISITION_FAILED' });
  }
  if (typeof accessToken !== 'string' || accessToken.trim() === '') {
    return createResult({ diagnostic: 'ACCESS_TOKEN_NOT_ACQUIRED' });
  }

  const abortController = new AbortController();
  const timeoutId = globalThis.setTimeout(() => abortController.abort(), requestTimeoutMs);
  let response;
  let httpStatus;
  let summary;
  try {
    response = await fetchImpl(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      signal: abortController.signal,
    });
    httpStatus = Number.isInteger(response?.status) ? response.status : null;
    summary = httpStatus === 200 ? await summarizeProducts(response) : null;
  } catch (error) {
    return createResult({
      renderJwtValidation: 'not_confirmed',
      dataverseRequest: 'not_confirmed',
      diagnostic: abortController.signal.aborted || error?.name === 'AbortError'
        ? 'REQUEST_TIMEOUT'
        : 'NETWORK_REQUEST_FAILED',
    });
  } finally {
    globalThis.clearTimeout(timeoutId);
  }

  return createResult({
    httpStatus,
    ...(summary ?? {}),
    renderJwtValidation: classifyJwtValidation(httpStatus),
    dataverseRequest: classifyDataverseRequest(httpStatus),
    diagnostic: classifyDiagnostic(httpStatus, summary),
  });
};

// El launcher mantiene el arnés fuera del flujo Product normal: sin el query
// temporal no inicializa MSAL, no adquiere token y no ejecuta ningún request.
export const startProductMasterSmokeTest = async ({
  search = globalThis.location?.search ?? '',
  run = runProductMasterSmokeTest,
  logger = globalThis.console,
} = {}) => {
  if (!isProductMasterSmokeTestRequested(search)) return false;
  try {
    const result = await run();
    logger?.info?.(CONSOLE_LABEL, result);
    return true;
  } catch {
    logger?.error?.(`${CONSOLE_LABEL} no pudo iniciarse.`);
    return true;
  }
};
