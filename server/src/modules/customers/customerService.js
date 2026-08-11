export class CustomerRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CustomerRequestError';
    this.code = 'INVALID_CUSTOMER_REQUEST';
    this.statusCode = 400;
  }
}

const normalizeQuery = (value) => {
  const query = value === null || value === undefined ? '' : String(value).trim();
  if (!query) throw new CustomerRequestError('La búsqueda de cliente es requerida.');
  if (query.length > 100) throw new CustomerRequestError('La búsqueda de cliente es demasiado larga.');
  return query;
};

export const createCustomerService = ({ customerGateway } = {}) => {
  if (!customerGateway || typeof customerGateway.searchByCode !== 'function'
    || typeof customerGateway.searchByName !== 'function'
    || typeof customerGateway.getByCode !== 'function') {
    throw new Error('CustomerService: Customer Gateway inválido.');
  }

  return Object.freeze({
    search(type, query) {
      if (!['code', 'name'].includes(type)) {
        throw new CustomerRequestError('El tipo de búsqueda debe ser "code" o "name".');
      }
      const normalizedQuery = normalizeQuery(query);
      return type === 'code'
        ? customerGateway.searchByCode(normalizedQuery)
        : customerGateway.searchByName(normalizedQuery);
    },

    getByCode(customerCode) {
      return customerGateway.getByCode(normalizeQuery(customerCode));
    },
  });
};
