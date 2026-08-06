import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { configurationService } from '../configurationService.js';

const STORAGE_KEY = 'sell-through-ap.configuration';

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};

describe('configurationService MVP', () => {
  beforeEach(() => {
    globalThis.localStorage = createStorage();
    configurationService.resetAll();
  });

  afterEach(() => {
    delete globalThis.localStorage;
  });

  it('expone el schema registrado como fuente única', () => {
    expect(configurationService.getSchema()).toHaveLength(3);
    expect(configurationService.getSchema().map((parameter) => parameter.id)).toEqual(['PAR-001', 'PAR-002', 'PAR-003']);
  });

  it('impide editar y persistir parámetros no editables', () => {
    expect(() => configurationService.setValue('app.version', 'V2')).toThrow('no es editable');
    expect(configurationService.getValue('app.version')).toBe('V1');
  });

  it('descarta valores persistidos no autorizados aunque tengan tipo válido', () => {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify({ 'app.version': 'V2' }));
    configurationService.loadPersistedValues();
    expect(configurationService.getValue('app.version')).toBe('V1');
  });

  it('rechaza tipos inválidos antes de persistir', () => {
    expect(() => configurationService.setValue('app.version', 2)).toThrow('no es editable');
    expect(globalThis.localStorage.getItem(STORAGE_KEY)).toBe('{}');
  });

  it('restaura un valor al default y elimina su override', () => {
    expect(configurationService.resetValue('app.name')).toBe('IOCA Sell-Through Intelligence V1');
    expect(configurationService.getValue('app.name')).toBe('IOCA Sell-Through Intelligence V1');
  });

  it('restaura todos los parámetros', () => {
    expect(configurationService.resetAll()).toEqual({
      'app.version': 'V1',
      'app.name': 'IOCA Sell-Through Intelligence V1',
      'dataset.version': '1.0.0',
    });
  });

  it('usa defaults cuando el almacenamiento está corrupto', () => {
    globalThis.localStorage.setItem(STORAGE_KEY, '{no-json');
    configurationService.loadPersistedValues();
    expect(configurationService.getConfiguration()).toEqual({
      'app.version': 'V1',
      'app.name': 'IOCA Sell-Through Intelligence V1',
      'dataset.version': '1.0.0',
    });
    expect(globalThis.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
