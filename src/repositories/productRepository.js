// Frontera estable de Maestro Producto. Expone únicamente Product normalizado,
// independientemente de si la fuente efectiva es local o Dataverse.

import { isProduct, normalizeProduct } from '../domain/product/product.js';

export const createProductRepository = ({ provider } = {}) => {
  if (!provider || typeof provider.loadProducts !== 'function') {
    throw new Error('ProductRepository: Product Provider inválido.');
  }

  return Object.freeze({
    async getProducts() {
      const products = await provider.loadProducts();
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
