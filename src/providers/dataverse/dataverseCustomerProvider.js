// Frontera frontend: consume únicamente la API Customer y nunca Dataverse,
// Entra, nombres lógicos, credenciales o tokens.

import { normalizeCustomer } from '../../domain/customer/customer.js';
import { createAuthenticatedApiClient } from './authenticatedApiClient.js';

const PUBLIC_ERROR_MESSAGE = 'No fue posible consultar el Maestro Cliente.';

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

export const createDataverseCustomerProvider = ({
  apiBaseUrl = configuredApiBaseUrl(),
  fetchImpl = globalThis.fetch,
  getAccessToken,
  requestTimeoutMs = 10000,
} = {}) => {
  const apiClient = createAuthenticatedApiClient({
    apiBaseUrl,
    fetchImpl,
    getAccessToken,
    requestTimeoutMs,
    consumerName: 'DataverseCustomerProvider',
    codes: CUSTOMER_API_ERROR_CODES,
    createError: (code) => new CustomerApiError(code),
  });

  const search = async (type, query) => {
    const normalizedQuery = query === null || query === undefined
      ? ''
      : String(query).trim();
    if (!normalizedQuery) return [];

    const url = new URL('/api/customers/search', 'http://customer-api.local');
    url.searchParams.set('type', type);
    url.searchParams.set('q', normalizedQuery);
    const payload = await apiClient.getJson(`${url.pathname}${url.search}`);
    if (!Array.isArray(payload?.customers)) {
      throw new CustomerApiError(CUSTOMER_API_ERROR_CODES.INVALID_RESPONSE);
    }
    return payload.customers.map(normalizeCustomer);
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
