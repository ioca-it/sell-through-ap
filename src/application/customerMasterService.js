// Caso de uso de Maestro Cliente: coordina búsquedas y traduce una única
// selección normalizada al contrato histórico de configuración de App.

import { normalizeCustomer } from '../domain/customer/customer.js';

const DEFAULT_SEARCH_ERROR_MESSAGE = 'No fue posible consultar clientes. Intenta nuevamente.';

const SEARCH_ERROR_MESSAGES = Object.freeze({
  CUSTOMER_SESSION_REQUIRED: 'Inicia sesión para consultar el Maestro Cliente.',
  CUSTOMER_AUTHENTICATION_REQUIRED: 'Tu sesión no es válida. Inicia sesión nuevamente.',
  CUSTOMER_AUTHENTICATION_UNAVAILABLE: 'No fue posible validar tu sesión. Intenta nuevamente.',
  CUSTOMER_AUTHORIZATION_DENIED: 'Tu cuenta no tiene permisos para consultar el Maestro Cliente.',
  CUSTOMER_RATE_LIMITED: 'Hay demasiadas consultas. Espera un momento e intenta nuevamente.',
  CUSTOMER_SERVICE_UNAVAILABLE: 'El Maestro Cliente no está disponible temporalmente. Intenta nuevamente.',
  CUSTOMER_NETWORK_ERROR: 'No fue posible conectar con el Maestro Cliente. Revisa tu conexión e intenta nuevamente.',
  CUSTOMER_REQUEST_TIMEOUT: 'La consulta tardó demasiado. Intenta nuevamente.',
  CUSTOMER_INVALID_RESPONSE: DEFAULT_SEARCH_ERROR_MESSAGE,
});

export const getCustomerSearchErrorMessage = (error) => (
  SEARCH_ERROR_MESSAGES[error?.code] ?? DEFAULT_SEARCH_ERROR_MESSAGE
);

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
