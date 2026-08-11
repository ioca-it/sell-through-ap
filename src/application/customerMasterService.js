// Caso de uso de Maestro Cliente: coordina búsquedas y traduce una única
// selección normalizada al contrato histórico de configuración de App.

import { normalizeCustomer } from '../domain/customer/customer.js';

const validateRepository = (repository) => {
  if (!repository || typeof repository.searchByCode !== 'function'
    || typeof repository.searchByName !== 'function') {
    throw new Error('CustomerMasterService: Repository inválido.');
  }
};

export const applyCustomerSelection = (config, customer) => {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('CustomerMasterService: la configuración debe ser un objeto válido.');
  }

  const selectedCustomer = normalizeCustomer(customer);
  return {
    ...config,
    codigoCliente: selectedCustomer.customerCode,
    nombreCliente: selectedCustomer.customerName,
    pais: selectedCustomer.country,
    customerType: selectedCustomer.customerType,
  };
};

export const createCustomerMasterService = ({ repository } = {}) => {
  validateRepository(repository);

  return Object.freeze({
    searchByCode(query) {
      return repository.searchByCode(query);
    },

    searchByName(query) {
      return repository.searchByName(query);
    },

    selectCustomer(config, customer) {
      return applyCustomerSelection(config, customer);
    },
  });
};
