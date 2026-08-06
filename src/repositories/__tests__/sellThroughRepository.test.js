// Caracteriza la frontera Repository y el requisito de configuración del caso de uso.
import { describe, expect, it, vi } from 'vitest';
import { createSellThroughRepository } from '../sellThroughRepository.js';
import { processSellThrough } from '../../application/sellThroughApplicationService.js';

const PROVIDER_METHODS = [
  'readMaestro',
  'readInventario',
  'readParametros',
  'readConfiguracion',
  'readCatalogos',
  'readDatosEjemplo',
];

const providerValues = {
  maestro: 'SKU\nTEST-1',
  inventario: 'SKU\tINV FINAL\nTEST-1\t2',
  parametros: {
    bucketEOL: [],
    tablaFases: [],
    umbralMermaPct: 0.1,
    semanasPorPeriodo: { Mensual: 4.33 },
  },
  configuracion: {
    periodoAnalizado: 'Mensual',
    semanasPersonalizadas: 4,
    safetyStockSemanas: 4,
    leadTimeUSA: 4,
    leadTimeCHINA: 12,
  },
  catalogos: {
    paisesIOCA: ['Guatemala'],
    periodosAnalisis: ['Mensual'],
    notaInvSeguridadIOCA: { titulo: 'Motor' },
  },
  datosEjemplo: {
    maestro: 'SKU\nEJEMPLO-1',
    inventario: 'SKU\tINV FINAL\nEJEMPLO-1\t1',
  },
};

const createProvider = (overrides = {}) => ({
  readMaestro: vi.fn(() => providerValues.maestro),
  readInventario: vi.fn(() => providerValues.inventario),
  readParametros: vi.fn(() => providerValues.parametros),
  readConfiguracion: vi.fn(() => providerValues.configuracion),
  readCatalogos: vi.fn(() => providerValues.catalogos),
  readDatosEjemplo: vi.fn(() => providerValues.datosEjemplo),
  ...overrides,
});

describe('sellThroughRepository', () => {
  it.each([
    ['getMaestro', 'readMaestro', 'maestro'],
    ['getInventario', 'readInventario', 'inventario'],
    ['getParametros', 'readParametros', 'parametros'],
    ['getConfiguracion', 'readConfiguracion', 'configuracion'],
    ['getCatalogos', 'readCatalogos', 'catalogos'],
    ['getDatosEjemplo', 'readDatosEjemplo', 'datosEjemplo'],
  ])('expone %s y delega en %s', (repositoryMethod, providerMethod, valueKey) => {
    const provider = createProvider();
    const repository = createSellThroughRepository({ provider });

    expect(repository[repositoryMethod]()).toBe(providerValues[valueKey]);
    expect(provider[providerMethod]).toHaveBeenCalledOnce();
  });

  it('rechaza un Provider que no sea un objeto válido', () => {
    expect(() => createSellThroughRepository({ provider: null })).toThrowError(
      'SellThroughRepository: el Provider debe ser un objeto válido.',
    );
  });

  it('rechaza un Provider incompleto desde el primer método ausente', () => {
    expect(() => createSellThroughRepository({
      provider: { readMaestro: () => providerValues.maestro },
    })).toThrowError(
      'SellThroughRepository: falta el método requerido "readInventario" en el Provider.',
    );
  });

  it.each(PROVIDER_METHODS)(
    'identifica explícitamente el método ausente %s',
    (missingMethod) => {
      const provider = createProvider();
      delete provider[missingMethod];

      expect(() => createSellThroughRepository({ provider })).toThrowError(
        `SellThroughRepository: falta el método requerido "${missingMethod}" en el Provider.`,
      );
    },
  );

  it('permite configuración null en un Repository parcial', () => {
    const repository = createSellThroughRepository();

    expect(repository.getConfiguracion()).toBeNull();
    expect(repository.getCatalogos()).toEqual(expect.objectContaining({
      paisesIOCA: expect.any(Array),
      periodosAnalisis: expect.any(Array),
      notaInvSeguridadIOCA: expect.any(Object),
    }));
  });
});

describe('processSellThrough con configuración contractual', () => {
  it('devuelve error controlado cuando la configuración es null', () => {
    const repository = createSellThroughRepository({
      rawMaestro: providerValues.maestro,
      rawInventario: providerValues.inventario,
      config: null,
    });

    expect(processSellThrough(repository)).toEqual({
      resultados: null,
      error: 'Falta la configuración requerida para procesar sell-through.',
    });
  });

  it('devuelve error controlado cuando la configuración no es un objeto', () => {
    const repository = createSellThroughRepository({
      provider: createProvider({ readConfiguracion: vi.fn(() => 'inválida') }),
    });

    expect(processSellThrough(repository)).toEqual({
      resultados: null,
      error: 'La configuración requerida para procesar sell-through debe ser un objeto válido.',
    });
  });

  it('enumera las claves faltantes cuando la configuración está incompleta', () => {
    const repository = createSellThroughRepository({
      provider: createProvider({
        readConfiguracion: vi.fn(() => ({ periodoAnalizado: 'Mensual' })),
      }),
    });

    expect(processSellThrough(repository)).toEqual({
      resultados: null,
      error: 'La configuración requerida para procesar sell-through está incompleta. Faltan: semanasPersonalizadas, safetyStockSemanas, leadTimeUSA, leadTimeCHINA.',
    });
  });

  it('preserva el contrato vigente con una configuración válida', () => {
    const repository = createSellThroughRepository({
      rawMaestro: providerValues.maestro,
      rawInventario: providerValues.inventario,
      config: providerValues.configuracion,
    });

    const execution = processSellThrough(repository);

    expect(execution.error).toBeNull();
    expect(execution.resultados).toMatchObject({
      recs: [expect.objectContaining({ sku: 'TEST-1', invFinal: 2 })],
      semanasPeriodoUsadas: 4.33,
      configSnapshot: {
        periodoAnalizado: 'Mensual',
        semanasPeriodo: 4.33,
        safetyStockSemanas: 4,
        leadTimeUSA: 4,
        leadTimeCHINA: 12,
      },
      totales: { totalSKUs: 1 },
    });
  });
});
