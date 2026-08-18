import {
  PRODUCT_TRACE_COMPONENTS,
  PRODUCT_TRACE_RESULTS,
  PRODUCT_TRACE_STAGES,
} from '../../observability/productRequestTrace.js';

export const createProductService = ({ productGateway } = {}) => {
  if (!productGateway || typeof productGateway.loadProducts !== 'function') {
    throw new Error('ProductService: Product Gateway inválido.');
  }
  return Object.freeze({
    loadMaster({ productTrace } = {}) {
      productTrace?.checkpoint({
        component: PRODUCT_TRACE_COMPONENTS.SERVICE,
        stage: PRODUCT_TRACE_STAGES.SERVICE_STARTED,
        result: PRODUCT_TRACE_RESULTS.REACHED,
      });
      return productGateway.loadProducts({ productTrace });
    },
  });
};
