import { initializeAuthentication } from './authenticationService.js';
import { getAccessToken } from './customerApiAccessToken.js';

export const AUTHENTICATED_API_SMOKE_QUERY = 'phase1-010b-smoke';

const CONTROLLED_CUSTOMER_CODE = 'CL0000041';

const configuredApiBaseUrl = () => import.meta.env.VITE_API_BASE_URL;

const normalizeApiBaseUrl = (value) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('AuthenticatedApiSmokeTest: falta "VITE_API_BASE_URL".');
  }
  const parsedUrl = new URL(value.trim());
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('AuthenticatedApiSmokeTest: "VITE_API_BASE_URL" debe usar HTTP o HTTPS.');
  }
  return value.trim().replace(/\/+$/, '');
};

const createResult = (overrides = {}) => Object.freeze({
  endpoint: null,
  msalAuthentication: 'not_checked',
  accessTokenAcquisition: 'not_attempted',
  renderJwtValidation: 'not_attempted',
  dataverseRequest: 'not_attempted',
  httpStatus: null,
  customersReturned: null,
  diagnostic: null,
  ...overrides,
});

const readCustomersReturned = async (response) => {
  if (response.status !== 200) return null;
  try {
    const payload = await response.json();
    return Array.isArray(payload?.customers) ? payload.customers.length : null;
  } catch {
    return null;
  }
};

const classifyJwtValidation = (httpStatus) => {
  if (httpStatus === 401 || httpStatus === 403) return 'rejected';
  if (httpStatus === 200 || httpStatus >= 500) return 'accepted';
  return 'not_confirmed';
};

const classifyDiagnostic = (httpStatus, customersReturned) => {
  if (httpStatus === 200) {
    return customersReturned === null ? 'INVALID_RESPONSE' : null;
  }
  if (httpStatus === 401) return 'AUTHENTICATION_REJECTED';
  if (httpStatus === 403) return 'AUTHORIZATION_REJECTED';
  if (httpStatus === 429) return 'RATE_LIMITED';
  if (httpStatus >= 500) return 'DATAVERSE_REQUEST_FAILED';
  return 'UNEXPECTED_RESPONSE';
};

const classifyDataverseRequest = (httpStatus) => (
  httpStatus === 200 || httpStatus >= 500 ? 'attempted' : 'not_attempted'
);

export const isAuthenticatedApiSmokeTestRequested = (
  search = globalThis.location?.search ?? '',
) => new URLSearchParams(search).get(AUTHENTICATED_API_SMOKE_QUERY) === '1';

export const runAuthenticatedApiSmokeTest = async ({
  apiBaseUrl = configuredApiBaseUrl(),
  initialize = initializeAuthentication,
  acquireAccessToken = getAccessToken,
  fetchImpl = globalThis.fetch,
} = {}) => {
  const endpoint = new URL('/api/customers/search', normalizeApiBaseUrl(apiBaseUrl));
  endpoint.searchParams.set('type', 'code');
  endpoint.searchParams.set('q', CONTROLLED_CUSTOMER_CODE);
  if (typeof initialize !== 'function' || typeof acquireAccessToken !== 'function'
    || typeof fetchImpl !== 'function') {
    throw new Error('AuthenticatedApiSmokeTest: dependencias inválidas.');
  }

  let account;
  try {
    account = await initialize();
  } catch {
    return createResult({
      endpoint: endpoint.href,
      msalAuthentication: 'failed',
      diagnostic: 'MSAL_AUTHENTICATION_FAILED',
    });
  }

  if (!account) {
    return createResult({
      endpoint: endpoint.href,
      msalAuthentication: 'not_authenticated',
    });
  }

  let accessToken;
  try {
    accessToken = await acquireAccessToken();
  } catch {
    return createResult({
      endpoint: endpoint.href,
      msalAuthentication: 'authenticated',
      accessTokenAcquisition: 'failed',
      diagnostic: 'ACCESS_TOKEN_ACQUISITION_FAILED',
    });
  }

  if (typeof accessToken !== 'string' || accessToken.trim() === '') {
    return createResult({
      endpoint: endpoint.href,
      msalAuthentication: 'authenticated',
      accessTokenAcquisition: 'not_acquired',
      diagnostic: 'ACCESS_TOKEN_NOT_ACQUIRED',
    });
  }

  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    return createResult({
      endpoint: endpoint.href,
      msalAuthentication: 'authenticated',
      accessTokenAcquisition: 'acquired',
      renderJwtValidation: 'not_confirmed',
      dataverseRequest: 'not_confirmed',
      diagnostic: 'NETWORK_REQUEST_FAILED',
    });
  }

  const customersReturned = await readCustomersReturned(response);
  return createResult({
    endpoint: endpoint.href,
    msalAuthentication: 'authenticated',
    accessTokenAcquisition: 'acquired',
    renderJwtValidation: classifyJwtValidation(response.status),
    dataverseRequest: classifyDataverseRequest(response.status),
    httpStatus: response.status,
    customersReturned,
    diagnostic: classifyDiagnostic(response.status, customersReturned),
  });
};
