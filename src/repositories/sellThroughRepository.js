// =============================================================================
// Propósito: ser el único punto autorizado de acceso a datos de sell-through.
// Responsabilidad: exponer contratos estables y ocultar el origen de los datos.
// Contratos: getMaestro, getInventario, getParametros, getConfiguracion,
// getCatalogos y getDatosEjemplo; no transforman reglas ni resultados.
// Dependencias: un Provider inyectable; por defecto, LocalDataProvider.
// Nulabilidad: getConfiguracion puede devolver null en Repositories parciales.
// Fuente actual: Provider local sobre estado de sesión y datos.json.
// Dataverse: DataverseProvider podrá inyectarse conservando este Repository,
// Application Service, Domain y sus contratos públicos.
// AI-First: mantiene una frontera explícita, pequeña y verificable por IA.
// Configuration Center: consume la validación central sin duplicar claves, IDs ni
// defaults y conserva las seis delegaciones públicas del Repository.
// =============================================================================

import { createLocalDataProvider } from '../providers/local/localDataProvider.js';
import { configurationService } from '../configuration/configurationService.js';

const REQUIRED_PROVIDER_METHODS = [
  'readMaestro',
  'readInventario',
  'readParametros',
  'readConfiguracion',
  'readCatalogos',
  'readDatosEjemplo',
];

// Impide construir una frontera cuya implementación no cumpla el contrato mínimo.
const validateProviderContract = (provider) => {
  if (!provider || typeof provider !== 'object' || Array.isArray(provider)) {
    throw new Error('SellThroughRepository: el Provider debe ser un objeto válido.');
  }

  REQUIRED_PROVIDER_METHODS.forEach((methodName) => {
    if (typeof provider[methodName] !== 'function') {
      throw new Error(
        `SellThroughRepository: falta el método requerido "${methodName}" en el Provider.`,
      );
    }
  });
};

// CONFIGURATION_SCHEMA es la única enumeración autorizada. El Service valida su
// integridad una vez y Repository consume exclusivamente ese resultado.
configurationService.validateConfiguration();

// Compone el Repository con la fuente local vigente o con un Provider compatible.
export const createSellThroughRepository = ({
  provider,
  rawMaestro = '',
  rawInventario = '',
  config = null,
} = {}) => {
  const dataProvider = provider === undefined
    ? createLocalDataProvider({ rawMaestro, rawInventario, config })
    : provider;

  validateProviderContract(dataProvider);

  return {
    getMaestro() {
      return dataProvider.readMaestro();
    },

    getInventario() {
      return dataProvider.readInventario();
    },

    getParametros() {
      return dataProvider.readParametros();
    },

    getConfiguracion() {
      return dataProvider.readConfiguracion();
    },

    getCatalogos() {
      return dataProvider.readCatalogos();
    },

    getDatosEjemplo() {
      return dataProvider.readDatosEjemplo();
    },
  };
};
