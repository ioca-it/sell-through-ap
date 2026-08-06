// Caracteriza las seis lecturas locales y sus validaciones estructurales mínimas.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const localSource = vi.hoisted(() => ({}));

vi.mock('../../../services/dataService.js', () => ({
  dataService: {
    getBucketEOL: () => localSource.bucketEOL,
    getTablaFases: () => localSource.tablaFases,
    getPaises: () => localSource.paisesIOCA,
    getPeriodos: () => localSource.periodosAnalisis,
    getUmbralMerma: () => localSource.umbralMermaPct,
    getSemanasPorPeriodo: () => localSource.semanasPorPeriodo,
    getNotaInvSeguridadIOCA: () => localSource.notaInvSeguridadIOCA,
    getMaestroSample: () => localSource.maestroSample,
    getInventarioSample: () => localSource.inventarioSample,
  },
}));

import { createLocalDataProvider } from '../localDataProvider.js';

const config = {
  periodoAnalizado: 'Mensual',
  semanasPersonalizadas: 4,
  safetyStockSemanas: 4,
  leadTimeUSA: 4,
  leadTimeCHINA: 12,
};

beforeEach(() => {
  localSource.bucketEOL = [{ bucket: 'EOL Vencido' }];
  localSource.tablaFases = [{ fase: 0 }];
  localSource.paisesIOCA = ['Guatemala'];
  localSource.periodosAnalisis = ['Mensual'];
  localSource.umbralMermaPct = 0.1;
  localSource.semanasPorPeriodo = { Mensual: 4.33 };
  localSource.notaInvSeguridadIOCA = { titulo: 'Motor' };
  localSource.maestroSample = 'SKU\nEJEMPLO-1';
  localSource.inventarioSample = 'SKU\tINV FINAL\nEJEMPLO-1\t1';
});

describe('localDataProvider', () => {
  it('readMaestro conserva el texto recibido', () => {
    const provider = createLocalDataProvider({ rawMaestro: 'SKU\nLOCAL-1' });
    expect(provider.readMaestro()).toBe('SKU\nLOCAL-1');
  });

  it('readInventario conserva el texto recibido', () => {
    const provider = createLocalDataProvider({ rawInventario: 'SKU\tINV FINAL' });
    expect(provider.readInventario()).toBe('SKU\tINV FINAL');
  });

  it('readParametros conserva la forma institucional vigente', () => {
    const provider = createLocalDataProvider();
    expect(provider.readParametros()).toEqual({
      bucketEOL: localSource.bucketEOL,
      tablaFases: localSource.tablaFases,
      umbralMermaPct: 0.1,
      semanasPorPeriodo: { Mensual: 4.33 },
    });
  });

  it('readConfiguracion conserva el objeto recibido', () => {
    const provider = createLocalDataProvider({ config });
    expect(provider.readConfiguracion()).toBe(config);
  });

  it('readCatalogos conserva la forma institucional vigente', () => {
    const provider = createLocalDataProvider();
    expect(provider.readCatalogos()).toEqual({
      paisesIOCA: ['Guatemala'],
      periodosAnalisis: ['Mensual'],
      notaInvSeguridadIOCA: { titulo: 'Motor' },
    });
  });

  it('readDatosEjemplo devuelve ambos textos locales', () => {
    const provider = createLocalDataProvider();
    expect(provider.readDatosEjemplo()).toEqual({
      maestro: 'SKU\nEJEMPLO-1',
      inventario: 'SKU\tINV FINAL\nEJEMPLO-1\t1',
    });
  });

  it('permite configuración null para usos parciales', () => {
    expect(createLocalDataProvider().readConfiguracion()).toBeNull();
  });

  it('permite un objeto de configuración incompleto para que el caso de uso lo valide', () => {
    const incompleteConfig = { periodoAnalizado: 'Mensual' };
    expect(createLocalDataProvider({
      config: incompleteConfig,
    }).readConfiguracion()).toBe(incompleteConfig);
  });

  it.each([
    ['rawMaestro', { rawMaestro: null }],
    ['rawInventario', { rawInventario: 42 }],
  ])('rechaza %s cuando no es string', (fieldName, inputs) => {
    expect(() => createLocalDataProvider(inputs)).toThrowError(
      `LocalDataProvider: "${fieldName}" debe ser string.`,
    );
  });

  it('rechaza configuración que no sea objeto o null', () => {
    expect(() => createLocalDataProvider({ config: [] })).toThrowError(
      'LocalDataProvider: "config" debe ser un objeto válido.',
    );
  });

  it('identifica parámetros institucionales con forma inválida', () => {
    localSource.bucketEOL = null;
    const provider = createLocalDataProvider();

    expect(() => provider.readParametros()).toThrowError(
      'LocalDataProvider: "parametros.bucketEOL" debe ser un arreglo.',
    );
  });

  it('identifica un umbral institucional no numérico', () => {
    localSource.umbralMermaPct = '0.1';
    const provider = createLocalDataProvider();

    expect(() => provider.readParametros()).toThrowError(
      'LocalDataProvider: "parametros.umbralMermaPct" debe ser un número válido.',
    );
  });

  it('identifica catálogos locales con forma inválida', () => {
    localSource.periodosAnalisis = null;
    const provider = createLocalDataProvider();

    expect(() => provider.readCatalogos()).toThrowError(
      'LocalDataProvider: "catalogos.periodosAnalisis" debe ser un arreglo.',
    );
  });

  it('identifica datos de ejemplo que no sean texto', () => {
    localSource.inventarioSample = null;
    const provider = createLocalDataProvider();

    expect(() => provider.readDatosEjemplo()).toThrowError(
      'LocalDataProvider: "datosEjemplo.inventario" debe ser string.',
    );
  });
});
