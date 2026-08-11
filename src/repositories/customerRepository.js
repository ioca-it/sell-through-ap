// Frontera estable de Maestro Cliente. Solo expone el contrato normalizado y
// oculta si la fuente efectiva es Dataverse o un provider local temporal.

import { isCustomer, normalizeCustomer } from '../domain/customer/customer.js';

const REQUIRED_PROVIDER_METHODS = Object.freeze([
  'searchCustomersByCode',
  'searchCustomersByName',
]);

const validateProvider = (provider) => {
  if (!provider || typeof provider !== 'object' || Array.isArray(provider)) {
    throw new Error('CustomerRepository: el Provider debe ser un objeto válido.');
  }
  REQUIRED_PROVIDER_METHODS.forEach((methodName) => {
    if (typeof provider[methodName] !== 'function') {
      throw new Error(
        `CustomerRepository: falta el método requerido "${methodName}" en el Provider.`,
      );
    }
  });
};

const normalizeResults = (results) => {
  if (!Array.isArray(results)) {
    throw new Error('CustomerRepository: la búsqueda debe devolver un arreglo.');
  }

  return results.map((customer) => {
    if (!isCustomer(customer)) {
      throw new Error(
        'CustomerRepository: el Provider devolvió un Customer sin normalizar.',
      );
    }
    return normalizeCustomer(customer);
  });
};

export const createCustomerRepository = ({ provider } = {}) => {
  validateProvider(provider);

  return Object.freeze({
    async searchByCode(query) {
      return normalizeResults(await provider.searchCustomersByCode(query));
    },

    async searchByName(query) {
      return normalizeResults(await provider.searchCustomersByName(query));
    },
  });
};
