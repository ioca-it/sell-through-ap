import { describe, expect, it } from 'vitest';
import { validateConfigurationSchema } from '../configurationSchema.js';

const createDefinition = (overrides = {}) => ({
  id: 'PAR-TEST-001',
  key: 'test.parameter.one',
  categoria: 'General',
  tipo: 'string',
  valorPorDefecto: 'test-value',
  editable: false,
  origen: 'Prueba unitaria',
  descripcion: 'Definición aislada para validar el contrato del schema.',
  ...overrides,
});

describe('validateConfigurationSchema', () => {
  it('rechaza IDs duplicados', () => {
    const schema = [
      createDefinition(),
      createDefinition({ key: 'test.parameter.two' }),
    ];

    expect(() => validateConfigurationSchema(schema))
      .toThrow('ConfigurationSchema: id duplicado "PAR-TEST-001".');
  });

  it('rechaza keys duplicadas', () => {
    const schema = [
      createDefinition(),
      createDefinition({ id: 'PAR-TEST-002' }),
    ];

    expect(() => validateConfigurationSchema(schema))
      .toThrow('ConfigurationSchema: key duplicada "test.parameter.one".');
  });

  it('rechaza un schema inconsistente', () => {
    const schema = [createDefinition({ valorPorDefecto: 123 })];

    expect(() => validateConfigurationSchema(schema))
      .toThrow(
        'ConfigurationSchema: el valor por defecto de "PAR-TEST-001" no coincide con el tipo "string".',
      );
  });
});
