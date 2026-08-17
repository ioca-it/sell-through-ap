import { createDataverseProductProvider } from './dataverse/dataverseProductProvider.js';
import { createLocalProductProvider } from './local/localProductProvider.js';

export const PRODUCT_SOURCES = Object.freeze({
  LOCAL: 'local',
  DATAVERSE: 'dataverse',
});

const DEFAULT_PRODUCT_SOURCE = PRODUCT_SOURCES.LOCAL;
const configuredProductSource = () => import.meta.env.VITE_PRODUCT_SOURCE;

export const normalizeProductSource = (source) => {
  const normalizedSource = source === null || source === undefined
    ? ''
    : String(source).trim().toLocaleLowerCase();
  const resolvedSource = normalizedSource || DEFAULT_PRODUCT_SOURCE;

  if (!Object.values(PRODUCT_SOURCES).includes(resolvedSource)) {
    throw new Error(
      'ProductProviderFactory: "VITE_PRODUCT_SOURCE" debe ser "local" o "dataverse".',
    );
  }
  return resolvedSource;
};

export const createProductProvider = ({
  source = configuredProductSource(),
  rawMaster,
  apiBaseUrl,
  fetchImpl,
  getAccessToken,
} = {}) => {
  const resolvedSource = normalizeProductSource(source);
  if (resolvedSource === PRODUCT_SOURCES.LOCAL) {
    return createLocalProductProvider({ rawMaster });
  }
  return createDataverseProductProvider({
    apiBaseUrl,
    fetchImpl,
    getAccessToken,
  });
};
