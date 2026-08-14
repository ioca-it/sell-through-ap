import { quoteODataString } from './odata.js';

const ACCOUNT_SOURCE = Object.freeze({
  entitySet: 'accounts',
  fields: Object.freeze({
    customerCode: 'new_codigocliente',
    customerName: 'name',
    country: 'crbbe_nombrepais',
    customerType: 'new_tipocliente',
  }),
});

export const CUSTOMER_SEARCH_LIMIT = 20;

const ACCOUNT_CUSTOMER_ELIGIBILITY = Object.freeze([
  // Dataverse LogicalNames are metadata-confirmed;
  // 3/0/4 are Customer Master business rules.
  Object.freeze({ field: 'customertypecode', value: 3 }),
  Object.freeze({ field: 'statecode', value: 0 }),
  Object.freeze({ field: 'crbbe_estadodelcliente', value: 4 }),
]);

const ACCOUNT_CUSTOMER_BASE_FILTER = ACCOUNT_CUSTOMER_ELIGIBILITY
  .map(({ field, value }) => `${field} eq ${value}`)
  .join(' and ');

const withCustomerEligibility = (filter) => (
  `${filter} and ${ACCOUNT_CUSTOMER_BASE_FILTER}`
);

export const mapAccountToCustomer = (account = {}) => Object.freeze({
  customerCode: account[ACCOUNT_SOURCE.fields.customerCode] == null
    ? ''
    : String(account[ACCOUNT_SOURCE.fields.customerCode]).trim(),
  customerName: account[ACCOUNT_SOURCE.fields.customerName] == null
    ? ''
    : String(account[ACCOUNT_SOURCE.fields.customerName]).trim(),
  country: account[ACCOUNT_SOURCE.fields.country] == null
    ? ''
    : String(account[ACCOUNT_SOURCE.fields.country]).trim(),
  customerType: account[ACCOUNT_SOURCE.fields.customerType] == null
    ? ''
    : String(account[ACCOUNT_SOURCE.fields.customerType]).trim(),
});

export const createAccountCustomerGateway = ({ dataverseClient } = {}) => {
  if (!dataverseClient || typeof dataverseClient.retrieveMultiple !== 'function') {
    throw new Error('AccountCustomerGateway: Dataverse Client inválido.');
  }

  const select = Object.freeze(Object.values(ACCOUNT_SOURCE.fields));

  const search = async (normalizedField, query) => {
    const sourceField = ACCOUNT_SOURCE.fields[normalizedField];
    const rows = await dataverseClient.retrieveMultiple({
      entitySet: ACCOUNT_SOURCE.entitySet,
      select,
      filter: withCustomerEligibility(
        `contains(${sourceField},${quoteODataString(query)})`,
      ),
      orderBy: `${sourceField} asc`,
      top: CUSTOMER_SEARCH_LIMIT,
    });
    return rows.slice(0, CUSTOMER_SEARCH_LIMIT).map(mapAccountToCustomer);
  };

  return Object.freeze({
    searchByCode(query) {
      return search('customerCode', query);
    },

    searchByName(query) {
      return search('customerName', query);
    },

    async getByCode(customerCode) {
      const rows = await dataverseClient.retrieveMultiple({
        entitySet: ACCOUNT_SOURCE.entitySet,
        select,
        filter: withCustomerEligibility(
          `${ACCOUNT_SOURCE.fields.customerCode} eq ${quoteODataString(customerCode)}`,
        ),
        orderBy: `${ACCOUNT_SOURCE.fields.customerName} asc`,
        top: 1,
      });
      return rows.length === 0 ? null : mapAccountToCustomer(rows[0]);
    },
  });
};
