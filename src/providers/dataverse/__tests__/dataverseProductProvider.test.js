import { describe, expect, it, vi } from 'vitest';
import {
  createDataverseProductProvider,
  PRODUCT_API_ERROR_CODES,
  PRODUCT_REQUEST_TIMEOUT_MS,
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
    const products = await provider.loadProducts({ brand: 'Marca' });
    expect(products).toEqual([{
      ...apiProduct,
      discontinuationDate: new Date(apiProduct.discontinuationDate),
      fechaStr: '2027-06-30',
      creationDate: new Date(apiProduct.creationDate),
    }]);

    const [url, options] = fetchImpl.mock.calls[0];
    expect(url.pathname).toBe('/api/products/master');
    expect(url.searchParams.get('brand')).toBe('Marca');
    expect(options.headers.Authorization).toBe('Bearer delegated-token');
    expect(`${url.href}${JSON.stringify(options)}`).not.toMatch(
      /\$filter|\$select|\$orderby|productpricelevel|crbbe_|amount/,
    );
  });

  it('codifica brand como único parámetro funcional del Product Master', async () => {
    const { provider, fetchImpl } = createProvider({ payload: { products: [] } });
    const brand = 'A&B / Audio';

    await expect(provider.loadProducts({ brand })).resolves.toEqual([]);

    const [url] = fetchImpl.mock.calls[0];
    expect(url.searchParams.get('brand')).toBe(brand);
    expect(url.search).toBe(`?brand=${encodeURIComponent(brand)}`);
    expect([...url.searchParams.keys()]).toEqual(['brand']);
  });

  it('descarta campos extra y conserva URLs/fechas vacías controladas', async () => {
    const { provider } = createProvider({
      payload: { products: [{ ...apiProduct, imageUrl: null, productUrl: undefined, extra: 'x' }] },
    });
    await expect(provider.loadProducts({ brand: 'Marca' })).resolves.toEqual([
      expect.objectContaining({ imageUrl: '', productUrl: '' }),
    ]);
    expect(Object.keys((await provider.loadProducts({ brand: 'Marca' }))[0])).not.toContain('extra');
  });

  it('preserva precios null y cero sin aplicar fallback', async () => {
    const { provider } = createProvider({
      payload: { products: [{ ...apiProduct, priceUSA: 0, priceChina: null }] },
    });
    await expect(provider.loadProducts({ brand: 'Marca' })).resolves.toEqual([
      expect.objectContaining({ priceUSA: 0, priceChina: null }),
    ]);
  });

  it('clasifica conflicto 409 sin seleccionar un precio', async () => {
    const { provider } = createProvider({ ok: false, status: 409 });
    await expect(provider.loadProducts({ brand: 'Marca' })).rejects.toEqual(expect.objectContaining({
      code: PRODUCT_API_ERROR_CODES.MASTER_CONFLICT,
    }));
  });

  it('rechaza respuesta inválida', async () => {
    const { provider } = createProvider({ payload: { value: [apiProduct] } });
    await expect(provider.loadProducts({ brand: 'Marca' })).rejects.toBeInstanceOf(ProductApiError);
  });

  it('carga marcas desde el endpoint funcional, normaliza y no envía OData', async () => {
    const { provider, fetchImpl } = createProvider({
      payload: { brands: [' SKULLCANDY ', 'ANKER', 'SKULLCANDY'] },
    });
    await expect(provider.loadBrands()).resolves.toEqual(['ANKER', 'SKULLCANDY']);
    const [url] = fetchImpl.mock.calls[0];
    expect(url.pathname).toBe('/api/products/brands');
    expect(url.search).toBe('');
    expect(url.href).not.toMatch(/\$filter|\$select|crbbe_/);
  });

  it('usa temporalmente 35000 ms por default en loadBrands y loadProducts', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const fetchImpl = vi.fn(async (url) => ({
      ok: true,
      status: 200,
      json: async () => (
        url.pathname === '/api/products/brands' ? { brands: [] } : { products: [] }
      ),
    }));
    const provider = createDataverseProductProvider({
      apiBaseUrl: 'https://backend.invalid',
      fetchImpl,
      getAccessToken: async () => 'delegated-token',
    });

    await provider.loadBrands();
    await provider.loadProducts({ brand: 'Marca' });

    expect(PRODUCT_REQUEST_TIMEOUT_MS).toBe(35000);
    expect(setTimeoutSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 35000);
    expect(setTimeoutSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 35000);
    fetchImpl.mock.calls.forEach(([, options]) => {
      expect(options.signal).toBeInstanceOf(AbortSignal);
    });
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });

  it('mantiene timeout inyectable, aborta y devuelve el error Product sanitizado', async () => {
    vi.useFakeTimers();
    try {
      let requestSignal;
      const fetchImpl = vi.fn(async (_url, { signal }) => {
        requestSignal = signal;
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            const error = new Error('detalle técnico sensible');
            error.name = 'AbortError';
            reject(error);
          }, { once: true });
        });
      });
      const provider = createDataverseProductProvider({
        apiBaseUrl: 'https://backend.invalid',
        fetchImpl,
        getAccessToken: async () => 'delegated-token',
        requestTimeoutMs: 50,
      });

      const pending = provider.loadBrands();
      const rejection = expect(pending).rejects.toEqual(expect.objectContaining({
        name: 'ProductApiError',
        code: PRODUCT_API_ERROR_CODES.REQUEST_TIMEOUT,
        message: 'No fue posible consultar el Maestro Producto.',
      }));
      await vi.advanceTimersByTimeAsync(49);
      expect(requestSignal.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await rejection;
      expect(requestSignal.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('acepta una respuesta previa al timeout y limpia el timer', async () => {
    vi.useFakeTimers();
    try {
      const provider = createDataverseProductProvider({
        apiBaseUrl: 'https://backend.invalid',
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          json: async () => ({ brands: ['ANKER'] }),
        }),
        getAccessToken: async () => 'delegated-token',
        requestTimeoutMs: 50,
      });

      await expect(provider.loadBrands()).resolves.toEqual(['ANKER']);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('no consulta Product Master cuando brand no es válida', async () => {
    const { provider, fetchImpl } = createProvider();
    await expect(provider.loadProducts()).rejects.toEqual(expect.objectContaining({
      code: 'PRODUCT_BRAND_REQUIRED',
    }));
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
