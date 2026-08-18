import { describe, expect, it } from 'vitest';
import { createProductRepository } from '../productRepository.js';

describe('ProductRepository', () => {
  it('normaliza el contrato del Provider y elimina propiedades extra', async () => {
    const repository = createProductRepository({
      provider: {
        loadBrands: async () => [' MARCA ', 'ANKER', 'MARCA'],
        loadProducts: async () => [{
          sku: ' SKU-1 ',
          productName: 'Producto',
          priceUSA: 0,
          priceChina: null,
          extra: 'no-publicar',
        }],
      },
    });
    await expect(repository.getBrands()).resolves.toEqual(['ANKER', 'MARCA']);
    const products = await repository.getProducts({ brand: 'MARCA' });
    expect(products[0].sku).toBe('SKU-1');
    expect(products[0]).toMatchObject({ priceUSA: 0, priceChina: null });
    expect(products[0]).not.toHaveProperty('extra');
  });

  it('rechaza Products sin SKU y Providers inválidos', async () => {
    expect(() => createProductRepository()).toThrow('ProductRepository: Product Provider inválido.');
    const repository = createProductRepository({
      provider: {
        loadBrands: async () => [],
        loadProducts: async () => [{ sku: '' }],
      },
    });
    await expect(repository.getProducts({ brand: 'MARCA' })).rejects.toThrow(
      'ProductRepository: el Provider devolvió un Product inválido.',
    );
  });

  it('rechaza lista de marcas inválida y no carga Products sin brand', async () => {
    let productCalls = 0;
    const repository = createProductRepository({
      provider: {
        loadBrands: async () => [null],
        loadProducts: async () => {
          productCalls += 1;
          return [];
        },
      },
    });
    await expect(repository.getBrands()).rejects.toThrow(/marcas normalizadas/);
    await expect(repository.getProducts()).rejects.toEqual(
      expect.objectContaining({ code: 'PRODUCT_BRAND_REQUIRED' }),
    );
    expect(productCalls).toBe(0);
  });
});
