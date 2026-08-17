import { describe, expect, it, vi } from 'vitest';
import {
  createProductMasterService,
  getProductMasterErrorMessage,
} from '../productMasterService.js';

describe('ProductMasterService', () => {
  it('delega la carga al Repository', async () => {
    const repository = { getProducts: vi.fn(async () => [{ sku: 'SKU-1' }]) };
    const service = createProductMasterService({ repository });
    await expect(service.loadProducts()).resolves.toEqual([{ sku: 'SKU-1' }]);
    expect(repository.getProducts).toHaveBeenCalledOnce();
  });

  it('expone mensaje funcional para conflicto sin detalles físicos', () => {
    expect(getProductMasterErrorMessage({ code: 'PRODUCT_MASTER_CONFLICT' })).toBe(
      'El Maestro Producto contiene precios duplicados en conflicto. Requiere definición funcional.',
    );
  });
});
