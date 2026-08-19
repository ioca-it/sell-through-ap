import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DefinitionLegend } from '../DefinitionLegend.jsx';
import { DEFINITION_GROUPS } from '../../presentation/metricDefinitions.js';

describe('DefinitionLegend', () => {
  it('explica todas las columnas del comparativo de Inventario Seguridad IOCA', () => {
    const markup = renderToStaticMarkup(
      <DefinitionLegend ids={DEFINITION_GROUPS.safety} expanded />,
    );

    [
      'SKU', 'Modelo', 'Estado', 'Origen', 'Inv. Seg. Cliente', 'Inv. Seg. IOCA',
      'Δ IOCA-Cliente', 'Fuente', 'Inventario Proyectado', 'Compra / Tránsito',
      'Necesidad', 'Reposición Final', 'Acción Sugerida',
    ].forEach((label) => expect(markup).toContain(label));
    expect(markup).toContain('MAX(0, Inv. Seg. IOCA − Inventario Final)');
    expect(markup).toContain('MAX(0, Necesidad − Compra)');
    expect(markup).toContain('Definición');
    expect(markup).toContain('Unidad');
    expect(markup).toContain('Fórmula');
    expect(markup).toContain('Fuente');
    expect(markup).toContain('Interpretación');
  });
});
