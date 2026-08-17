// Provider local de Maestro Producto. Reutiliza Master Parser y únicamente
// adapta su salida al contrato Product normalizado.

import { parseMaster } from '../../domain/parser/masterParser.js';
import { masterRecordToProduct } from '../../domain/product/product.js';

export class LocalProductMasterError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LocalProductMasterError';
    this.code = 'INVALID_LOCAL_PRODUCT_MASTER';
  }
}

export const createLocalProductProvider = ({ rawMaster = '' } = {}) => {
  if (typeof rawMaster !== 'string') {
    throw new Error('LocalProductProvider: "rawMaster" debe ser string.');
  }

  return Object.freeze({
    async loadProducts() {
      if (!rawMaster.trim()) return [];
      const { masterBySku, error } = parseMaster(rawMaster);
      if (error) throw new LocalProductMasterError(error);
      return Object.values(masterBySku).map(masterRecordToProduct);
    },
  });
};
