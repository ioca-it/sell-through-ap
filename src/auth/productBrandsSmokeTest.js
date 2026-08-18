import { initializeAuthentication } from './authenticationService.js';
import { getAccessToken } from './customerApiAccessToken.js';

export const PRODUCT_BRANDS_SMOKE_QUERY = 'phase1-075-brands-smoke';

// Ventana exclusiva del arnés temporal: no configura el flujo Product normal.
const DEFAULT_REQUEST_TIMEOUT_MS = 35000;
const CONSOLE_LABEL = 'Phase1-075 Authenticated Product Brands Smoke Test';

const configuredApiBaseUrl = () => import.meta.env.VITE_API_BASE_URL;

const normalizeApiBaseUrl = (value) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('ProductBrandsSmokeTest: falta "VITE_API_BASE_URL".');
  }
  const parsedUrl = new URL(value.trim());
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('ProductBrandsSmokeTest: "VITE_API_BASE_URL" debe usar HTTP o HTTPS.');
  }
  return value.trim().replace(/\/+$/, '');
};

const createResult = ({
  httpStatus = null,
  renderJwtValidation = 'not_attempted',
  dataverseRequest = 'not_attempted',
  diagnostic = null,
  brandsReturned = null,
} = {}) => Object.freeze({
  httpStatus,
  renderJwtValidation,
  dataverseRequest,
  diagnostic,
  brandsReturned,
});

const summarizeBrands = async (response) => {
  if (response.status !== 200 || typeof response.json !== 'function') return null;
  try {
    const payload = await response.json();
    if (!Array.isArray(payload?.brands)) return null;
    return payload.brands.reduce(
      (count, brand) => count + (typeof brand === 'string' ? 1 : 0),
      0,
    );
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    return null;
  }
};

const classifyJwtValidation = (httpStatus) => {
  if (httpStatus === 401 || httpStatus === 403) return 'rejected';
  if (httpStatus === 200 || httpStatus >= 500) return 'accepted';
  return 'not_confirmed';
};

const classifyDataverseRequest = (httpStatus) => (
  httpStatus === 200 || httpStatus >= 500
    ? 'attempted'
    : 'not_attempted'
);

const classifyDiagnostic = (httpStatus, brandsReturned) => {
  if (httpStatus === 200) return brandsReturned === null ? 'INVALID_RESPONSE' : null;
  if (httpStatus === 401) return 'AUTHENTICATION_REJECTED';
  if (httpStatus === 403) return 'AUTHORIZATION_REJECTED';
  if (httpStatus === 429) return 'RATE_LIMITED';
  if (httpStatus >= 500) return 'DATAVERSE_REQUEST_FAILED';
  return 'UNEXPECTED_RESPONSE';
};

export const isProductBrandsSmokeTestRequested = (
  search = globalThis.location?.search ?? '',
) => new URLSearchParams(search).get(PRODUCT_BRANDS_SMOKE_QUERY) === '1';

export const runProductBrandsSmokeTest = async ({
  apiBaseUrl = configuredApiBaseUrl(),
  initialize = initializeAuthentication,
  acquireAccessToken = getAccessToken,
  fetchImpl = globalThis.fetch,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
} = {}) => {
  if (typeof initialize !== 'function' || typeof acquireAccessToken !== 'function'
    || typeof fetchImpl !== 'function' || !Number.isFinite(requestTimeoutMs)
    || requestTimeoutMs <= 0) {
    throw new Error('ProductBrandsSmokeTest: dependencias inválidas.');
  }

  let endpoint;
  try {
    endpoint = new URL('/api/products/brands', normalizeApiBaseUrl(apiBaseUrl));
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
  let brandsReturned;
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
    brandsReturned = httpStatus === 200 ? await summarizeBrands(response) : null;
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
    renderJwtValidation: classifyJwtValidation(httpStatus),
    dataverseRequest: classifyDataverseRequest(httpStatus),
    diagnostic: classifyDiagnostic(httpStatus, brandsReturned),
    brandsReturned,
  });
};

// Sin el query temporal exacto no inicializa MSAL, no adquiere token y no
// ejecuta requests; el resultado publicado ya fue reducido a su allowlist.
export const startProductBrandsSmokeTest = async ({
  search = globalThis.location?.search ?? '',
  run = runProductBrandsSmokeTest,
  logger = globalThis.console,
} = {}) => {
  if (!isProductBrandsSmokeTestRequested(search)) return false;
  try {
    const result = await run();
    logger?.info?.(CONSOLE_LABEL, result);
    return true;
  } catch {
    logger?.error?.(`${CONSOLE_LABEL} no pudo iniciarse.`);
    return true;
  }
};
