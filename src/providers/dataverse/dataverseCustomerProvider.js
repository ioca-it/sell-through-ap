// Frontera frontend: consume únicamente la API Customer y nunca Dataverse,
// Entra, nombres lógicos, credenciales o tokens.

import { normalizeCustomer } from '../../domain/customer/customer.js';

const PUBLIC_ERROR_MESSAGE = 'No fue posible consultar el Maestro Cliente.';

export class CustomerApiError extends Error {
  constructor() {
    super(PUBLIC_ERROR_MESSAGE);
    this.name = 'CustomerApiError';
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

export const createDataverseCustomerProvider = ({
  apiBaseUrl = configuredApiBaseUrl(),
  fetchImpl = globalThis.fetch,
  getAccessToken,
} = {}) => {
  const normalizedApiBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
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

    try {
      const accessToken = await getAccessToken();
      if (typeof accessToken !== 'string' || accessToken.trim() === '') {
        throw new CustomerApiError();
      }
      const response = await fetchImpl(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) throw new CustomerApiError();

      const payload = await response.json();
      if (!Array.isArray(payload?.customers)) throw new CustomerApiError();
      return payload.customers.map(normalizeCustomer);
    } catch (error) {
      if (error instanceof CustomerApiError) throw error;
      throw new CustomerApiError();
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
