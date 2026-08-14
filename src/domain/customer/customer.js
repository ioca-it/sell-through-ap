// Contrato normalizado compartido por Maestro Cliente.
// Los nombres físicos de Dataverse se resuelven exclusivamente en su Provider.

const normalizeText = (value) => (
  value === null || value === undefined ? '' : String(value).trim()
);

export const normalizeCustomer = (customer = {}) => Object.freeze({
  customerCode: normalizeText(customer.customerCode),
  customerName: normalizeText(customer.customerName),
  country: normalizeText(customer.country),
  // El mapping físico aún no existe; la ausencia se conserva como fallback vacío.
  customerType: normalizeText(customer.customerType),
});

export const isCustomer = (customer) => (
  customer !== null
  && typeof customer === 'object'
  && !Array.isArray(customer)
  && typeof customer.customerCode === 'string'
  && typeof customer.customerName === 'string'
  && typeof customer.country === 'string'
  && typeof customer.customerType === 'string'
);
