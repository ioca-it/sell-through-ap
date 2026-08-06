// Caracteriza los motores actuales invocando el handler real de App.jsx sin renderizar el DOM.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const stateHarness = vi.hoisted(() => ({
  overrides: {},
  values: [],
  setters: [],
  nextIndex: 0,
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    useState: (initialValue) => {
      const index = stateHarness.nextIndex++;
      const hasOverride = Object.prototype.hasOwnProperty.call(stateHarness.overrides, index);
      const fallback = typeof initialValue === 'function' ? initialValue() : initialValue;
      stateHarness.values[index] = hasOverride ? stateHarness.overrides[index] : fallback;

      const setter = (nextValue) => {
        stateHarness.values[index] = typeof nextValue === 'function'
          ? nextValue(stateHarness.values[index])
          : nextValue;
      };
      stateHarness.setters[index] = setter;

      return [stateHarness.values[index], setter];
    },
  };
});

import App from '../App.jsx';
import { createSellThroughRepository } from '../repositories/sellThroughRepository.js';
import { primerDiaMes } from '../utils/dateUtils.js';
import {
  obtenerSemanasPeriodo,
  calcularInventarioProyectado,
  calcularMerma,
  calcularIndiceRotacion,
  seleccionarOrigen,
  seleccionarCostoPorOrigen,
  calcularInventarioSeguridadIOCA,
  calcularQuiebreYReposicion,
  obtenerAccionQuiebreActivo,
} from '../domain/inventory/inventoryEngine.js';
import {
  calcularDiasEOL,
  seleccionarBucketEOL,
  seleccionarFaseEOL,
  calcularDescuentoYAportes,
  obtenerAccionQuiebreEOL,
} from '../domain/eol/eolEngine.js';

const BASE_DATE = new Date(2026, 7, 1);
const SYSTEM_DATE = new Date(2026, 7, 15, 12, 0, 0);
const BASE_CONFIG = {
  codigoCliente: 'CONTROL-013',
  nombreCliente: 'Dataset controlado Prompt 013',
  pais: 'Guatemala',
  fechaCorte: '2030-01-15',
  periodoAnalizado: 'Mensual',
  periodoDetalle: 'Caracterización',
  semanasPersonalizadas: 4,
  safetyStockSemanas: 4,
  leadTimeUSA: 4,
  leadTimeCHINA: 12,
};
const repository = createSellThroughRepository();
const {
  bucketEOL: BUCKETS,
  tablaFases: TABLA_FASES,
  semanasPorPeriodo: SEMANAS_POR_PERIODO,
  umbralMermaPct: UMBRAL_MERMA_PCT,
} = repository.getParametros();

const dateObjectForDiasDesc = (diasDesc) => {
  const date = new Date(BASE_DATE);
  date.setDate(date.getDate() - diasDesc);
  return date;
};

const dateForDiasDesc = (diasDesc) => {
  const date = dateObjectForDiasDesc(diasDesc);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

const maestroRow = ({
  sku,
  marca = 'SKULLCANDY',
  estado = 'ACTIVO',
  fecha = '-',
  costoUSA = 100,
  costoCHINA = 80,
}) => [marca, sku, `Modelo ${sku}`, 'CONTROL', fecha, estado, costoUSA, costoCHINA].join('\t');

const inventarioRow = ({
  sku,
  origen = 'USA',
  invSeguridad = 0,
  invInicial = 0,
  compra = 0,
  ventas = 0,
  invProyectado = 0,
  invFinal = 0,
}) => ['CONTROL', sku, 'GOOD', origen, invSeguridad, invInicial, compra, ventas, invProyectado, invFinal].join('\t');

const masterDefinitions = [
  { sku: 'ACTIVE-USA', costoUSA: 100, costoCHINA: 80 },
  { sku: 'ACTIVE-CHINA', costoUSA: 100, costoCHINA: 80 },
  { sku: 'ACTIVE-NO-ORIGIN', costoUSA: 60, costoCHINA: 50 },
  { sku: 'ACTIVE-MERMA-LIMIT', costoUSA: 40, costoCHINA: 30 },
  { sku: 'ACTIVE-ZERO-INITIAL', costoUSA: 30, costoCHINA: 20 },
  { sku: 'ACTIVE-BOUNDARY', costoUSA: 20, costoCHINA: 10 },
  { sku: 'ACTIVE-OTHER-ORIGIN', costoUSA: 70, costoCHINA: 55 },
  { sku: 'FALLBACK-PROJECTED', costoUSA: 50, costoCHINA: 45 },
  { sku: 'BUCKET-0', estado: 'EOL', fecha: dateForDiasDesc(0) },
  { sku: 'BUCKET-FUTURE-27', estado: 'EOL', fecha: dateForDiasDesc(-27) },
  { sku: 'BUCKET-FUTURE-28', estado: 'EOL', fecha: dateForDiasDesc(-28) },
  { sku: 'BUCKET-FUTURE-83', estado: 'EOL', fecha: dateForDiasDesc(-83) },
  { sku: 'BUCKET-FUTURE-84', estado: 'EOL', fecha: dateForDiasDesc(-84) },
  { sku: 'BUCKET-FUTURE-360', estado: 'EOL', fecha: dateForDiasDesc(-360) },
  { sku: 'BUCKET-FUTURE-361', estado: 'EOL', fecha: dateForDiasDesc(-361) },
  { sku: 'PHASE-89', estado: 'EOL', fecha: dateForDiasDesc(89) },
  { sku: 'PHASE-90', estado: 'EOL', fecha: dateForDiasDesc(90) },
  { sku: 'PHASE-119', estado: 'EOL', fecha: dateForDiasDesc(119) },
  { sku: 'PHASE-120', estado: 'EOL', fecha: dateForDiasDesc(120), costoUSA: 100, costoCHINA: 80 },
  { sku: 'PHASE-149', estado: 'EOL', fecha: dateForDiasDesc(149) },
  { sku: 'PHASE-150', estado: 'EOL', fecha: dateForDiasDesc(150) },
  { sku: 'PHASE-239', estado: 'EOL', fecha: dateForDiasDesc(239) },
  { sku: 'PHASE-240', estado: 'EOL', fecha: dateForDiasDesc(240) },
  { sku: 'PHASE-CHINA-240', estado: 'EOL', fecha: dateForDiasDesc(240), costoUSA: 100, costoCHINA: 80 },
  { sku: 'PHASE-OTHER-240', marca: 'OTHER', estado: 'EOL', fecha: dateForDiasDesc(240) },
];

const maestro = [
  'MARCA\tSKU\tMODELO\tCATEGORIA\tFECHA EOL\tESTADO\tUSA\tCHINA',
  ...masterDefinitions.map(maestroRow),
].join('\n');

const mainInventoryDefinitions = [
  { sku: 'ACTIVE-USA', origen: 'USA', invSeguridad: 5, invInicial: 20, compra: 8, ventas: 10, invProyectado: 18, invFinal: 15 },
  { sku: 'ACTIVE-CHINA', origen: 'CHINA', invSeguridad: 5, invInicial: 30, compra: 10, ventas: 10, invProyectado: 30, invFinal: 30 },
  { sku: 'ACTIVE-NO-ORIGIN', origen: '', invSeguridad: 5, invInicial: 10, invProyectado: 10, invFinal: 4 },
  { sku: 'ACTIVE-MERMA-LIMIT', invInicial: 100, ventas: 10, invProyectado: 100, invFinal: 90 },
  { sku: 'ACTIVE-ZERO-INITIAL', invInicial: 0, invProyectado: 5, invFinal: 0 },
  { sku: 'ACTIVE-BOUNDARY', invInicial: 1, compra: 2, ventas: 1, invProyectado: 2, invFinal: 2 },
  { sku: 'ACTIVE-OTHER-ORIGIN', origen: 'MEXICO' },
  { sku: 'BUCKET-0' },
  { sku: 'BUCKET-FUTURE-27' },
  { sku: 'BUCKET-FUTURE-28' },
  { sku: 'BUCKET-FUTURE-83' },
  { sku: 'BUCKET-FUTURE-84' },
  { sku: 'BUCKET-FUTURE-360' },
  { sku: 'BUCKET-FUTURE-361' },
  { sku: 'PHASE-89' },
  { sku: 'PHASE-90' },
  { sku: 'PHASE-119' },
  { sku: 'PHASE-120', invSeguridad: 20, invInicial: 10, invProyectado: 10, invFinal: 10 },
  { sku: 'PHASE-149' },
  { sku: 'PHASE-150' },
  { sku: 'PHASE-239' },
  { sku: 'PHASE-240' },
  { sku: 'PHASE-CHINA-240', origen: 'CHINA', invInicial: 5, invProyectado: 5, invFinal: 5 },
  { sku: 'PHASE-OTHER-240', invInicial: 2, invProyectado: 2, invFinal: 2 },
  { sku: 'MISSING-MASTER', origen: '', invSeguridad: 3, invInicial: 1, invProyectado: 1, invFinal: 1 },
];

const inventario = [
  'TIENDA\tSKU\tTIER\tORIGEN\tINVENTARIO SEGURIDAD\tINV INICIAL\tCOMPRA\tVENTAS\tINV PROYECTADO\tINV FINAL',
  ...mainInventoryDefinitions.map(inventarioRow),
].join('\n');

const inventarioSinProyectado = [
  'TIENDA\tSKU\tTIER\tORIGEN\tINVENTARIO SEGURIDAD\tINV INICIAL\tCOMPRA\tVENTAS\tINV FINAL',
  ['CONTROL', 'FALLBACK-PROJECTED', 'GOOD', 'USA', 0, 10, 5, 3, 10].join('\t'),
].join('\n');

const textContent = (node) => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textContent).join('');
  return node.props ? textContent(node.props.children) : '';
};

const findElement = (node, predicate) => {
  if (node === null || node === undefined || typeof node === 'boolean') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElement(child, predicate);
      if (match) return match;
    }
    return null;
  }
  if (typeof node !== 'object' || !node.props) return null;
  if (predicate(node)) return node;
  return findElement(node.props.children, predicate);
};

const executeCurrentEngine = (inventoryText) => {
  stateHarness.overrides = {
    0: maestro,
    1: inventoryText,
    6: 'carga',
    7: BASE_CONFIG,
  };
  stateHarness.values = [];
  stateHarness.setters = [];
  stateHarness.nextIndex = 0;

  const tree = App();
  const calculateButton = findElement(
    tree,
    (node) => node.type === 'button' && textContent(node).includes('Calcular y ver dashboard'),
  );
  if (!calculateButton) throw new Error('No se encontró el handler actual de procesamiento.');

  calculateButton.props.onClick();
  if (stateHarness.values[3]) throw new Error(stateHarness.values[3]);
  if (!stateHarness.values[2]) throw new Error('El motor no produjo resultados.');

  return stateHarness.values[2];
};

let bridgeResults;
let bridgeRecords;
let bridgeFallbackResults;

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(SYSTEM_DATE);

  bridgeResults = executeCurrentEngine(inventario);
  bridgeRecords = Object.fromEntries(bridgeResults.recs.map((record) => [record.sku, record]));
  bridgeFallbackResults = executeCurrentEngine(inventarioSinProyectado);
});

afterAll(() => {
  vi.useRealTimers();
});

describe('Inventory Engine extraído', () => {
  it('calcula merma como inventario proyectado menos inventario final', () => {
    const result = calcularMerma({
      invProyectado: 18,
      invFinal: 15,
      invInicial: 20,
      umbralMermaPct: UMBRAL_MERMA_PCT,
    });

    expect(result.merma).toBe(3);
    expect(result.mermaPct).toBeCloseTo(0.15);
  });

  it.each([
    ['por encima del 10%', 18, 15, 20, true, 0.15],
    ['exactamente en 10%', 100, 90, 100, false, 0.10],
    ['sin inventario inicial', 5, 0, 0, false, 0],
  ])('congela la alerta de merma %s', (
    _case,
    invProyectado,
    invFinal,
    invInicial,
    expectedAlert,
    expectedPct,
  ) => {
    const result = calcularMerma({
      invProyectado,
      invFinal,
      invInicial,
      umbralMermaPct: UMBRAL_MERMA_PCT,
    });

    expect(result.alertaMerma).toBe(expectedAlert);
    expect(result.mermaPct).toBeCloseTo(expectedPct);
  });

  it('calcula inventario proyectado cuando falta toda la columna de entrada', () => {
    const invProyectado = calcularInventarioProyectado({
      columnaDisponible: false,
      valorInformado: 0,
      invInicial: 10,
      compra: 5,
      ventas: 3,
    });
    const result = calcularMerma({
      invProyectado,
      invFinal: 10,
      invInicial: 10,
      umbralMermaPct: UMBRAL_MERMA_PCT,
    });

    expect(invProyectado).toBe(12);
    expect(result.merma).toBe(2);
    expect(result.mermaPct).toBeCloseTo(0.2);
    expect(result.alertaMerma).toBe(true);
  });

  it.each([
    ['un valor normal', 20, 10, 2],
    ['otro valor numérico', 30, 10, 3],
    ['ventas en cero', 10, 0, null],
  ])('congela el índice de rotación para %s', (_case, invInicial, ventas, expected) => {
    expect(calcularIndiceRotacion({ invInicial, ventas })).toBe(expected);
  });

  it.each([
    ['USA', 'USA', 10, 5, 19, 'IOCA', 4, 14],
    ['CHINA', 'CHINA', 10, 5, 37, 'IOCA', 12, 32],
    ['ventas cero', 'USA', 0, 5, 5, 'Cliente', 4, 0],
  ])('congela el inventario de seguridad IOCA para %s', (
    _case,
    origen,
    ventas,
    invSeguridadCliente,
    expected,
    source,
    leadTime,
    delta,
  ) => {
    const semanasPeriodo = obtenerSemanasPeriodo(
      BASE_CONFIG.periodoAnalizado,
      BASE_CONFIG.semanasPersonalizadas,
      SEMANAS_POR_PERIODO,
    );
    const result = calcularInventarioSeguridadIOCA({
      ventas,
      semanasPeriodo,
      safetyStockSemanas: BASE_CONFIG.safetyStockSemanas,
      leadTimeUSA: BASE_CONFIG.leadTimeUSA,
      leadTimeCHINA: BASE_CONFIG.leadTimeCHINA,
      origen,
      invSeguridadCliente,
    });

    expect(result.invSeguridadIOCA).toBe(expected);
    expect(result.fuenteInvSeguridad).toBe(source);
    expect(semanasPeriodo).toBe(4.33);
    expect(result.leadTimeAplicado).toBe(leadTime);
    expect(result.deltaInvSeguridad).toBe(delta);
  });

  it.each([
    ['activo bajo el piso IOCA', 'ACTIVO', 19, 15, true, 4, 'Reponer 4 u (orden de compra)'],
    ['activo exactamente en el piso IOCA', 'ACTIVO', 2, 2, false, 0, ''],
    ['EOL bajo el piso del cliente', 'EOL', 20, 10, true, 0, 'Quiebre — dejar morir'],
  ])('congela quiebre y reposición para %s', (
    _case,
    estado,
    invSeguridadIOCA,
    invFinal,
    alert,
    replenishment,
    action,
  ) => {
    const result = calcularQuiebreYReposicion({ estado, invSeguridadIOCA, invFinal });
    const accionSugerida = estado === 'ACTIVO'
      ? obtenerAccionQuiebreActivo({
          alertaQuiebre: result.alertaQuiebre,
          invSeguridadIOCA,
          invFinal,
        })
      : obtenerAccionQuiebreEOL({ alertaQuiebre: result.alertaQuiebre, bucket: BUCKETS[0] });

    expect(result.alertaQuiebre).toBe(alert);
    expect(result.reposicionSugerida).toBe(replenishment);
    expect(accionSugerida).toBe(action);
  });

  it.each([
    ['USA', 'USA', 'USA', false, 100, 80, 100],
    ['CHINA', 'CHINA', 'CHINA', false, 100, 80, 80],
    ['origen faltante', '', 'USA', true, 60, 50, 60],
    ['origen distinto de CHINA', 'MEXICO', 'USA', false, 70, 55, 70],
  ])('selecciona origen y costo para %s', (
    _case,
    origenInv,
    origin,
    missingOrigin,
    costoUSA,
    costoCHINA,
    cost,
  ) => {
    const result = seleccionarOrigen(origenInv);
    const costo = seleccionarCostoPorOrigen({ origen: result.origen, costoUSA, costoCHINA });

    expect(result.origen).toBe(origin);
    expect(result.sinOrigenInv).toBe(missingOrigin);
    expect(costo).toBe(cost);
  });

  it('mantiene un puente desde App para los contratos caracterizados', () => {
    expect(bridgeRecords['ACTIVE-USA']).toMatchObject({
      merma: 3,
      mermaPct: 0.15,
      indiceRotacion: 2,
      origen: 'USA',
      costo: 100,
      invSeguridadIOCA: 19,
      alertaQuiebre: true,
      reposicionSugerida: 4,
    });
    expect(bridgeRecords['PHASE-CHINA-240']).toMatchObject({
      diasDesc: 240,
      bucket: 'EOL Vencido',
      fase: 3,
      origen: 'CHINA',
      costo: 80,
      descPct: 0.070,
      ioaPct: 0.20,
      retailPct: 0.80,
    });
    expect(bridgeRecords['MISSING-MASTER']).toMatchObject({
      estado: 'SIN MAESTRO',
      origen: '—',
      sinOrigenInv: true,
      costo: 0,
      invSeguridadIOCA: 3,
      fuenteInvSeguridad: 'Cliente',
      alertaQuiebre: true,
      reposicionSugerida: 0,
      accionSugerida: 'Agregar al Maestro y decidir',
    });
    expect(bridgeFallbackResults.recs[0]).toMatchObject({
      invProyectado: 12,
      merma: 2,
      mermaPct: 0.2,
      alertaMerma: true,
    });
  });
});

describe('EOL Engine extraído', () => {
  it('usa el primer día del mes del navegador e ignora fechaCorte para los días EOL', () => {
    const fechaBase = primerDiaMes();
    const diasDesc = calcularDiasEOL({ fechaBase, fechaEOL: BASE_DATE });

    expect([
      fechaBase.getFullYear(),
      fechaBase.getMonth(),
      fechaBase.getDate(),
    ]).toEqual([2026, 7, 1]);
    expect(BASE_CONFIG.fechaCorte).toBe('2030-01-15');
    expect(diasDesc).toBe(0);
  });

  it.each([
    ['fecha base', 0, 'EOL Vencido', 'Quiebre — dejar morir'],
    ['27 días futuros', -27, 'EOL Crítico', 'Aceptar quiebre — liquidar lo que queda'],
    ['28 días futuros', -28, 'EOL Próximo', 'Rebalanceo C→A o aceptar quiebre'],
    ['83 días futuros', -83, 'EOL Próximo', 'Rebalanceo C→A o aceptar quiebre'],
    ['84 días futuros', -84, 'EOL Planificado', 'Rebalanceo C→A — traer de otra tienda/bodega'],
    ['360 días futuros', -360, 'EOL Planificado', 'Rebalanceo C→A — traer de otra tienda/bodega'],
    ['361 días futuros', -361, 'EOL Planificado', 'Rebalanceo C→A — traer de otra tienda/bodega'],
  ])('asigna días, bucket y acción en el límite de %s', (_case, days, bucketName, action) => {
    const diasDesc = calcularDiasEOL({
      fechaBase: BASE_DATE,
      fechaEOL: dateObjectForDiasDesc(days),
    });
    const bucket = seleccionarBucketEOL({ diasDesc, buckets: BUCKETS });

    expect(diasDesc).toBe(days);
    expect(bucket.bucket).toBe(bucketName);
    expect(obtenerAccionQuiebreEOL({ alertaQuiebre: true, bucket })).toBe(action);
  });

  it.each([
    ['89 días', 'SKULLCANDY', 'USA', 89, null],
    ['90 días', 'SKULLCANDY', 'USA', 90, 0],
    ['119 días', 'SKULLCANDY', 'USA', 119, 0],
    ['120 días', 'SKULLCANDY', 'USA', 120, 1],
    ['149 días', 'SKULLCANDY', 'USA', 149, 1],
    ['150 días', 'SKULLCANDY', 'USA', 150, 2],
    ['239 días', 'SKULLCANDY', 'USA', 239, 2],
    ['240 días', 'SKULLCANDY', 'USA', 240, 3],
    ['240 días con origen CHINA', 'SKULLCANDY', 'CHINA', 240, 3],
    ['240 días sin marca configurada', 'OTHER', 'USA', 240, null],
  ])('selecciona la fase vigente para %s', (_case, marca, origen, diasDesc, phase) => {
    const diasCalculados = calcularDiasEOL({
      fechaBase: BASE_DATE,
      fechaEOL: dateObjectForDiasDesc(diasDesc),
    });
    const faseConfig = seleccionarFaseEOL({
      marca,
      origen,
      diasDesc: diasCalculados,
      tablaFases: TABLA_FASES,
    });

    expect(diasCalculados).toBe(diasDesc);
    expect(faseConfig ? faseConfig.fase : null).toBe(phase);
  });

  it('calcula descuento y aportes USA de F1 con totales por inventario', () => {
    const faseConfig = seleccionarFaseEOL({
      marca: 'SKULLCANDY',
      origen: 'USA',
      diasDesc: 120,
      tablaFases: TABLA_FASES,
    });
    const result = calcularDescuentoYAportes({ costo: 100, faseConfig, invFinal: 10 });

    expect(result.descPct).toBe(0.033);
    expect(result.ioaPct).toBe(0.20);
    expect(result.retailPct).toBe(0.80);
    expect(result.descUSD).toBeCloseTo(3.30);
    expect(result.ioaUSD).toBeCloseTo(0.66);
    expect(result.retailUSD).toBeCloseTo(2.64);
    expect(result.descTotal).toBeCloseTo(33.00);
    expect(result.ioaTotal).toBeCloseTo(6.60);
    expect(result.retailTotal).toBeCloseTo(26.40);
  });

  it('calcula descuento y aportes CHINA de F3 con el costo CHINA', () => {
    const origen = seleccionarOrigen('CHINA').origen;
    const costo = seleccionarCostoPorOrigen({ origen, costoUSA: 100, costoCHINA: 80 });
    const faseConfig = seleccionarFaseEOL({
      marca: 'SKULLCANDY',
      origen,
      diasDesc: 240,
      tablaFases: TABLA_FASES,
    });
    const result = calcularDescuentoYAportes({ costo, faseConfig, invFinal: 5 });

    expect(costo).toBe(80);
    expect(result.descPct).toBe(0.070);
    expect(result.ioaPct).toBe(0.20);
    expect(result.retailPct).toBe(0.80);
    expect(result.descUSD).toBeCloseTo(5.60);
    expect(result.ioaUSD).toBeCloseTo(1.12);
    expect(result.retailUSD).toBeCloseTo(4.48);
    expect(result.descTotal).toBeCloseTo(28.00);
    expect(result.ioaTotal).toBeCloseTo(5.60);
    expect(result.retailTotal).toBeCloseTo(22.40);
  });

  it('mantiene descuentos y aportes en cero cuando no existe fase para la marca', () => {
    const faseConfig = seleccionarFaseEOL({
      marca: 'OTHER',
      origen: 'USA',
      diasDesc: 240,
      tablaFases: TABLA_FASES,
    });
    const result = calcularDescuentoYAportes({ costo: 100, faseConfig, invFinal: 2 });

    expect(faseConfig).toBeNull();
    expect(result).toMatchObject({
      descPct: 0,
      descUSD: 0,
      ioaPct: 0,
      ioaUSD: 0,
      retailPct: 0,
      retailUSD: 0,
      descTotal: 0,
      ioaTotal: 0,
      retailTotal: 0,
    });
  });
});
