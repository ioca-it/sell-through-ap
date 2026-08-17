import { describe, expect, it, vi } from 'vitest';
import {
  createDataverseProductProvider,
  PRODUCT_API_ERROR_CODES,
  ProductApiError,
} from '../dataverseProductProvider.js';

const apiProduct = {
  sku: 'SKU-001',
  productName: 'Producto Uno',
  brand: 'Marca',
  category: 'Categoría',
  discontinuationDate: '2027-06-30T00:00:00.000Z',
  creationDate: '2026-08-01T00:00:00.000Z',
  level: 'BETTER',
  status: 'ACTIVO',
  imageUrl: '',
  productUrl: '',
  priceUSA: 25,
  priceChina: 18,
};

const createProvider = ({ ok = true, status = 200, payload = { products: [apiProduct] } } = {}) => {
  const fetchImpl = vi.fn(async () => ({ ok, status, json: async () => payload }));
  return {
    provider: createDataverseProductProvider({
      apiBaseUrl: 'https://backend.invalid',
      fetchImpl,
      getAccessToken: async () => 'delegated-token',
    }),
    fetchImpl,
  };
};

describe('DataverseProductProvider vía backend portable', () => {
  it('carga el endpoint Product específico sin OData ni nombres Dataverse', async () => {
    const { provider, fetchImpl } = createProvider();
    const products = await provider.loadProducts();
    expect(products).toEqual([{
      ...apiProduct,
      discontinuationDate: new Date(apiProduct.discontinuationDate),
      creationDate: new Date(apiProduct.creationDate),
    }]);

    const [url, options] = fetchImpl.mock.calls[0];
    expect(url.pathname).toBe('/api/products/master');
    expect(url.search).toBe('');
    expect(options.headers.Authorization).toBe('Bearer delegated-token');
    expect(`${url.href}${JSON.stringify(options)}`).not.toMatch(
      /\$filter|\$select|\$orderby|productpricelevel|crbbe_|amount/,
    );
  });

  it('descarta campos extra y conserva URLs/fechas vacías controladas', async () => {
    const { provider } = createProvider({
      payload: { products: [{ ...apiProduct, imageUrl: null, productUrl: undefined, extra: 'x' }] },
    });
    await expect(provider.loadProducts()).resolves.toEqual([
      expect.objectContaining({ imageUrl: '', productUrl: '' }),
    ]);
    expect(Object.keys((await provider.loadProducts())[0])).not.toContain('extra');
  });

  it('clasifica conflicto 409 sin seleccionar un precio', async () => {
    const { provider } = createProvider({ ok: false, status: 409 });
    await expect(provider.loadProducts()).rejects.toEqual(expect.objectContaining({
      code: PRODUCT_API_ERROR_CODES.MASTER_CONFLICT,
    }));
  });

  it('rechaza respuesta inválida', async () => {
    const { provider } = createProvider({ payload: { value: [apiProduct] } });
    await expect(provider.loadProducts()).rejects.toBeInstanceOf(ProductApiError);
  });
});
