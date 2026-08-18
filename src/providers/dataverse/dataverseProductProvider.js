// Frontera frontend de Maestro Producto: consume el endpoint funcional del
// backend portable y nunca construye ni acepta consultas OData.

import {
  normalizeProduct,
  normalizeProductBrands,
  requireProductBrand,
} from '../../domain/product/product.js';
import { createAuthenticatedApiClient } from './authenticatedApiClient.js';

const PUBLIC_ERROR_MESSAGE = 'No fue posible consultar el Maestro Producto.';

export const PRODUCT_API_ERROR_CODES = Object.freeze({
  SESSION_REQUIRED: 'PRODUCT_SESSION_REQUIRED',
  AUTHENTICATION_REQUIRED: 'PRODUCT_AUTHENTICATION_REQUIRED',
  AUTHENTICATION_UNAVAILABLE: 'PRODUCT_AUTHENTICATION_UNAVAILABLE',
  AUTHORIZATION_DENIED: 'PRODUCT_AUTHORIZATION_DENIED',
  RATE_LIMITED: 'PRODUCT_RATE_LIMITED',
  SERVICE_UNAVAILABLE: 'PRODUCT_SERVICE_UNAVAILABLE',
  NETWORK_ERROR: 'PRODUCT_NETWORK_ERROR',
  REQUEST_TIMEOUT: 'PRODUCT_REQUEST_TIMEOUT',
  INVALID_RESPONSE: 'PRODUCT_INVALID_RESPONSE',
  MASTER_CONFLICT: 'PRODUCT_MASTER_CONFLICT',
});

export class ProductApiError extends Error {
  constructor(code = PRODUCT_API_ERROR_CODES.SERVICE_UNAVAILABLE) {
    super(PUBLIC_ERROR_MESSAGE);
    this.name = 'ProductApiError';
    this.code = code;
  }
}

const configuredApiBaseUrl = () => import.meta.env.VITE_API_BASE_URL;

const classifyProductHttpStatus = (status, codes) => {
  if (status === 409) return codes.MASTER_CONFLICT;
  if (status === 401) return codes.AUTHENTICATION_REQUIRED;
  if (status === 403) return codes.AUTHORIZATION_DENIED;
  if (status === 429) return codes.RATE_LIMITED;
  if (status >= 500) return codes.SERVICE_UNAVAILABLE;
  return codes.INVALID_RESPONSE;
};

export const createDataverseProductProvider = ({
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
    consumerName: 'DataverseProductProvider',
    codes: PRODUCT_API_ERROR_CODES,
    createError: (code) => new ProductApiError(code),
    classifyHttpStatus: classifyProductHttpStatus,
  });

  return Object.freeze({
    async loadBrands() {
      const payload = await apiClient.getJson('/api/products/brands');
      if (!Array.isArray(payload?.brands)
        || payload.brands.some((brand) => typeof brand !== 'string')) {
        throw new ProductApiError(PRODUCT_API_ERROR_CODES.INVALID_RESPONSE);
      }
      return normalizeProductBrands(payload.brands);
    },

    async loadProducts({ brand } = {}) {
      const selectedBrand = requireProductBrand(brand);
      const payload = await apiClient.getJson(
        `/api/products/master?brand=${encodeURIComponent(selectedBrand)}`,
      );
      if (!Array.isArray(payload?.products)) {
        throw new ProductApiError(PRODUCT_API_ERROR_CODES.INVALID_RESPONSE);
      }
      return payload.products.map(normalizeProduct);
    },
  });
};
