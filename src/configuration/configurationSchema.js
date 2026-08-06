// =============================================================================
// Propósito: describir el esquema mínimo del Configuration Center Foundation.
// Responsabilidad: registrar metadatos solo para PAR-001, PAR-002 y PAR-003.
// Catálogo: cada definición conserva id, clave y significado de BUSINESS_PARAMETERS.md.
// Dataverse: origen remoto, entidad y campo permanecen pendientes de aprobación.
// AI-First: el esquema explícito permite validar migraciones futuras de forma incremental.
// =============================================================================

import { CONFIGURATION_DEFAULTS } from './configurationDefaults.js';

const defineParameter = (definition) => Object.freeze(definition);

const REQUIRED_SCHEMA_FIELDS = Object.freeze([
  'id',
  'key',
  'categoria',
  'tipo',
  'valorPorDefecto',
  'editable',
  'origen',
  'descripcion',
]);

const TYPE_VALIDATORS = Object.freeze({
  string: (value) => typeof value === 'string',
  number: (value) => typeof value === 'number' && Number.isFinite(value),
  boolean: (value) => typeof value === 'boolean',
});

const isNonEmptyString = (value) => typeof value === 'string' && value.trim() !== '';

/**
 * Confirma que el catálogo sea consistente antes de que cualquier consumidor lo use.
 * Esta validación mantiene a CONFIGURATION_SCHEMA como única fuente de IDs, claves y
 * metadatos, y deja preparado el contrato para una futura carga desde Dataverse.
 */
export const validateConfigurationSchema = (schema) => {
  if (!Array.isArray(schema) || schema.length === 0) {
    throw new Error('ConfigurationSchema: el schema debe ser un arreglo no vacío.');
  }

  const registeredIds = new Set();
  const registeredKeys = new Set();

  schema.forEach((parameter, index) => {
    if (parameter === null || typeof parameter !== 'object' || Array.isArray(parameter)) {
      throw new Error(
        `ConfigurationSchema: la definición en posición ${index} debe ser un objeto.`,
      );
    }

    REQUIRED_SCHEMA_FIELDS.forEach((field) => {
      if (!Object.prototype.hasOwnProperty.call(parameter, field)) {
        throw new Error(
          `ConfigurationSchema: la definición en posición ${index} no contiene "${field}".`,
        );
      }
    });

    ['id', 'key', 'categoria', 'tipo', 'origen', 'descripcion'].forEach((field) => {
      if (!isNonEmptyString(parameter[field])) {
        throw new Error(
          `ConfigurationSchema: "${field}" debe ser un texto no vacío en la posición ${index}.`,
        );
      }
    });

    if (registeredIds.has(parameter.id)) {
      throw new Error(`ConfigurationSchema: id duplicado "${parameter.id}".`);
    }
    registeredIds.add(parameter.id);

    if (registeredKeys.has(parameter.key)) {
      throw new Error(`ConfigurationSchema: key duplicada "${parameter.key}".`);
    }
    registeredKeys.add(parameter.key);

    if (typeof parameter.editable !== 'boolean') {
      throw new Error(
        `ConfigurationSchema: "editable" debe ser booleano para "${parameter.id}".`,
      );
    }

    const validateType = TYPE_VALIDATORS[parameter.tipo];
    if (!validateType) {
      throw new Error(
        `ConfigurationSchema: tipo no soportado "${parameter.tipo}" para "${parameter.id}".`,
      );
    }

    if (!validateType(parameter.valorPorDefecto)) {
      throw new Error(
        `ConfigurationSchema: el valor por defecto de "${parameter.id}" no coincide con el tipo "${parameter.tipo}".`,
      );
    }
  });

  return schema;
};

export const CONFIGURATION_SCHEMA = Object.freeze([
  defineParameter({
    id: 'PAR-001',
    nombre: 'Versión visible de aplicación',
    key: 'app.version',
    categoria: 'General',
    tipo: 'string',
    valorPorDefecto: CONFIGURATION_DEFAULTS['app.version'],
    editable: false,
    origen: 'Código local',
    descripcion: 'Identificador de versión visible de la aplicación y sus exportaciones.',
  }),
  defineParameter({
    id: 'PAR-002',
    nombre: 'Nombre visible de aplicación',
    key: 'app.name',
    categoria: 'General',
    tipo: 'string',
    valorPorDefecto: CONFIGURATION_DEFAULTS['app.name'],
    editable: false,
    origen: 'Código local',
    descripcion: 'Nombre institucional visible de la aplicación.',
  }),
  defineParameter({
    id: 'PAR-003',
    nombre: 'Versión del dataset local',
    key: 'dataset.version',
    categoria: 'General',
    tipo: 'string',
    valorPorDefecto: CONFIGURATION_DEFAULTS['dataset.version'],
    editable: false,
    origen: 'JSON local',
    descripcion: 'Versión declarada del dataset institucional local.',
  }),
]);
