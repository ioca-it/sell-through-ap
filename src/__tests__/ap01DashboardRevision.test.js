import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const stateHarness = vi.hoisted(() => ({
  overrides: {},
  values: [],
  nextIndex: 0,
}));

const xlsxHarness = vi.hoisted(() => ({
  sheetsByName: {},
  workbook: null,
  filename: '',
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    useState: (initialValue) => {
      const index = stateHarness.nextIndex++;
      const fallback = typeof initialValue === 'function' ? initialValue() : initialValue;
      const value = Object.prototype.hasOwnProperty.call(stateHarness.overrides, index)
        ? stateHarness.overrides[index]
        : fallback;
      stateHarness.values[index] = value;
      return [value, vi.fn()];
    },
  };
});

vi.mock('xlsx', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    utils: {
      ...actual.utils,
      aoa_to_sheet: (data, ...args) => {
        const sheet = actual.utils.aoa_to_sheet(data, ...args);
        sheet.__sourceData = data;
        return sheet;
      },
      book_append_sheet: (workbook, sheet, name, ...args) => {
        if (sheet.__sourceData) xlsxHarness.sheetsByName[name] = sheet.__sourceData;
        return actual.utils.book_append_sheet(workbook, sheet, name, ...args);
      },
    },
    writeFile: vi.fn((workbook, filename) => {
      xlsxHarness.workbook = workbook;
      xlsxHarness.filename = filename;
    }),
  };
});

import App from '../App.jsx';
import * as XLSX from 'xlsx';
import { processSellThrough } from '../application/sellThroughApplicationService.js';
import { ProductSkuCell } from '../components/ProductSkuCell.jsx';
import { DefinitionLegend } from '../components/DefinitionLegend.jsx';
import { createSellThroughRepository } from '../repositories/sellThroughRepository.js';
import {
  buildDefinitionsCsv,
  buildSellThroughCsv,
} from '../presentation/csvExport.js';
import { EOL_DISCOUNT_MIN_INVENTORY } from '../domain/eol/eolEngine.js';

const CONFIG = {
  periodoAnalizado: 'Mensual',
  semanasPersonalizadas: 4,
  safetyStockSemanas: 4,
  leadTimeUSA: 4,
  leadTimeCHINA: 12,
};

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

const findElements = (node, predicate, matches = []) => {
  if (node === null || node === undefined || typeof node === 'boolean') return matches;
  if (Array.isArray(node)) {
    node.forEach((child) => findElements(child, predicate, matches));
    return matches;
  }
  if (typeof node !== 'object' || !node.props) return matches;
  if (predicate(node)) matches.push(node);
  findElements(node.props.children, predicate, matches);
  return matches;
};

const buildResults = () => {
  const repository = createSellThroughRepository({
    rawMaestro: [
      'MARCA\tSKU\tMODELO\tCATEGORIA\tESTADO\tFECHA EOL\tcreationDate\tUSA',
      'SKULLCANDY\tREPONER\tModelo recomendado\tAUDIO\tACTIVO\t-\t2026-07-15\t10',
      'SKULLCANDY\tSIN-REPOSICION\tModelo cubierto\tAUDIO\tACTIVO\t-\t2026-01-01\t10',
      'SKULLCANDY\tEOL-SIN-REPOSICION\tModelo EOL\tAUDIO\tEOL\t1/1/2025\t2025-01-01\t10',
      'SKULLCANDY\tNUEVO-AUSENTE\tModelo nuevo\tTRUE WIRELESS\tACTIVO\t-\t2026-07-01\t10',
    ].join('\n'),
    rawInventario: [
      'SKU\tTIER\tORIGEN\tINV SEGURIDAD\tINV PROYECTADO\tINV FINAL\tCOMPRA\tVENTAS',
      'REPONER\tBEST\tUSA\t10\t2\t2\t1\t80',
      'SIN-REPOSICION\tGOOD\tUSA\t1\t20\t20\t0\t10',
      'EOL-SIN-REPOSICION\tBEST\tUSA\t10\t1\t12\t2\t0',
      'SIN-MAESTRO\tGOOD\tUSA\t1\t1\t3\t0\t3',
    ].join('\n'),
    config: CONFIG,
  });
  const execution = processSellThrough(repository);
  if (execution.error) throw new Error(execution.error);
  return execution.resultados;
};

const buildProductMediaResults = () => {
  const repository = createSellThroughRepository({
    rawInventario: [
      'SKU\tTIER\tORIGEN\tINV SEGURIDAD\tINV INICIAL\tCOMPRA\tVENTAS\tINV PROYECTADO\tINV FINAL',
      'MEDIA-ACTIVO\tBEST\t\t10\t20\t2\t10\t12\t2',
      'SIN-MOVIMIENTO\tGOOD\tUSA\t1\t20\t0\t0\t20\t20',
      'EOL-VENCIDO\tEOL\tUSA\t1\t10\t0\t0\t10\t12',
      'EOL-FUTURO\tEOL\tCHINA\t1\t5\t0\t1\t4\t4',
      'SIN-MAESTRO\tGOOD\tUSA\t1\t3\t0\t1\t2\t2',
    ].join('\n'),
    config: CONFIG,
  });
  const product = (sku, overrides = {}) => ({
    sku,
    productName: `Producto ${sku}`,
    brand: 'SKULLCANDY',
    category: 'AUDIO',
    discontinuationDate: null,
    creationDate: '2025-01-01T00:00:00.000Z',
    level: 'BEST',
    status: 'ACTIVO',
    imageUrl: `https://images.example.test/${sku.toLowerCase()}.png`,
    productUrl: `https://products.example.test/${sku.toLowerCase()}`,
    priceUSA: 10,
    priceChina: 8,
    ...overrides,
  });
  const execution = processSellThrough(repository, {
    products: [
      product('MEDIA-ACTIVO'),
      product('SIN-MOVIMIENTO'),
      product('EOL-VENCIDO', {
        status: 'EOL',
        discontinuationDate: '2025-01-01T00:00:00.000Z',
      }),
      product('EOL-FUTURO', {
        status: 'EOL',
        discontinuationDate: '2026-10-01T00:00:00.000Z',
      }),
      product('NUEVO-AUSENTE', {
        creationDate: '2026-07-15T00:00:00.000Z',
      }),
    ],
  });
  if (execution.error) throw new Error(execution.error);
  return execution.resultados;
};

const buildEolUniverseResults = () => {
  const phaseDates = [
    '2025-01-01', '2026-04-01', '2026-07-31',
    '2026-08-28', '2026-08-29', '2026-10-24',
  ];
  const skus = Array.from({ length: 43 }, (_, index) => `EOL-${String(index + 1).padStart(2, '0')}`);
  const repository = createSellThroughRepository({
    rawInventario: [
      'SKU\tTIER\tORIGEN\tINV INICIAL\tVENTAS\tINV FINAL',
      ...skus.map((sku, index) => (
        index === 0
          ? `${sku}\tEOL\tUSA\t0\t0\t20`
          : `${sku}\tEOL\tUSA\t2\t1\t20`
      )),
    ].join('\n'),
    config: CONFIG,
  });
  const execution = processSellThrough(repository, {
    products: skus.map((sku, index) => ({
      sku,
      productName: `Producto ${sku}`,
      brand: 'SKULLCANDY',
      category: 'AUDIO',
      discontinuationDate: index === 0 ? null : phaseDates[index % phaseDates.length],
      creationDate: '2025-01-01',
      level: 'EOL',
      status: 'EOL',
      imageUrl: '',
      productUrl: '',
      priceUSA: 10,
      priceChina: 8,
    })),
  });
  if (execution.error) throw new Error(execution.error);
  return execution.resultados;
};

const renderDashboard = (resultados, { showActives = false, showKnowledge = false } = {}) => {
  stateHarness.overrides = {
    2: resultados,
    4: showActives,
    5: showKnowledge,
    6: 'dashboard',
  };
  stateHarness.values = [];
  stateHarness.nextIndex = 0;
  return App();
};

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 7, 11, 12, 0, 0));
});

afterAll(() => {
  vi.useRealTimers();
});

describe('AP01 — presentación del Dashboard', () => {
  it('aplica ProductSkuCell en todas las tablas de detalle SKU del Dashboard', () => {
    const resultados = buildProductMediaResults();
    const tree = renderDashboard(resultados, { showActives: true });
    const tableCases = [
      ['Costo USA aplicado', 'MEDIA-ACTIVO'],
      ['Merma (u)', 'MEDIA-ACTIVO'],
      ['Pedido Sugerido Final', 'MEDIA-ACTIVO'],
      ['Fecha de creación', 'NUEVO-AUSENTE'],
      ['Valor en tránsito', 'MEDIA-ACTIVO'],
      ['% Acum.', 'MEDIA-ACTIVO'],
      ['Compra / Tránsito', 'MEDIA-ACTIVO'],
      ['FASE EOL', 'EOL-VENCIDO'],
      ['Modelo (del inventario)', 'SIN-MAESTRO'],
    ];

    tableCases.forEach(([header, sku]) => {
      const table = findElement(
        tree,
        (node) => node.type === 'table' && textContent(node).includes(header),
      );
      const cell = findElement(
        table,
        (node) => node.type === ProductSkuCell && textContent(node) === sku,
      );

      expect(table, header).not.toBeNull();
      expect(cell, `${header}:${sku}`).not.toBeNull();
      if (sku === 'SIN-MAESTRO') {
        expect(cell.props).toMatchObject({ imageUrl: '', productUrl: '' });
      } else {
        expect(cell.props.imageUrl).toBe(`https://images.example.test/${sku.toLowerCase()}.png`);
        expect(cell.props.productUrl).toBe(`https://products.example.test/${sku.toLowerCase()}`);
      }
    });

    const activeSection = findElement(
      tree,
      (node) => node.type === 'div'
        && node.props.className === 'bg-white border shadow-sm'
        && textContent(node).includes('SKUs Activos ('),
    );
    const activeCell = findElement(
      activeSection,
      (node) => node.type === ProductSkuCell && textContent(node) === 'MEDIA-ACTIVO',
    );
    expect(activeCell).not.toBeNull();
    expect(activeCell.props.productUrl).toBe('https://products.example.test/media-activo');
  });

  it('aplica ProductSkuCell compacto en las tres tablas SKU del Informe Ejecutivo', () => {
    const resultados = buildProductMediaResults();
    stateHarness.overrides = { 2: resultados, 6: 'informe' };
    stateHarness.values = [];
    stateHarness.nextIndex = 0;
    const reportTree = App();
    const expectedSkus = ['MEDIA-ACTIVO', 'EOL-VENCIDO', 'SIN-MOVIMIENTO'];

    expectedSkus.forEach((sku) => {
      const cell = findElement(
        reportTree,
        (node) => node.type === ProductSkuCell && textContent(node) === sku,
      );
      expect(cell, sku).not.toBeNull();
      expect(cell.props.compact).toBe(true);
      expect(cell.props.imageUrl).toBe(`https://images.example.test/${sku.toLowerCase()}.png`);
      expect(cell.props.productUrl).toBe(`https://products.example.test/${sku.toLowerCase()}`);
    });
  });

  it('consolida Executive Summary y elimina las secciones independientes aprobadas', () => {
    const tree = renderDashboard(buildResults());
    const executiveSection = findElement(
      tree,
      (node) => node.type === 'section' && textContent(node).includes('Executive Dashboard'),
    );
    const content = textContent(executiveSection);

    expect(content).toContain('SKU clasificados EOL');
    expect(content).toContain('Unidades clasificadas EOL');
    expect(content).not.toContain('EOL definido');
    expect(content).not.toContain('SKU Vencidos');
    expect(content).toContain('SKU Sin Maestro');
    expect(content).toContain('Valor Inventario Total');
    expect(content).toContain('Valor Inventario SKU Activos');
    expect(content).toContain('Valor Inventario EOL');
    expect(content).toContain('Valor Inventario Sin Maestro');
    expect(content).toContain('SKU sin ventas');
    expect(content).toContain('Unidades sin ventas');
    expect(content).toContain('Valor inventario sin ventas');
    expect(content).not.toMatch(/por vencer/i);
    expect(content).toContain('Merma');
    expect(content).toContain('Ventas Pareto A');
    expect(content).toContain('Reposición');
    expect(content).not.toContain('KPIs ejecutivos');
    expect(content).not.toContain('Valorización del inventario');
    expect(content).not.toContain('Totales');
    expect(content).toContain('Valor de la merma de los SKU que superan el umbral vigente.');
    expect(content).toContain('Participación de las unidades vendidas generada por los SKU clase A.');
    expect(content).toContain('Costo aplicado por las unidades de reposición sugerida ya calculadas.');
    expect(content).toContain('supera estrictamente este porcentaje');
    expect(content).toContain('Quiebres Activos');
    expect(content).not.toContain('Quiebre EOL');
    expect(content).not.toContain('En quiebre');
    expect(content).toContain('Nuevos no presentes');
    expect(content).toContain('Productos nuevos que aún no están presentes en el inventario del cliente.');
    expect(content).toContain('Vitales');
    expect(content).toContain('Complementarios');
  });

  it('preserva el KPI EOL general y presenta solo el subconjunto con descuento aplicable', () => {
    const resultados = buildEolUniverseResults();
    const tree = renderDashboard(resultados);
    const section = findElement(
      tree,
      (node) => node.type === 'div'
        && node.props.className === 'bg-white border shadow-sm'
        && textContent(node).includes('SKU Clasificados EOL que aplican regla de descuento'),
    );
    const table = findElement(section, (node) => node.type === 'table');
    const skuCells = findElements(
      table,
      (node) => node.type === ProductSkuCell && textContent(node).startsWith('EOL-'),
    );
    const phases = findElements(
      table,
      (node) => node.type === 'span' && node.props['data-eol-phase'],
    ).map(textContent);
    expect(resultados.totales).toMatchObject({ skuEOL: 43, unidEOL: 860, valorEOL: 8600 });
    expect(resultados.eolTodos).toHaveLength(43);
    expect(resultados.eolSinFecha.map(({ sku }) => sku)).toEqual(['EOL-01']);
    expect(resultados.eolTodos.find(({ sku }) => sku === 'EOL-01')).toMatchObject({
      estado: 'EOL', fechaStr: '', diasDesc: null, bucket: null, porcentajeRotacion: null,
    });
    expect(resultados.eolConDescuentoAplicable.every((record) => (
      record.invFinal >= EOL_DISCOUNT_MIN_INVENTORY && record.descPct > 0
    ))).toBe(true);
    expect(skuCells).toHaveLength(resultados.totales.skuEOLConDescuento);
    expect(textContent(section)).toContain(`${resultados.totales.skuEOLConDescuento} SKU`);
    expect(textContent(section)).toContain('SKU clasificados EOL conserva 43 SKU');
    expect(textContent(table)).not.toContain('EOL-01');
    expect(phases).toHaveLength(resultados.totales.skuEOLConDescuento);
    expect([...new Set(phases)]).toEqual(['VENCIDO']);
    expect(textContent(table)).toContain('Liquidar / no reponer');
  });

  it('presenta primerDiaMes como Fecha base EOL sin confundirla con Fecha de corte', () => {
    const tree = renderDashboard(buildResults());
    const content = textContent(tree);

    expect(content).toContain('Fecha base EOL');
    expect(content).toContain('01 de agosto de 2026');
    expect(content).toContain('Primer día del mes utilizado para calcular días y fases EOL.');
    expect(content).toContain('Fecha de corte');
  });

  it('expone unidades explícitas en alertas y leyendas compactas por sección', () => {
    const tree = renderDashboard(buildResults(), { showActives: true });
    const alertCards = findElements(
      tree,
      (node) => typeof node.type === 'function' && node.type.name === 'AlertaCard',
    );
    const alertsByTitle = Object.fromEntries(alertCards.map(({ props }) => [
      props.titulo,
      props.valor,
    ]));
    const legends = findElements(tree, (node) => node.type === DefinitionLegend);

    expect(alertsByTitle['Merma > 10%']).toMatch(/SKU$/);
    expect(alertsByTitle['Bajo Inv. Seguridad']).toMatch(/SKU$/);
    expect(alertsByTitle['Reposición Sugerida']).toMatch(/unidades$/);
    expect(legends.length).toBeGreaterThanOrEqual(12);
    expect(legends.some(({ props }) => (
      props.title === 'Definiciones y fórmulas de todas las columnas'
      && props.ids.includes('finalReplenishment')
      && props.ids.includes('suggestedAction')
    ))).toBe(true);
  });

  it('muestra Mix Balanceado con SKU/unidades y solo reposiciones mayores que cero', () => {
    const resultados = buildResults();
    const tree = renderDashboard(resultados);
    const mixCards = findElements(
      tree,
      (node) => node.props?.label === 'Cantidad Total SKU'
        || node.props?.label === 'Cantidad Total Unidades',
    );
    const replenishmentSection = findElement(
      tree,
      (node) => node.type === 'div'
        && node.props.className === 'bg-white border shadow-sm'
        && textContent(node).includes('Productos de Reposición Sugerida'),
    );
    const replenishmentContent = textContent(replenishmentSection);
    const dashboardContent = textContent(tree);
    const replenishmentPosition = dashboardContent.indexOf('Productos de Reposición Sugerida');
    const eolPosition = dashboardContent.indexOf('SKU Clasificados EOL', replenishmentPosition);

    expect(mixCards.map(({ props }) => [props.label, props.value])).toEqual([
      ['Cantidad Total SKU', resultados.distribucionTier.inventario.totalSKUs],
      ['Cantidad Total Unidades', resultados.distribucionTier.inventario.totalU],
      ['Cantidad Total SKU', resultados.distribucionTier.ventas.totalSKUs],
      ['Cantidad Total Unidades', resultados.distribucionTier.ventas.totalU],
      ['Cantidad Total SKU', resultados.distribucionTier.reposicion.totalSKUs],
      ['Cantidad Total Unidades', resultados.distribucionTier.reposicion.totalU],
    ]);
    expect(replenishmentContent).toContain('REPONER');
    expect(replenishmentContent).toContain('Modelo recomendado');
    expect(replenishmentContent).not.toContain('SIN-REPOSICION');
    expect(replenishmentContent).not.toContain('EOL-SIN-REPOSICION');
    expect(replenishmentContent).toContain('Total SKU incluidos: 1');
    expect(replenishmentContent).toContain(`Total unidades de Pedido Sugerido Final: ${resultados.alertas.totalReposicionUnid}`);
    expect(replenishmentPosition).toBeGreaterThanOrEqual(0);
    expect(eolPosition).toBeGreaterThan(replenishmentPosition);
    expect(dashboardContent).not.toContain('SKUs EOL ya descontinuados — con fase activa');
  });

  it('presenta los productos nuevos ausentes desde Product Master sin incluir un SKU presente', () => {
    const resultados = buildResults();
    const tree = renderDashboard(resultados);
    const section = findElement(
      tree,
      (node) => node.type === 'div'
        && node.props.className === 'bg-white border shadow-sm'
        && textContent(node).includes('Nuevos no presentes en el inventario del cliente'),
    );
    const content = textContent(section);

    expect(resultados.executiveReport.dashboard.alertas.nuevosNoPresentes).toBe(1);
    expect(content).toContain('NUEVO-AUSENTE');
    expect(content).toContain('Modelo nuevo');
    expect(content).toContain('SKULLCANDY');
    expect(content).toContain('TRUE WIRELESS');
    expect(content).toContain('2026-07-01');
    expect(content).not.toContain('REPONER');
    expect(content).toContain('Esta lista no calcula reposición');
  });

  it('explica el Porcentaje de Rotación, sus colores y los buckets EOL reales', () => {
    const tree = renderDashboard(buildResults(), { showActives: true, showKnowledge: true });
    const content = textContent(tree);

    expect(content).toContain('Porcentaje de Rotación = Ventas ÷ Inventario Inicial × 100.');
    expect(content).toContain('Verde: alta, >100%');
    expect(content).toContain('Azul: normal, 33.33%–100%');
    expect(content).toContain('Ámbar: lenta, 10%–<33.33%');
    expect(content).toContain('Rojo: crítica, <10%');
    expect(content).toContain('Gris/N/D: Inventario Inicial = 0.');
    expect(content).toContain('EOL vencido: la fecha EOL es igual o anterior a la Fecha base EOL.');
    expect(content).toContain('EOL crítico: faltan 1–27 días.');
    expect(content).toContain('EOL próximo: faltan 28–83 días.');
    expect(content).toContain('EOL planificado: faltan 84 días o más.');
    expect(content).toContain('días restantes = Fecha EOL − Fecha base EOL');
    expect(content).toContain('45 días restantes corresponde a EOL próximo');
    expect(content).toContain('no constituye comunicación de descuentos al consumidor');
  });

  it('valoriza tránsito sin decimales y diferencia A/B/C con verde, azul y rojo', () => {
    const tree = renderDashboard(buildResults());
    const transitSection = findElement(
      tree,
      (node) => node.type === 'div'
        && node.props.className === 'bg-white border shadow-sm'
        && textContent(node).includes('Inventario en tránsito'),
    );
    const classBadges = findElements(
      tree,
      (node) => node.type === 'span'
        && ['A', 'B', 'C'].includes(textContent(node))
        && node.props.style?.color === 'white',
    );

    expect(textContent(transitSection)).toContain('Valor en tránsito');
    expect(textContent(transitSection)).toContain('Total valor en tránsito');
    expect(textContent(transitSection)).toContain('$30');
    expect(textContent(transitSection)).not.toContain('$30.00');
    expect(Object.fromEntries(classBadges.map((badge) => [
      textContent(badge), badge.props.style.background,
    ]))).toEqual({ A: '#166534', B: '#1e40af', C: '#b91c1c' });
  });

  it('muestra la F4 disponible en la tabla de descuento para USA y CHINA', () => {
    const tree = renderDashboard(buildResults(), { showKnowledge: true });
    const phaseTable = findElement(
      tree,
      (node) => node.type === 'table'
        && textContent(node).includes('MarcaFaseDíasOrigenDesc.IOCARetail'),
    );
    const phase4Rows = findElements(
      phaseTable,
      (node) => node.type === 'tr' && textContent(node).includes('F4'),
    ).map(textContent);

    expect(phase4Rows).toEqual([
      'SKULLCANDYF4≥366USA15%20%80%',
      'SKULLCANDYF4≥366CHINA15%20%80%',
    ]);
  });

  it('exporta F4 USA y CHINA con descuento de 15% en Ref Tabla Fases', () => {
    xlsxHarness.sheetsByName = {};
    xlsxHarness.workbook = null;
    xlsxHarness.filename = '';
    const tree = renderDashboard(buildResults());
    const exportButton = findElement(
      tree,
      (node) => node.type === 'button' && textContent(node).includes('Exportar Excel'),
    );

    exportButton.props.onClick();

    expect(xlsxHarness.sheetsByName['Ref Tabla Fases'].filter((row) => row[1] === 4)).toEqual([
      ['SKULLCANDY', 4, 366, 'USA', 0.15, 0.2, 0.8],
      ['SKULLCANDY', 4, 366, 'CHINA', 0.15, 0.2, 0.8],
    ]);
  });

  it('exporta tránsito, reposición, nuevos no presentes y creationDate sin recalcular datasets', () => {
    xlsxHarness.sheetsByName = {};
    const resultados = buildResults();
    const tree = renderDashboard(resultados);
    const exportButton = findElement(
      tree,
      (node) => node.type === 'button' && textContent(node).includes('Exportar Excel'),
    );

    exportButton.props.onClick();

    expect(xlsxHarness.sheetsByName['Inventario en tránsito']).toContainEqual([
      'REPONER', 'Modelo recomendado', 'ACTIVO', 'BEST', 1, 10, '',
    ]);
    const replenishment = resultados.recs.find(({ sku }) => sku === 'REPONER');
    expect(xlsxHarness.sheetsByName['Reposición sugerida']).toContainEqual([
      replenishment.sku,
      replenishment.modelo,
      replenishment.marca,
      replenishment.tier,
      replenishment.invProyectado,
      replenishment.compra,
      replenishment.necesidadReposicion,
      replenishment.reposicionSugeridaBase,
      'N/D',
      null,
      'N/D',
      null,
      'SIN AJUSTE',
      null,
      replenishment.reposicionSugerida,
      replenishment.valorReposicion,
      '',
    ]);
    expect(xlsxHarness.sheetsByName['Nuevos no presentes']).toContainEqual([
      'NUEVO-AUSENTE', 'Modelo nuevo', 'SKULLCANDY', 'TRUE WIRELESS', '2026-07-01', '',
    ]);
    const completeRows = xlsxHarness.sheetsByName['Datos Completos'];
    const creationDateColumn = completeRows[0].indexOf('Fecha de creación');
    const replenishmentRow = completeRows.find((row) => row[0] === 'REPONER');
    expect(creationDateColumn).toBeGreaterThan(0);
    expect(replenishmentRow[creationDateColumn]).toBe('2026-07-15');
  });

  it('exporta hyperlinks de producto/imagen y la hoja única de definiciones reales', () => {
    xlsxHarness.sheetsByName = {};
    xlsxHarness.workbook = null;
    const tree = renderDashboard(buildProductMediaResults());
    const exportButton = findElement(
      tree,
      (node) => node.type === 'button' && textContent(node).includes('Exportar Excel'),
    );

    exportButton.props.onClick();

    const activeRows = xlsxHarness.sheetsByName.Activos;
    const skuRow = activeRows.findIndex((row) => row[0] === 'MEDIA-ACTIVO');
    const imageColumn = activeRows[0].indexOf('Imagen');
    const activeSheet = xlsxHarness.workbook.Sheets.Activos;
    const skuCell = activeSheet[XLSX.utils.encode_cell({ r: skuRow, c: 0 })];
    const imageCell = activeSheet[XLSX.utils.encode_cell({ r: skuRow, c: imageColumn })];
    const definitions = xlsxHarness.sheetsByName['Definiciones y Fórmulas'];

    expect(skuCell.l).toMatchObject({
      Target: 'https://products.example.test/media-activo',
    });
    expect(imageCell.v).toBe('Ver imagen');
    expect(imageCell.l).toMatchObject({
      Target: 'https://images.example.test/media-activo.png',
    });
    expect(definitions[0]).toEqual([
      'Indicador/Campo', 'Definición', 'Fórmula', 'Unidad', 'Fuente', 'Interpretación',
    ]);
    expect(definitions.some((row) => row[0] === 'Porcentaje de Rotación')).toBe(true);
    expect(definitions.some((row) => row[0] === 'Pedido Sugerido Final')).toBe(true);
  });

  it('reconcilia Resumen Excel con los mismos KPI y valores canónicos de UI', () => {
    xlsxHarness.sheetsByName = {};
    const resultados = buildResults();
    const tree = renderDashboard(resultados);
    const exportButton = findElement(
      tree,
      (node) => node.type === 'button' && textContent(node).includes('Exportar Excel'),
    );

    exportButton.props.onClick();
    const summary = new Map(
      xlsxHarness.sheetsByName.Resumen
        .filter((row) => row.length >= 2)
        .map((row) => [row[0], row[1]]),
    );

    expect(summary.get('Total SKUs en inventario'))
      .toBe(resultados.distribucionTier.inventario.totalSKUs);
    expect(summary.get('Total Unidades')).toBe(resultados.distribucionTier.inventario.totalU);
    expect(summary.get('SKUs Activos')).toBe(resultados.totales.skuActivos);
    expect(summary.get('Total Unidades Activas')).toBe(resultados.totales.unidadesActivas);
    expect(summary.get('SKU clasificados EOL')).toBe(resultados.totales.skuEOL);
    expect(summary.get('Unidades clasificadas EOL')).toBe(resultados.totales.unidEOL);
    expect(summary.get('SKUs sin ventas')).toBe(resultados.totales.skuSinVentas);
    expect(summary.get('Total Unidades sin ventas')).toBe(resultados.totales.unidadesSinVentas);
    expect(summary.get('SKUs Maestro')).toBe(resultados.totales.skuMaestro);
    expect(summary.get('Total Unidades Maestro')).toBe(resultados.totales.unidadesMaestro);
    expect(summary.get('Valor Total Inventario')).toBe(resultados.totales.valorTotalInventario);
    expect(summary.get('Valor Activo')).toBe(resultados.totales.valorActivo);
    expect(summary.get('Valor EOL')).toBe(resultados.totales.valorEOL);
    expect(summary.get('Valor EOL Vencido')).toBe(resultados.totales.valorEOLVencido);
    expect(summary.get('Valor EOL Futuro')).toBe(resultados.totales.valorEOLFuturo);
    expect(summary.get('Valor Sin Maestro')).toBe(resultados.totales.valorSinMaestro);
    expect(summary.get('SKUs con Pedido Sugerido Final'))
      .toBe(resultados.distribucionTier.reposicion.totalSKUs);
    expect(summary.get('Total unidades de Pedido Sugerido Final'))
      .toBe(resultados.distribucionTier.reposicion.totalU);
    expect(summary.get('Valor total Pedido Sugerido Final (USD)'))
      .toBe(resultados.alertas.totalReposicionValor);
  });

  it('mantiene CSV principal procesable y genera definiciones en archivo complementario', () => {
    const resultados = buildProductMediaResults();
    const dataCsv = buildSellThroughCsv(resultados);
    const definitionsCsv = buildDefinitionsCsv();
    const dataWorkbook = XLSX.read(dataCsv, { type: 'string' });
    const definitionsWorkbook = XLSX.read(definitionsCsv, { type: 'string' });
    const dataRows = XLSX.utils.sheet_to_json(dataWorkbook.Sheets.Sheet1, {
      header: 1,
      raw: true,
    });
    const definitionRows = XLSX.utils.sheet_to_json(definitionsWorkbook.Sheets.Sheet1, {
      header: 1,
      raw: true,
    });

    expect(dataRows[0]).toContain('Porcentaje de Rotación');
    expect(dataRows[0]).toContain('Producto URL');
    expect(dataRows[0]).toContain('Imagen URL');
    [
      'Pedido Sugerido Base', 'Aplica Master Pack', 'Cantidad Master Pack',
      'Aplica Inner Pack', 'Cantidad Inner Pack', 'Tipo Ajuste Pack',
      'Cantidad Pack Aplicada', 'Pedido Sugerido Final',
    ].forEach((header) => expect(dataRows[0]).toContain(header));
    const rotationColumn = dataRows[0].indexOf('Porcentaje de Rotación');
    expect(dataRows.find((row) => row[0] === 'MEDIA-ACTIVO')[rotationColumn]).toBe(0.5);
    expect(dataCsv).toContain('"50%"');
    expect(dataCsv).not.toMatch(/Índice de Rotación|Indice Rotacion/);
    expect(definitionRows[0]).toEqual([
      'Indicador/Campo', 'Definición', 'Fórmula', 'Unidad', 'Fuente', 'Interpretación',
    ]);
    expect(definitionRows.some((row) => row[0] === 'Porcentaje de Rotación')).toBe(true);
    expect(definitionRows.some((row) => row[0] === 'Pedido Sugerido Base')).toBe(true);
    expect(definitionRows.some((row) => row[0] === 'Pedido Sugerido Final')).toBe(true);
  });

  it('genera un XLSX que se puede releer preservando hojas, valores y formatos', () => {
    xlsxHarness.workbook = null;
    xlsxHarness.filename = '';
    const resultados = buildResults();
    const workbookResults = {
      ...resultados,
      eolFuturos: [{
        sku: 'EOL-FUTURO',
        modelo: 'Modelo futuro',
        marca: 'SKULLCANDY',
        fechaStr: '2026-10-01',
        diasDesc: -61,
        bucket: '0–90 días',
        origen: 'USA',
        costo: 10,
        invInicial: 4,
        ventas: 1,
        invFinal: 3,
        porcentajeRotacion: 25,
        valorInv: 30,
      }],
      alertas: {
        ...resultados.alertas,
        skusConMerma: [{
          sku: 'MERMA',
          modelo: 'Modelo con merma',
          marca: 'SKULLCANDY',
          estado: 'ACTIVO',
          invInicial: 10,
          compra: 0,
          ventas: 1,
          invProyectado: 9,
          invFinal: 5,
          merma: 4,
          mermaPct: 4 / 9,
          costo: 10,
        }],
        totalMermaUnid: 4,
        totalMermaValor: 40,
        skusSinOrigen: [{
          sku: 'SIN-ORIGEN',
          modelo: 'Modelo sin origen',
          estado: 'ACTIVO',
          costoUSA: 10,
          costoCHINA: 8,
        }],
      },
    };
    const tree = renderDashboard(workbookResults);
    const exportButton = findElement(
      tree,
      (node) => node.type === 'button' && textContent(node).includes('Exportar Excel'),
    );

    exportButton.props.onClick();

    const serialized = XLSX.write(xlsxHarness.workbook, { bookType: 'xlsx', type: 'array' });
    const workbook = XLSX.read(serialized, {
      type: 'array',
      cellNF: true,
      cellStyles: true,
    });
    const phaseSheet = workbook.Sheets['Ref Tabla Fases'];
    const phaseRows = XLSX.utils.sheet_to_json(phaseSheet, { header: 1, raw: true });
    const phase4RowIndexes = phaseRows
      .map((row, index) => (row[1] === 4 ? index : -1))
      .filter((index) => index >= 0);
    const summaryRows = XLSX.utils.sheet_to_json(workbook.Sheets.Resumen, {
      header: 1,
      raw: true,
    });
    const activeEolRows = XLSX.utils.sheet_to_json(workbook.Sheets['EOL Fase Activa'], {
      header: 1,
      raw: true,
    });

    expect(xlsxHarness.filename).toBe('IOCA_STI_V1_SC_2026-08-01.xlsx');
    expect(workbook.SheetNames).toEqual([
      'Resumen',
      'EOL Fase Activa',
      'EOL Por Descontinuarse',
      'Bajo Inv Seguridad V1',
      'Merma Operativa',
      'Activos',
      'Sin Maestro',
      'Sin Origen en Inv',
      'Inventario en tránsito',
      'Reposición sugerida',
      'Nuevos no presentes',
      'Datos Completos',
      'Distribución Tier',
      'Distribución Categoría',
      'Análisis Pareto ABC',
      'Definiciones y Fórmulas',
      'Ref Bucket EOL',
      'Ref Tabla Fases',
    ]);
    expect(phase4RowIndexes.map((index) => phaseRows[index])).toEqual([
      ['SKULLCANDY', 4, 366, 'USA', 0.15, 0.2, 0.8],
      ['SKULLCANDY', 4, 366, 'CHINA', 0.15, 0.2, 0.8],
    ]);
    expect(phase4RowIndexes.map((index) => phaseSheet[`E${index + 1}`].z)).toEqual(['0%', '0%']);
    expect(phaseSheet['!cols'].map(({ wch }) => wch)).toEqual([14, 8, 11, 9, 18, 14, 14]);
    expect(summaryRows.find((row) => row[0] === 'Fórmula aplicada')?.[1]).toBeTruthy();
    expect(summaryRows.find((row) => row[0] === 'Total Unidades')?.[1]).toBe(37);
    expect(summaryRows.find((row) => row[0] === 'SKU clasificados EOL')?.[1]).toBe(1);
    expect(summaryRows.find((row) => row[0] === 'Unidades clasificadas EOL')?.[1]).toBe(12);
    expect(activeEolRows.find((row) => row[0] === 'EOL-SIN-REPOSICION')?.[3])
      .toBe('2025-01-01');
  });
});
