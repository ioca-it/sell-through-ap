import { createDataverseCustomerProvider } from './dataverse/dataverseCustomerProvider.js';
import { createLocalCustomerProvider } from './local/localCustomerProvider.js';

export const CUSTOMER_SOURCES = Object.freeze({
  LOCAL: 'local',
  DATAVERSE: 'dataverse',
});

// Local conserva el arranque de desarrollo sin exigir API, token ni Dataverse real.
const DEFAULT_CUSTOMER_SOURCE = CUSTOMER_SOURCES.LOCAL;

const configuredCustomerSource = () => import.meta.env.VITE_CUSTOMER_SOURCE;

export const normalizeCustomerSource = (source) => {
  const normalizedSource = source === null || source === undefined
    ? ''
    : String(source).trim().toLocaleLowerCase();
  const resolvedSource = normalizedSource || DEFAULT_CUSTOMER_SOURCE;

  if (!Object.values(CUSTOMER_SOURCES).includes(resolvedSource)) {
    throw new Error(
      'CustomerProviderFactory: "VITE_CUSTOMER_SOURCE" debe ser "local" o "dataverse".',
    );
  }

  return resolvedSource;
};

export const createCustomerProvider = ({
  source = configuredCustomerSource(),
  localCustomers,
  apiBaseUrl,
  fetchImpl,
  getAccessToken,
} = {}) => {
  const resolvedSource = normalizeCustomerSource(source);

  if (resolvedSource === CUSTOMER_SOURCES.LOCAL) {
    return createLocalCustomerProvider({ customers: localCustomers });
  }

  return createDataverseCustomerProvider({
    apiBaseUrl,
    fetchImpl,
    getAccessToken,
  });
};
