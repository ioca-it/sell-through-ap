import {
  PRODUCT_TRACE_COMPONENTS,
  PRODUCT_TRACE_RESULTS,
  PRODUCT_TRACE_STAGES,
} from '../../observability/productRequestTrace.js';

export class ProductRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProductRequestError';
    this.code = 'INVALID_PRODUCT_REQUEST';
    this.statusCode = 400;
  }
}

export const normalizeProductBrand = (value) => {
  if (typeof value !== 'string') {
    throw new ProductRequestError('La marca de Maestro Producto debe ser texto.');
  }
  const brand = value.trim();
  if (!brand) throw new ProductRequestError('La marca de Maestro Producto es requerida.');
  if (brand.length > 100) {
    throw new ProductRequestError('La marca de Maestro Producto es demasiado larga.');
  }
  return brand;
};

export const createProductService = ({ productGateway } = {}) => {
  if (!productGateway || typeof productGateway.loadBrands !== 'function'
    || typeof productGateway.loadProducts !== 'function') {
    throw new Error('ProductService: Product Gateway inválido.');
  }
  return Object.freeze({
    listBrands({ productTrace } = {}) {
      productTrace?.checkpoint({
        component: PRODUCT_TRACE_COMPONENTS.SERVICE,
        stage: PRODUCT_TRACE_STAGES.SERVICE_STARTED,
        result: PRODUCT_TRACE_RESULTS.REACHED,
      });
      return productGateway.loadBrands({ productTrace });
    },

    loadMaster({ brand, productTrace } = {}) {
      const normalizedBrand = normalizeProductBrand(brand);
      productTrace?.checkpoint({
        component: PRODUCT_TRACE_COMPONENTS.SERVICE,
        stage: PRODUCT_TRACE_STAGES.SERVICE_STARTED,
        result: PRODUCT_TRACE_RESULTS.REACHED,
      });
      return productGateway.loadProducts({ brand: normalizedBrand, productTrace });
    },
  });
};
