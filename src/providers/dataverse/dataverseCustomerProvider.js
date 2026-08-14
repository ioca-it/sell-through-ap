// Frontera frontend: consume únicamente la API Customer y nunca Dataverse,
// Entra, nombres lógicos, credenciales o tokens.

import { normalizeCustomer } from '../../domain/customer/customer.js';

const PUBLIC_ERROR_MESSAGE = 'No fue posible consultar el Maestro Cliente.';
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

export const CUSTOMER_API_ERROR_CODES = Object.freeze({
  SESSION_REQUIRED: 'CUSTOMER_SESSION_REQUIRED',
  AUTHENTICATION_REQUIRED: 'CUSTOMER_AUTHENTICATION_REQUIRED',
  AUTHENTICATION_UNAVAILABLE: 'CUSTOMER_AUTHENTICATION_UNAVAILABLE',
  AUTHORIZATION_DENIED: 'CUSTOMER_AUTHORIZATION_DENIED',
  RATE_LIMITED: 'CUSTOMER_RATE_LIMITED',
  SERVICE_UNAVAILABLE: 'CUSTOMER_SERVICE_UNAVAILABLE',
  NETWORK_ERROR: 'CUSTOMER_NETWORK_ERROR',
  REQUEST_TIMEOUT: 'CUSTOMER_REQUEST_TIMEOUT',
  INVALID_RESPONSE: 'CUSTOMER_INVALID_RESPONSE',
});

export class CustomerApiError extends Error {
  constructor(code = CUSTOMER_API_ERROR_CODES.SERVICE_UNAVAILABLE) {
    super(PUBLIC_ERROR_MESSAGE);
    this.name = 'CustomerApiError';
    this.code = code;
  }
}

const configuredApiBaseUrl = () => import.meta.env.VITE_API_BASE_URL;

const normalizeApiBaseUrl = (value) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('DataverseCustomerProvider: falta "VITE_API_BASE_URL".');
  }
  const parsedUrl = new URL(value.trim());
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('DataverseCustomerProvider: "VITE_API_BASE_URL" debe usar HTTP o HTTPS.');
  }
  return value.trim().replace(/\/+$/, '');
};

const validateRequestTimeout = (value) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('DataverseCustomerProvider: timeout inválido.');
  }
  return value;
};

const classifyHttpError = (status) => {
  if (status === 401) return CUSTOMER_API_ERROR_CODES.AUTHENTICATION_REQUIRED;
  if (status === 403) return CUSTOMER_API_ERROR_CODES.AUTHORIZATION_DENIED;
  if (status === 429) return CUSTOMER_API_ERROR_CODES.RATE_LIMITED;
  if (status >= 500) return CUSTOMER_API_ERROR_CODES.SERVICE_UNAVAILABLE;
  return CUSTOMER_API_ERROR_CODES.INVALID_RESPONSE;
};

export const createDataverseCustomerProvider = ({
  apiBaseUrl = configuredApiBaseUrl(),
  fetchImpl = globalThis.fetch,
  getAccessToken,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
} = {}) => {
  const normalizedApiBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
  const normalizedRequestTimeout = validateRequestTimeout(requestTimeoutMs);
  if (typeof fetchImpl !== 'function') {
    throw new Error('DataverseCustomerProvider: fetch no está disponible.');
  }
  if (typeof getAccessToken !== 'function') {
    throw new Error('DataverseCustomerProvider: falta "getAccessToken".');
  }

  const search = async (type, query) => {
    const normalizedQuery = query === null || query === undefined
      ? ''
      : String(query).trim();
    if (!normalizedQuery) return [];

    const url = new URL(`${normalizedApiBaseUrl}/api/customers/search`);
    url.searchParams.set('type', type);
    url.searchParams.set('q', normalizedQuery);

    let accessToken;
    try {
      accessToken = await getAccessToken();
    } catch {
      throw new CustomerApiError(CUSTOMER_API_ERROR_CODES.AUTHENTICATION_UNAVAILABLE);
    }
    if (typeof accessToken !== 'string' || accessToken.trim() === '') {
      // getAccessToken inicia el flujo MSAL existente; el Provider sólo evita el request.
      throw new CustomerApiError(CUSTOMER_API_ERROR_CODES.SESSION_REQUIRED);
    }

    const abortController = new AbortController();
    const timeoutId = globalThis.setTimeout(
      () => abortController.abort(),
      normalizedRequestTimeout,
    );

    try {
      let response;
      try {
        response = await fetchImpl(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          signal: abortController.signal,
        });
      } catch (error) {
        if (abortController.signal.aborted || error?.name === 'AbortError') {
          throw new CustomerApiError(CUSTOMER_API_ERROR_CODES.REQUEST_TIMEOUT);
        }
        throw new CustomerApiError(CUSTOMER_API_ERROR_CODES.NETWORK_ERROR);
      }

      if (!response.ok) {
        throw new CustomerApiError(classifyHttpError(response.status));
      }

      let payload;
      try {
        payload = await response.json();
      } catch (error) {
        if (abortController.signal.aborted || error?.name === 'AbortError') {
          throw new CustomerApiError(CUSTOMER_API_ERROR_CODES.REQUEST_TIMEOUT);
        }
        throw new CustomerApiError(CUSTOMER_API_ERROR_CODES.INVALID_RESPONSE);
      }
      if (!Array.isArray(payload?.customers)) {
        throw new CustomerApiError(CUSTOMER_API_ERROR_CODES.INVALID_RESPONSE);
      }
      return payload.customers.map(normalizeCustomer);
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  };

  return Object.freeze({
    searchCustomersByCode(query) {
      return search('code', query);
    },

    searchCustomersByName(query) {
      return search('name', query);
    },
  });
};
