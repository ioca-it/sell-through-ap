export const createProductService = ({ productGateway } = {}) => {
  if (!productGateway || typeof productGateway.loadProducts !== 'function') {
    throw new Error('ProductService: Product Gateway inválido.');
  }
  return Object.freeze({
    loadMaster() {
      return productGateway.loadProducts();
    },
  });
};
