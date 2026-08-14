import { quoteODataString } from './odata.js';
import { createTemporaryAccountCustomerMetadataDiagnostic } from './accountCustomerMetadataDiagnostic.js';
import { createTemporaryAccountCustomerQueryDiagnostic } from './accountCustomerQueryDiagnostic.js';
import { isInvalidFieldOrFilterError } from './dataverseClient.js';

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
  Object.freeze({ field: 'customertype', value: 3 }),
  Object.freeze({ field: 'statecode', value: 0 }),
  Object.freeze({ field: 'crbbe_estadocliente', value: 4 }),
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

export const createAccountCustomerGateway = ({
  dataverseClient,
  diagnosticLogger,
} = {}) => {
  if (!dataverseClient || typeof dataverseClient.retrieveMultiple !== 'function') {
    throw new Error('AccountCustomerGateway: Dataverse Client inválido.');
  }
  if (diagnosticLogger !== undefined && typeof diagnosticLogger !== 'function') {
    throw new Error('AccountCustomerGateway: Diagnostic Logger inválido.');
  }

  const select = Object.freeze(Object.values(ACCOUNT_SOURCE.fields));
  const queryDiagnostic = typeof dataverseClient.probeRetrieveMultiple === 'function'
    ? createTemporaryAccountCustomerQueryDiagnostic({
      dataverseClient,
      diagnosticLogger,
    })
    : null;
  const metadataDiagnostic = typeof dataverseClient.retrieveEntityAttributeMetadata === 'function'
    && typeof dataverseClient.retrieveRequiredOptionMetadata === 'function'
    ? createTemporaryAccountCustomerMetadataDiagnostic({
      dataverseClient,
      diagnosticLogger,
    })
    : null;

  const retrieveCustomerRows = async (query, diagnosticShape) => {
    try {
      return await dataverseClient.retrieveMultiple(query);
    } catch (error) {
      if (queryDiagnostic && isInvalidFieldOrFilterError(error)) {
        try {
          await queryDiagnostic.run({
            entitySet: ACCOUNT_SOURCE.entitySet,
            selectFields: select,
            eligibility: ACCOUNT_CUSTOMER_ELIGIBILITY,
            ...diagnosticShape,
          });
        } catch {
          // The temporary diagnosis must never replace the original public failure.
        }
      }
      if (metadataDiagnostic && isInvalidFieldOrFilterError(error)) {
        try {
          await metadataDiagnostic.run();
        } catch {
          // The temporary metadata lookup must never replace the public failure.
        }
      }
      throw error;
    }
  };

  const search = async (normalizedField, query) => {
    const sourceField = ACCOUNT_SOURCE.fields[normalizedField];
    const rows = await retrieveCustomerRows(
      {
        entitySet: ACCOUNT_SOURCE.entitySet,
        select,
        filter: withCustomerEligibility(
          `contains(${sourceField},${quoteODataString(query)})`,
        ),
        orderBy: `${sourceField} asc`,
        top: CUSTOMER_SEARCH_LIMIT,
      },
      {
        operation: normalizedField === 'customerCode'
          ? 'search_by_code'
          : 'search_by_name',
        predicateType: 'contains',
        predicateField: sourceField,
        orderByField: sourceField,
        top: CUSTOMER_SEARCH_LIMIT,
      },
    );
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
      const rows = await retrieveCustomerRows(
        {
          entitySet: ACCOUNT_SOURCE.entitySet,
          select,
          filter: withCustomerEligibility(
            `${ACCOUNT_SOURCE.fields.customerCode} eq ${quoteODataString(customerCode)}`,
          ),
          orderBy: `${ACCOUNT_SOURCE.fields.customerName} asc`,
          top: 1,
        },
        {
          operation: 'get_by_code',
          predicateType: 'equals',
          predicateField: ACCOUNT_SOURCE.fields.customerCode,
          orderByField: ACCOUNT_SOURCE.fields.customerName,
          top: 1,
        },
      );
      return rows.length === 0 ? null : mapAccountToCustomer(rows[0]);
    },
  });
};
