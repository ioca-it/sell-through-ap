import { initializeAuthentication } from './authenticationService.js';
import { getAccessToken } from './customerApiAccessToken.js';

export const AUTHENTICATED_API_SMOKE_QUERY = 'phase1-007-smoke';

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
  dataverseAccess: 'not_attempted',
  httpStatus: null,
  responseCode: null,
  ...overrides,
});

const readResponseCode = async (response) => {
  try {
    const payload = await response.json();
    return typeof payload?.error?.code === 'string' ? payload.error.code : null;
  } catch {
    return null;
  }
};

const classifyJwtValidation = (httpStatus, responseCode) => {
  if (httpStatus === 400 && responseCode === 'INVALID_CUSTOMER_REQUEST') {
    return 'accepted';
  }
  if (httpStatus === 401 && responseCode === 'AUTHENTICATION_REQUIRED') {
    return 'rejected';
  }
  if (httpStatus === 403 && responseCode === 'INSUFFICIENT_SCOPE') {
    return 'rejected';
  }
  return 'not_confirmed';
};

export const isAuthenticatedApiSmokeTestRequested = (
  search = globalThis.location?.search ?? '',
) => new URLSearchParams(search).get(AUTHENTICATED_API_SMOKE_QUERY) === '1';

export const runAuthenticatedApiSmokeTest = async ({
  apiBaseUrl = configuredApiBaseUrl(),
  initialize = initializeAuthentication,
  acquireAccessToken = getAccessToken,
  fetchImpl = globalThis.fetch,
} = {}) => {
  const endpoint = new URL('/api/customers/search?type=code', normalizeApiBaseUrl(apiBaseUrl));
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
    });
  }

  if (typeof accessToken !== 'string' || accessToken.trim() === '') {
    return createResult({
      endpoint: endpoint.href,
      msalAuthentication: 'authenticated',
      accessTokenAcquisition: 'not_acquired',
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
      dataverseAccess: 'not_requested',
    });
  }

  const responseCode = await readResponseCode(response);
  const renderJwtValidation = classifyJwtValidation(response.status, responseCode);
  const dataverseAccess = ['accepted', 'rejected'].includes(renderJwtValidation)
    ? 'not_requested'
    : 'not_confirmed';
  return createResult({
    endpoint: endpoint.href,
    msalAuthentication: 'authenticated',
    accessTokenAcquisition: 'acquired',
    renderJwtValidation,
    dataverseAccess,
    httpStatus: response.status,
    responseCode,
  });
};
