import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createSellThroughRepository } from '../repositories/sellThroughRepository.js';
import {
  calculatePareto,
  calculateTierDistribution,
  processSellThrough,
} from '../application/sellThroughApplicationService.js';
import {
  calcularQuiebreYReposicion,
} from '../domain/inventory/inventoryEngine.js';
import {
  calcularDescuentoYAportes,
  clasificarTemporalmente,
  seleccionarFaseEOL,
} from '../domain/eol/eolEngine.js';
import { fmtPct } from '../utils/formatters.js';

const PROCESSING_DATE = new Date(2026, 7, 1);
const SYSTEM_DATE = new Date(2026, 7, 15, 12, 0, 0);
const CONFIG = {
  periodoAnalizado: 'Mensual',
  semanasPersonalizadas: 4,
  safetyStockSemanas: 4,
  leadTimeUSA: 4,
  leadTimeCHINA: 12,
};

const institutionalRepository = createSellThroughRepository();
const { tablaFases } = institutionalRepository.getParametros();

const processData = ({ maestro, inventario }) => {
  const repository = createSellThroughRepository({
    rawMaestro: maestro,
    rawInventario: inventario,
    config: CONFIG,
  });
  const execution = processSellThrough(repository);
  expect(execution.error).toBeNull();
  return execution.resultados;
};

const dateAtOffset = (days) => {
  const date = new Date(PROCESSING_DATE);
  date.setDate(date.getDate() + days);
  return date;
};

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(SYSTEM_DATE);
});

afterAll(() => {
  vi.useRealTimers();
});

describe('reposición, nivel de seguridad y tránsito', () => {
  it('reclasifica Estado EOL como nivel EOL y fuerza reposición cero', () => {
    const resultados = processData({
      maestro: 'SKU\tESTADO\tFECHA EOL\tUSA\nEOL-1\tEOL\t2026-01-01\t10',
      inventario: 'SKU\tTIER\tINV SEGURIDAD\tINV PROYECTADO\tINV FINAL\nEOL-1\tBEST\t10\t0\t1',
    });

    expect(resultados.recs[0]).toMatchObject({
      tier: 'EOL',
      reposicionSugerida: 0,
      clasificacionTemporal: 'VENCIDO',
    });
  });

  it('fuerza reposición cero para SKU sin Maestro', () => {
    const resultados = processData({
      maestro: 'SKU\nOTRO',
      inventario: 'SKU\tINV SEGURIDAD\tINV PROYECTADO\tINV FINAL\nSIN-MAESTRO\t10\t0\t1',
    });

    expect(resultados.recs[0]).toMatchObject({
      estado: 'SIN MAESTRO',
      necesidadReposicion: 9,
      reposicionSugerida: 0,
    });
  });

  it('Compra reduce la necesidad vigente y la reposición nunca es negativa', () => {
    expect(calcularQuiebreYReposicion({
      estado: 'ACTIVO', invSeguridadIOCA: 10, invFinal: 2, invProyectado: 5, compra: 3,
    })).toMatchObject({ necesidadReposicion: 8, reposicionSugerida: 5 });

    expect(calcularQuiebreYReposicion({
      estado: 'ACTIVO', invSeguridadIOCA: 10, invFinal: 2, invProyectado: 22, compra: 20,
    }).reposicionSugerida).toBe(0);
  });

  it('Compra ausente equivale a cero', () => {
    const resultados = processData({
      maestro: 'SKU\tUSA\nACTIVO-1\t10',
      inventario: 'SKU\tINV SEGURIDAD\tINV PROYECTADO\tINV FINAL\nACTIVO-1\t10\t2\t2',
    });

    expect(resultados.recs[0]).toMatchObject({
      compra: 0,
      necesidadReposicion: 8,
      reposicionSugerida: 8,
    });
  });

  it('conserva Inventario Proyectado negativo y lo usa para nivel de seguridad', () => {
    const resultados = processData({
      maestro: 'SKU\tUSA\nNEGATIVO-1\t10',
      inventario: 'SKU\tINV SEGURIDAD\tINV PROYECTADO\tINV FINAL\nNEGATIVO-1\t5\t-3\t6',
    });

    expect(resultados.recs[0]).toMatchObject({ invProyectado: -3, alertaQuiebre: true });
  });

  it('agrega Compra por SKU en tránsito e incluye productos EOL', () => {
    const resultados = processData({
      maestro: [
        'SKU\tESTADO\tFECHA EOL\tUSA',
        'ACTIVO-1\tACTIVO\t-\t10',
        'EOL-1\tEOL\t2026-01-01\t10',
      ].join('\n'),
      inventario: [
        'SKU\tCOMPRA\tINV FINAL',
        'ACTIVO-1\t3\t1',
        'ACTIVO-1\t2\t1',
        'EOL-1\t4\t1',
      ].join('\n'),
    });

    expect(resultados.alertas.totalUnidadesTransito).toBe(9);
    expect(resultados.alertas.productosEnTransito).toEqual([
      expect.objectContaining({ sku: 'ACTIVO-1', unidadesEnTransito: 5 }),
      expect.objectContaining({ sku: 'EOL-1', estado: 'EOL', unidadesEnTransito: 4 }),
    ]);
  });
});

describe('clasificación temporal y EOL Fase 4', () => {
  it.each([
    [-1, 'VENCIDO'],
    [0, 'POR VENCER'],
    [31, 'POR VENCER'],
    [32, 'ACTIVO'],
  ])('clasifica el límite de %i días restantes', (days, expected) => {
    expect(clasificarTemporalmente({
      estado: 'ACTIVO',
      fechaDescontinuacion: dateAtOffset(days),
      fechaProcesamiento: PROCESSING_DATE,
    })).toEqual({ diasRestantes: days, clasificacionTemporal: expected });
  });

  it('trata fecha vacía o inválida como Activo y prioriza Estado EOL', () => {
    expect(clasificarTemporalmente({
      estado: 'ACTIVO', fechaDescontinuacion: null, fechaProcesamiento: PROCESSING_DATE,
    })).toEqual({ diasRestantes: null, clasificacionTemporal: 'ACTIVO' });

    expect(clasificarTemporalmente({
      estado: 'EOL', fechaDescontinuacion: dateAtOffset(32), fechaProcesamiento: PROCESSING_DATE,
    }).clasificacionTemporal).toBe('VENCIDO');
  });

  it('asigna Fase 4 solamente con más de 365 días y descuento consumidor de 50%', () => {
    const fase365 = seleccionarFaseEOL({
      marca: 'SKULLCANDY', origen: 'USA', diasDesc: 365, tablaFases,
    });
    const fase366 = seleccionarFaseEOL({
      marca: 'SKULLCANDY', origen: 'USA', diasDesc: 366, tablaFases,
    });

    expect(fase365.fase).toBe(3);
    expect(fase366).toMatchObject({
      fase: 4,
      descConsumidor: 0.5,
      inventarioMinimoReconocido: 12,
    });
  });

  it('asigna la liquidación F4 con inventario menor a 12 únicamente a Retail', () => {
    const fase = seleccionarFaseEOL({
      marca: 'SKULLCANDY', origen: 'USA', diasDesc: 366, tablaFases,
    });
    const resultado = calcularDescuentoYAportes({ costo: 100, faseConfig: fase, invFinal: 11 });

    expect(resultado).toMatchObject({
      descPct: 0.5,
      ioaPct: 0,
      retailPct: 1,
      inventarioMinimoReconocido: 12,
      liquidacionSoloRetail: true,
      ioaTotal: 0,
      retailTotal: 550,
    });
  });
});

describe('Pareto, Mix Balanceado, KPIs y valorización', () => {
  it('calcula Pareto A/B/C por unidades vendidas y conserva cantidades de SKU', () => {
    const pareto = calculatePareto([
      { sku: 'A', ventas: 80 },
      { sku: 'B', ventas: 10 },
      { sku: 'C', ventas: 5 },
      { sku: 'D', ventas: 3 },
      { sku: 'E', ventas: 2 },
    ]);

    expect(pareto.skusParetoA.map(({ sku }) => sku)).toEqual(['A']);
    expect(pareto.skusParetoB.map(({ sku }) => sku)).toEqual(['B', 'C']);
    expect(pareto.skusParetoC.map(({ sku }) => sku)).toEqual(['D', 'E']);
    expect(pareto).toMatchObject({ totalSkusConVentas: 5, totalVentas: 100 });
  });

  it('Mix GOOD/BETTER/BEST/EOL suma 100% y conserva todas las unidades', () => {
    const distribution = calculateTierDistribution([
      { estado: 'ACTIVO', tier: 'GOOD', invFinal: 10, valorInv: 10 },
      { estado: 'ACTIVO', tier: 'BETTER', invFinal: 20, valorInv: 20 },
      { estado: 'ACTIVO', tier: 'BEST', invFinal: 30, valorInv: 30 },
      { estado: 'EOL', tier: 'EOL', invFinal: 40, valorInv: 40 },
    ], 'invFinal', 'valorInv');

    const operationalTiers = ['GOOD', 'BETTER', 'BEST', 'EOL'];
    const percentage = operationalTiers.reduce(
      (sum, tier) => sum + distribution.tiers[tier].pctUnidades,
      0,
    );
    expect(distribution.totalU).toBe(100);
    expect(percentage).toBeCloseTo(1);
    expect(distribution.tiers.EOL).toMatchObject({ unidades: 40, pctUnidades: 0.4 });
  });

  it('cuadra KPIs de unidades y la ecuación completa de valorización', () => {
    const resultados = processData({
      maestro: [
        'SKU\tESTADO\tFECHA EOL\tUSA\tCHINA',
        'ACTIVO\tACTIVO\t-\t10\t8',
        'EOL-VENCIDO\tEOL\t2025-01-01\t20\t18',
        'EOL-FUTURO\tEOL\t2026-09-15\t30\t25',
      ].join('\n'),
      inventario: [
        'SKU\tORIGEN\tVENTAS\tINV FINAL',
        'ACTIVO\tUSA\t1\t2',
        'EOL-VENCIDO\tUSA\t0\t3',
        'EOL-FUTURO\tCHINA\t0\t4',
        'SIN-MAESTRO\tUSA\t0\t5',
      ].join('\n'),
    });

    expect(resultados.totales).toMatchObject({
      totalSKUs: 4,
      totalUnidades: 14,
      skuActivos: 1,
      unidadesActivas: 2,
      skuVencidos: 2,
      unidadesVencidas: 7,
      skuPorVencer: 0,
      unidadesPorVencer: 0,
      skuMaestro: 3,
      unidadesMaestro: 9,
      sinMaestro: 1,
      unidadesSinMaestro: 5,
      valorActivo: 20,
      valorEOL: 60,
      valorEOLFuturo: 100,
      valorSinMaestro: 0,
      valorTotalInventario: 180,
    });
    expect(resultados.totales.valorTotalInventario).toBe(
      resultados.totales.valorActivo
      + resultados.totales.valorEOL
      + resultados.totales.valorEOLFuturo
      + resultados.totales.valorSinMaestro,
    );
    expect(resultados.executiveReport.executiveSummary).toMatchObject({
      skuEOL: 2,
      unidadesEOL: 7,
      skuSinMaestro: 1,
      unidadesSinMaestro: 5,
      valorTotalInventario: 180,
      valorActivo: 20,
      valorEOL: 60,
      valorSinMaestro: 0,
    });
    expect(resultados.executiveReport.valorizacion.valorTotalInventario).toBe(180);
  });

  it('expone pares SKU/unidades para los indicadores del Resumen Dashboard', () => {
    const resultados = processData({
      maestro: [
        'SKU\tUSA',
        'SIN-ORIGEN\t10',
        'CON-MERMA\t10',
        'EN-QUIEBRE\t10',
      ].join('\n'),
      inventario: [
        'SKU\tORIGEN\tINV SEGURIDAD\tINV INICIAL\tINV PROYECTADO\tINV FINAL',
        'SIN-ORIGEN\t\t0\t4\t4\t4',
        'CON-MERMA\tUSA\t0\t10\t10\t8',
        'EN-QUIEBRE\tUSA\t5\t2\t2\t2',
      ].join('\n'),
    });

    expect(resultados.executiveReport.dashboard.alertas).toMatchObject({
      skusSinOrigen: 1,
      unidadesSinOrigen: 4,
      skusConMerma: 1,
      unidadesConMerma: 2,
      skusEnQuiebre: 1,
      unidadesEnQuiebre: 2,
      quiebreActivos: 1,
      unidadesQuiebreActivos: 2,
      quiebreEOL: 0,
      unidadesQuiebreEOL: 0,
    });
  });

  it('clasifica producto sin rotación exclusivamente por Ventas igual a cero', () => {
    const resultados = processData({
      maestro: 'SKU\nSIN-VENTA\nCON-VENTA',
      inventario: 'SKU\tVENTAS\tINV FINAL\nSIN-VENTA\t0\t0\nCON-VENTA\t1\t0',
    });

    expect(resultados.alertas.productosSinRotacion.map(({ sku }) => sku)).toEqual(['SIN-VENTA']);
  });

  it('muestra porcentajes visuales sin decimales', () => {
    expect(fmtPct(0.126)).toBe('13%');
    expect(fmtPct(0)).toBe('0%');
  });
});
