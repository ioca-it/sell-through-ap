// =============================================================================
// Propósito: ofrecer el contrato síncrono del Configuration Center MVP.
// Responsabilidad: exponer schema, valores efectivos, validación y persistencia local.
// Catálogo: opera únicamente con PAR-001, PAR-002 y PAR-003 de BUSINESS_PARAMETERS.md.
// Dataverse: la persistencia local es un adaptador temporal reemplazable por Repository.
// AI-First: concentra reglas de configuración en un módulo determinista, independiente de React.
// =============================================================================

import {
  CONFIGURATION_SCHEMA,
  validateConfigurationSchema,
} from './configurationSchema.js';

const PERSISTENCE_KEY = 'sell-through-ap.configuration';
const VALIDATED_CONFIGURATION_SCHEMA = validateConfigurationSchema(CONFIGURATION_SCHEMA);

const schemaByKey = new Map(
  VALIDATED_CONFIGURATION_SCHEMA.map((parameter) => [parameter.key, parameter]),
);

const configurationKeys = Object.freeze(
  VALIDATED_CONFIGURATION_SCHEMA.map((parameter) => parameter.key),
);

const typeValidators = Object.freeze({
  string: (value) => typeof value === 'string',
  number: (value) => typeof value === 'number' && Number.isFinite(value),
  boolean: (value) => typeof value === 'boolean',
});

let persistedValues = Object.create(null);

const canUseStorage = () => typeof globalThis.localStorage !== 'undefined';

const isValidValue = (parameter, value) => (
  parameter && typeValidators[parameter.tipo]?.(value) === true
);

const persistValues = () => {
  if (canUseStorage()) {
    globalThis.localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(persistedValues));
  }
};

const assertKnownKey = (key) => {
  if (typeof key !== 'string' || !schemaByKey.has(key)) {
    throw new Error(`ConfigurationService: clave no registrada "${String(key)}".`);
  }
};

const getSchema = () => VALIDATED_CONFIGURATION_SCHEMA;

const getConfiguration = () => Object.freeze(Object.fromEntries(
  VALIDATED_CONFIGURATION_SCHEMA.map((parameter) => [
    parameter.key,
    Object.prototype.hasOwnProperty.call(persistedValues, parameter.key)
      ? persistedValues[parameter.key]
      : parameter.valorPorDefecto,
  ]),
));

const hasKey = (key) => typeof key === 'string' && schemaByKey.has(key);

const getDefaultValue = (key) => {
  assertKnownKey(key);
  return schemaByKey.get(key).valorPorDefecto;
};

const getValue = (key) => {
  assertKnownKey(key);
  return getConfiguration()[key];
};

const loadPersistedValues = () => {
  persistedValues = Object.create(null);
  if (!canUseStorage()) return getConfiguration();

  try {
    const raw = globalThis.localStorage.getItem(PERSISTENCE_KEY);
    const candidate = raw ? JSON.parse(raw) : {};
    if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new Error('Formato inválido');
    }
    VALIDATED_CONFIGURATION_SCHEMA.forEach((parameter) => {
      if (parameter.editable && Object.prototype.hasOwnProperty.call(candidate, parameter.key)
        && isValidValue(parameter, candidate[parameter.key])) {
        persistedValues[parameter.key] = candidate[parameter.key];
      }
    });
    persistValues();
  } catch {
    persistedValues = Object.create(null);
    globalThis.localStorage.removeItem(PERSISTENCE_KEY);
  }
  return getConfiguration();
};

const setValue = (key, value) => {
  assertKnownKey(key);
  const parameter = schemaByKey.get(key);
  if (!parameter.editable) {
    throw new Error(`ConfigurationService: el parámetro "${key}" no es editable.`);
  }
  if (!isValidValue(parameter, value)) {
    throw new Error(`ConfigurationService: el valor de "${key}" no coincide con el tipo "${parameter.tipo}".`);
  }
  persistedValues[key] = value;
  persistValues();
  return value;
};

const resetValue = (key) => {
  assertKnownKey(key);
  delete persistedValues[key];
  persistValues();
  return getDefaultValue(key);
};

const resetAll = () => {
  persistedValues = Object.create(null);
  persistValues();
  return getConfiguration();
};

const validateConfigurationIntegrity = () => {
  const configuration = getConfiguration();

  configurationKeys.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(configuration, key)) {
      throw new Error(
        `ConfigurationService: falta la configuración requerida "${key}".`,
      );
    }
    getValue(key);
  });

  return true;
};

// La integridad se confirma una sola vez al cargar el módulo. Repository consume
// este resultado sin repetir IDs, keys ni defaults y sin acoplarse a Dataverse.
const configurationIsValid = validateConfigurationIntegrity();

const validateConfiguration = () => configurationIsValid;

export const configurationService = Object.freeze({
  getSchema,
  getConfiguration,
  getValue,
  setValue,
  resetValue,
  resetAll,
  loadPersistedValues,
  hasKey,
  getDefaultValue,
  validateConfiguration,
});
