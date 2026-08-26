import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DefinitionLegend } from '../DefinitionLegend.jsx';
import {
  DEFINITION_GROUPS,
  getMetricDefinitions,
} from '../../presentation/metricDefinitions.js';

describe('DefinitionLegend', () => {
  it('explica todas las columnas del comparativo de Inventario Seguridad IOCA', () => {
    const markup = renderToStaticMarkup(
      <DefinitionLegend ids={DEFINITION_GROUPS.safety} expanded />,
    );

    [
      'SKU', 'Modelo', 'Estado', 'Origen', 'Inv. Seg. Cliente', 'Inv. Seg. IOCA',
      'Δ IOCA-Cliente', 'Fuente', 'Inventario Proyectado', 'Compra / Tránsito',
      'Necesidad', 'Pedido Sugerido Base', 'Master Pack', 'Inner Pack',
      'Pedido Sugerido Final', 'Acción Sugerida',
    ].forEach((label) => expect(markup).toContain(label));
    expect(markup).toContain('MAX(0, Inv. Seg. IOCA − Inventario Final)');
    expect(markup).toContain('MAX(0, Necesidad − Compra)');
    expect(markup).toContain('Definición');
    expect(markup).toContain('Unidad');
    expect(markup).toContain('Fórmula');
    expect(markup).toContain('Fuente');
    expect(markup).toContain('Interpretación');
  });

  it('describe el universo EOL, fecha, días, fase, recomendación, rotación y valor reales', () => {
    const definitions = Object.fromEntries(
      getMetricDefinitions(DEFINITION_GROUPS.eol).map((definition) => [definition.id, definition]),
    );

    expect(Object.values(definitions).map(({ name }) => name)).toEqual([
      'SKU EOL',
      'SKU EOL que aplica regla de descuento',
      'EOL — Inventario mínimo para aplicar descuento',
      'Fecha EOL',
      'Días EOL',
      'Fase EOL',
      'Recomendación EOL',
      'Porcentaje de Rotación',
      'Valor Inventario',
    ]);
    expect(definitions.eolDefined).toMatchObject({
      definition: 'SKU clasificado como EOL en Product Master.',
      unit: 'SKU',
      source: 'Product Master',
    });
    expect(definitions.eolDefined.interpretation).toContain('puede incluir SKU sin Fecha EOL válida');
    expect(definitions.eolDiscountApplicable.formula)
      .toBe('Estado = EOL e Inventario Final ≥ EOL_DISCOUNT_MIN_INVENTORY (12 unidades) y Descuento consumidor > 0%.');
    expect(definitions.eolDiscountMinInventory).toMatchObject({
      unit: 'unidades',
      source: 'Regla de negocio EOL',
    });
    expect(definitions.eolDiscountMinInventory.interpretation).toContain('Candidato futuro a Configuration Center');
    expect(definitions.eolDate.interpretation).toContain('permite calcular Días EOL y Fase EOL');
    expect(definitions.eolDays.formula).toBe('Fecha EOL − Fecha base EOL.');
    expect(definitions.eolDays.interpretation).toContain('≤ 0 = vencido; > 0 = días restantes');
    expect(definitions.eolBucket.formula).toContain('CRÍTICO: 1–27 días');
    expect(definitions.eolBucket.formula).toContain('PRÓXIMO: 28–83 días');
    expect(definitions.eolBucket.formula).toContain('PLANIFICADO: 84+ días');
    expect(definitions.eolBucket.interpretation).toContain('Sin fecha EOL');
    expect(definitions.eolRecommendation.definition).toContain('Fase EOL, Pareto y reglas vigentes');
    expect(definitions.eolRecommendation.interpretation).toBe('EOL mantiene prioridad sobre la reposición normal.');
    expect(definitions.rotationPercentage.formula)
      .toBe('Ventas en unidades del período ÷ Inventario inicial en unidades del período × 100.');
    expect(definitions.rotationPercentage.interpretation).toContain('Inventario inicial = 0: N/D');
    expect(definitions.inventoryValue.formula).toContain('USA → priceUSA; CHINA → priceChina');
    expect(definitions.inventoryValue.interpretation).toContain('Precio 0 produce $0 real');
    expect(definitions.inventoryValue.interpretation).toContain('precio ausente produce N/D');
  });
});
