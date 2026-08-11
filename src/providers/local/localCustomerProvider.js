// Provider temporal e inyectable para probar Maestro Cliente sin Dataverse real.

import { normalizeCustomer } from '../../domain/customer/customer.js';
import { LOCAL_CUSTOMER_FIXTURES } from './customerFixtures.js';

const normalizeQuery = (query) => (
  query === null || query === undefined ? '' : String(query).trim().toLocaleLowerCase()
);

export const createLocalCustomerProvider = ({ customers = LOCAL_CUSTOMER_FIXTURES } = {}) => {
  if (!Array.isArray(customers)) {
    throw new Error('LocalCustomerProvider: "customers" debe ser un arreglo.');
  }

  const normalizedCustomers = customers.map(normalizeCustomer);

  const search = (field, query) => {
    const normalizedQuery = normalizeQuery(query);
    if (!normalizedQuery) return Promise.resolve([]);

    return Promise.resolve(normalizedCustomers.filter((customer) => (
      customer[field].toLocaleLowerCase().includes(normalizedQuery)
    )));
  };

  return Object.freeze({
    searchCustomersByCode(query) {
      return search('customerCode', query);
    },

    searchCustomersByName(query) {
      return search('customerName', query);
    },
  });
};
