import { describe, expect, it } from 'vitest';
import { createProductRepository } from '../productRepository.js';

describe('ProductRepository', () => {
  it('normaliza el contrato del Provider y elimina propiedades extra', async () => {
    const repository = createProductRepository({
      provider: {
        loadProducts: async () => [{
          sku: ' SKU-1 ',
          productName: 'Producto',
          extra: 'no-publicar',
        }],
      },
    });
    const products = await repository.getProducts();
    expect(products[0].sku).toBe('SKU-1');
    expect(products[0]).not.toHaveProperty('extra');
  });

  it('rechaza Products sin SKU y Providers inválidos', async () => {
    expect(() => createProductRepository()).toThrow('ProductRepository: Product Provider inválido.');
    const repository = createProductRepository({
      provider: { loadProducts: async () => [{ sku: '' }] },
    });
    await expect(repository.getProducts()).rejects.toThrow(
      'ProductRepository: el Provider devolvió un Product inválido.',
    );
  });
});
