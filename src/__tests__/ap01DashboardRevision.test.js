import { describe, expect, it, vi } from 'vitest';

const stateHarness = vi.hoisted(() => ({
  overrides: {},
  values: [],
  nextIndex: 0,
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

import App from '../App.jsx';
import { processSellThrough } from '../application/sellThroughApplicationService.js';
import { createSellThroughRepository } from '../repositories/sellThroughRepository.js';

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
      'SKU\tMODELO\tESTADO\tFECHA EOL\tUSA',
      'REPONER\tModelo recomendado\tACTIVO\t-\t10',
      'SIN-REPOSICION\tModelo cubierto\tACTIVO\t-\t10',
      'EOL-SIN-REPOSICION\tModelo EOL\tEOL\t2025-01-01\t10',
    ].join('\n'),
    rawInventario: [
      'SKU\tTIER\tORIGEN\tINV SEGURIDAD\tINV PROYECTADO\tINV FINAL',
      'REPONER\tBEST\tUSA\t10\t2\t2',
      'SIN-REPOSICION\tGOOD\tUSA\t1\t2\t2',
      'EOL-SIN-REPOSICION\tBEST\tUSA\t10\t1\t1',
      'SIN-MAESTRO\tGOOD\tUSA\t1\t1\t3',
    ].join('\n'),
    config: CONFIG,
  });
  const execution = processSellThrough(repository);
  if (execution.error) throw new Error(execution.error);
  return execution.resultados;
};

const renderDashboard = (resultados) => {
  stateHarness.overrides = { 2: resultados, 6: 'dashboard' };
  stateHarness.values = [];
  stateHarness.nextIndex = 0;
  return App();
};

describe('AP01 — presentación del Dashboard', () => {
  it('consolida Executive Summary y elimina las secciones independientes aprobadas', () => {
    const tree = renderDashboard(buildResults());
    const executiveSection = findElement(
      tree,
      (node) => node.type === 'section' && textContent(node).includes('Executive Dashboard'),
    );
    const content = textContent(executiveSection);

    expect(content).toContain('SKU EOL');
    expect(content).not.toContain('SKU Vencidos');
    expect(content).toContain('SKU Sin Maestro');
    expect(content).toContain('Valor Inventario Total');
    expect(content).toContain('Valor Inventario SKU Activos');
    expect(content).toContain('Valor Inventario EOL');
    expect(content).toContain('Valor Inventario Sin Maestro');
    expect(content).toContain('Merma');
    expect(content).toContain('Ventas Pareto A');
    expect(content).toContain('Reposición');
    expect(content).not.toContain('KPIs ejecutivos');
    expect(content).not.toContain('Valorización del inventario');
    expect(content).not.toContain('Totales');
  });

  it('muestra Mix Balanceado con SKU/unidades y solo reposiciones mayores que cero', () => {
    const resultados = buildResults();
    const tree = renderDashboard(resultados);
    const mixCards = findElements(
      tree,
      (node) => node.props?.label === 'Cantidad de SKU'
        || node.props?.label === 'Cantidad de Unidades',
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
    const eolPosition = dashboardContent.indexOf('SKUs EOL', replenishmentPosition);

    expect(mixCards.map(({ props }) => [props.label, props.value])).toEqual([
      ['Cantidad de SKU', resultados.distribucionTier.inventario.totalSKUs],
      ['Cantidad de Unidades', resultados.distribucionTier.inventario.totalU],
    ]);
    expect(replenishmentContent).toContain('REPONER');
    expect(replenishmentContent).toContain('Modelo recomendado');
    expect(replenishmentContent).not.toContain('SIN-REPOSICION');
    expect(replenishmentContent).not.toContain('EOL-SIN-REPOSICION');
    expect(replenishmentPosition).toBeGreaterThanOrEqual(0);
    expect(eolPosition).toBeGreaterThan(replenishmentPosition);
    expect(dashboardContent).not.toContain('SKUs EOL ya descontinuados — con fase activa');
  });
});
