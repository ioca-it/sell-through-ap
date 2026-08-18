import { describe, expect, it, vi } from 'vitest';
import {
  createProductMasterService,
  getProductMasterErrorMessage,
} from '../productMasterService.js';

describe('ProductMasterService', () => {
  it('delega la carga al Repository', async () => {
    const repository = {
      getBrands: vi.fn(async () => ['ANKER']),
      getProducts: vi.fn(async () => [{ sku: 'SKU-1', priceUSA: 0, priceChina: null }]),
    };
    const service = createProductMasterService({ repository });
    await expect(service.loadBrands()).resolves.toEqual(['ANKER']);
    await expect(service.loadProducts({ brand: 'ANKER' })).resolves.toEqual([
      { sku: 'SKU-1', priceUSA: 0, priceChina: null },
    ]);
    expect(repository.getProducts).toHaveBeenCalledWith({ brand: 'ANKER' });
  });

  it('expone mensaje funcional para conflicto sin detalles físicos', () => {
    expect(getProductMasterErrorMessage({ code: 'PRODUCT_MASTER_CONFLICT' })).toBe(
      'El Maestro Producto contiene precios duplicados en conflicto. Requiere definición funcional.',
    );
  });
});
