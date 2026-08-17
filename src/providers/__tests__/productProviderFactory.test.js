import { describe, expect, it, vi } from 'vitest';
import { createProductProvider, normalizeProductSource } from '../productProviderFactory.js';

describe('productProviderFactory', () => {
  it('mantiene local como fallback y procesa el Maestro existente', async () => {
    const provider = createProductProvider({
      source: '',
      rawMaster: 'SKU\tMODELO\tUSA\nLOCAL-1\tProducto\t20',
    });
    await expect(provider.loadProducts()).resolves.toEqual([
      expect.objectContaining({ sku: 'LOCAL-1', priceUSA: 20 }),
    ]);
  });

  it('selecciona Dataverse solo cuando se configura explícitamente', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ products: [] }) }));
    const provider = createProductProvider({
      source: 'dataverse',
      apiBaseUrl: 'https://backend.invalid',
      fetchImpl,
      getAccessToken: async () => 'token',
    });
    await expect(provider.loadProducts()).resolves.toEqual([]);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('rechaza fuentes no autorizadas', () => {
    expect(() => normalizeProductSource('otra')).toThrow(
      'ProductProviderFactory: "VITE_PRODUCT_SOURCE" debe ser "local" o "dataverse".',
    );
  });
});
