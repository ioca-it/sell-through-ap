// Frontera estable de Maestro Producto. Expone únicamente Product normalizado,
// independientemente de si la fuente efectiva es local o Dataverse.

import {
  isProduct,
  normalizeProduct,
  normalizeProductBrands,
  requireProductBrand,
} from '../domain/product/product.js';

export const createProductRepository = ({ provider } = {}) => {
  if (!provider || typeof provider.loadBrands !== 'function'
    || typeof provider.loadProducts !== 'function') {
    throw new Error('ProductRepository: Product Provider inválido.');
  }

  return Object.freeze({
    async getBrands() {
      const brands = await provider.loadBrands();
      if (!Array.isArray(brands)
        || brands.some((brand) => typeof brand !== 'string' || !brand.trim())) {
        throw new Error('ProductRepository: el Provider debe devolver marcas normalizadas.');
      }
      return normalizeProductBrands(brands);
    },

    async getProducts({ brand } = {}) {
      const selectedBrand = requireProductBrand(brand);
      const products = await provider.loadProducts({ brand: selectedBrand });
      if (!Array.isArray(products)) {
        throw new Error('ProductRepository: el Provider debe devolver un arreglo.');
      }
      return products.map((product) => {
        const normalized = normalizeProduct(product);
        if (!isProduct(normalized)) {
          throw new Error('ProductRepository: el Provider devolvió un Product inválido.');
        }
        return normalized;
      });
    },
  });
};
