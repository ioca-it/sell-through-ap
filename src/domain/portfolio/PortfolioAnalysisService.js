// =============================================================================
// Propósito: consolidar y analizar el portafolio a partir de records ya procesados.
// Responsabilidades: clasificar records, calcular alertas/totales y construir el
// contrato final inmutable que consume el resto del sistema.
// Entradas: records ensamblados, configuración validada, parámetros institucionales
// y resultados ya calculados de Distribution y Pareto.
// Salidas: consolidación intermedia y análisis final profundamente inmutables.
// Dependencias: únicamente el cálculo puro de semanas del Inventory Engine; no usa
// React, UI, Repository, Provider, datos.json, persistencia ni asincronía.
// AI-First: ofrece fronteras explícitas y deterministas para inspección y evolución.
// Inmutabilidad: nunca congela referencias recibidas; clona sus contenedores antes
// de incorporarlos y congela únicamente nodos creados dentro de este servicio.
// Evolución: Executive Report y Recommendation Engine podrán consumir el contrato
// final sin incorporar sus reglas dentro de este servicio.
// =============================================================================

import { obtenerSemanasPeriodo } from '../inventory/inventoryEngine.js';

const cloneStructure = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneStructure(entry));
  }
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cloneStructure(entry)]),
    );
  }
  return value;
};

// Congela únicamente contenedores creados por cloneStructure o por este servicio.
const freezeOwnedStructure = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach((entry) => freezeOwnedStructure(entry));
    Object.freeze(value);
  }
  return value;
};

// Conserva las clasificaciones y ordenamientos caracterizados antes de calcular
// Distribution o Pareto, que permanecen fuera de este servicio por decisión expresa.
const consolidateRecords = (records) => {
  // Cada record y su contenedor son propios antes de cualquier congelación.
  const ownedRecords = cloneStructure(records);
  const eolVencidos = ownedRecords.filter((record) =>
    record.estado === 'EOL' && record.diasDesc !== null && record.diasDesc >= 0
  ).sort((a, b) => b.diasDesc - a.diasDesc || b.descUSD - a.descUSD);
  const eolFuturos = ownedRecords.filter((record) =>
    record.estado === 'EOL' && record.diasDesc !== null && record.diasDesc < 0
  ).sort((a, b) => b.diasDesc - a.diasDesc);
  const activos = ownedRecords.filter((record) => record.estado === 'ACTIVO')
    .sort((a, b) => b.valorInv - a.valorInv);
  const sinMaestro = ownedRecords.filter((record) => record.estado === 'SIN MAESTRO');
  const skusActivos = ownedRecords.filter((record) =>
    record.clasificacionTemporal === 'ACTIVO'
  );
  const skusVencidos = ownedRecords.filter((record) =>
    record.clasificacionTemporal === 'VENCIDO'
  );
  const skusPorVencer = ownedRecords.filter((record) =>
    record.clasificacionTemporal === 'POR VENCER'
  );
  const skusMaestro = ownedRecords.filter((record) => record.estado !== 'SIN MAESTRO');

  return freezeOwnedStructure({
    recs: ownedRecords,
    eolVencidos,
    eolFuturos,
    activos,
    sinMaestro,
    skusActivos,
    skusVencidos,
    skusPorVencer,
    skusMaestro,
  });
};

// Integra exclusivamente métricas generales y extensiones ya calculadas. Executive
// Report, Recommendation Engine, Distribution y Pareto no se implementan aquí.
const analyzePortfolio = ({
  consolidation,
  fechaCalculo,
  config,
  umbralMermaPct,
  semanasPorPeriodo,
  distribucionTier,
  distribucionCategoria,
  analisisPareto,
}) => {
  const {
    recs,
    eolVencidos,
    eolFuturos,
    activos,
    sinMaestro,
    skusActivos,
    skusVencidos,
    skusPorVencer,
    skusMaestro,
  } = cloneStructure(consolidation);

  // Distribution y Pareto llegan desde Application Service. Se copian antes de
  // integrarse para que su congelación no alcance referencias del llamador.
  const ownedDistribucionTier = cloneStructure(distribucionTier);
  const ownedDistribucionCategoria = cloneStructure(distribucionCategoria);
  const ownedAnalisisPareto = cloneStructure(analisisPareto);

  const totalUnidEOL = eolVencidos.reduce((sum, record) => sum + record.invFinal, 0);
  const totalValorEOL = recs.filter((record) =>
    record.estado === 'EOL' && !(record.diasDesc !== null && record.diasDesc < 0)
  ).reduce((sum, record) => sum + record.valorInv, 0);
  const totalDescEOL = eolVencidos.reduce((sum, record) => sum + record.descTotal, 0);
  const totalIOAEOL = eolVencidos.reduce((sum, record) => sum + record.ioaTotal, 0);
  const totalRetailEOL = eolVencidos.reduce((sum, record) => sum + record.retailTotal, 0);

  const skusSinOrigen = recs.filter((record) =>
    record.sinOrigenInv && record.estado !== 'SIN MAESTRO'
  );
  const skusConMerma = recs.filter((record) => record.alertaMerma);
  const totalMermaUnid = skusConMerma.reduce((sum, record) => sum + record.merma, 0);
  const totalMermaValor = skusConMerma.reduce(
    (sum, record) => sum + record.merma * record.costo,
    0,
  );
  const skusEnQuiebre = recs.filter((record) => record.alertaQuiebre);
  const skusEnQuiebreActivos = skusEnQuiebre.filter((record) => record.estado === 'ACTIVO');
  const skusEnQuiebreEOL = skusEnQuiebre.filter((record) => record.estado === 'EOL');
  const quiebreActivos = skusEnQuiebreActivos.length;
  const quiebreEOL = skusEnQuiebreEOL.length;
  const productosSinRotacion = recs.filter((record) => record.ventas === 0);

  const transitoPorSku = new Map();
  recs.filter((record) => record.compra > 0).forEach((record) => {
    const existente = transitoPorSku.get(record.sku);
    if (existente) {
      existente.unidadesEnTransito += record.compra;
      return;
    }
    transitoPorSku.set(record.sku, {
      sku: record.sku,
      modelo: record.modelo,
      estado: record.estado,
      tier: record.tier,
      unidadesEnTransito: record.compra,
    });
  });
  const productosEnTransito = Array.from(transitoPorSku.values());
  const totalUnidadesTransito = productosEnTransito.reduce(
    (sum, record) => sum + record.unidadesEnTransito,
    0,
  );
  const totalReposicionUnid = activos.reduce(
    (sum, record) => sum + record.reposicionSugerida,
    0,
  );
  const totalReposicionValor = activos.reduce(
    (sum, record) => sum + record.valorReposicion,
    0,
  );
  const totalUnidades = recs.reduce((sum, record) => sum + record.invFinal, 0);
  const unidadesActivas = skusActivos.reduce((sum, record) => sum + record.invFinal, 0);
  const unidadesVencidas = skusVencidos.reduce((sum, record) => sum + record.invFinal, 0);
  const unidadesPorVencer = skusPorVencer.reduce((sum, record) => sum + record.invFinal, 0);
  const unidadesMaestro = skusMaestro.reduce((sum, record) => sum + record.invFinal, 0);
  const valorActivo = activos.reduce((sum, record) => sum + record.valorInv, 0);
  const valorEOLFuturo = eolFuturos.reduce((sum, record) => sum + record.valorInv, 0);
  const valorSinMaestro = sinMaestro.reduce((sum, record) => sum + record.valorInv, 0);
  const valorTotalInventario = valorActivo
    + totalValorEOL
    + valorEOLFuturo
    + valorSinMaestro;

  const semanasPeriodoUsadas = obtenerSemanasPeriodo(
    config.periodoAnalizado,
    config.semanasPersonalizadas,
    semanasPorPeriodo,
  );

  return freezeOwnedStructure({
    fechaCalculo,
    recs,
    eolVencidos,
    eolFuturos,
    activos,
    sinMaestro,
    distribucionTier: ownedDistribucionTier,
    distribucionCategoria: ownedDistribucionCategoria,
    analisisPareto: ownedAnalisisPareto,
    semanasPeriodoUsadas,
    configSnapshot: {
      periodoAnalizado: config.periodoAnalizado,
      semanasPeriodo: semanasPeriodoUsadas,
      safetyStockSemanas: config.safetyStockSemanas,
      leadTimeUSA: config.leadTimeUSA,
      leadTimeCHINA: config.leadTimeCHINA,
    },
    alertas: {
      skusSinOrigen,
      skusConMerma,
      totalMermaUnid,
      totalMermaValor,
      skusEnQuiebre,
      skusEnQuiebreActivos,
      skusEnQuiebreEOL,
      quiebreActivos,
      quiebreEOL,
      productosSinRotacion,
      productosEnTransito,
      totalUnidadesTransito,
      totalReposicionUnid,
      totalReposicionValor,
      umbralMermaPct,
    },
    totales: {
      totalSKUs: recs.length,
      activos: activos.length,
      eolVencidos: eolVencidos.length,
      eolFuturos: eolFuturos.length,
      sinMaestro: sinMaestro.length,
      skuActivos: skusActivos.length,
      skuVencidos: skusVencidos.length,
      skuPorVencer: skusPorVencer.length,
      skuMaestro: skusMaestro.length,
      totalUnidades,
      unidadesActivas,
      unidadesVencidas,
      unidadesPorVencer,
      unidadesMaestro,
      unidEOL: totalUnidEOL,
      valorActivo,
      valorEOL: totalValorEOL,
      valorEOLFuturo,
      valorSinMaestro,
      valorTotalInventario,
      pctValorEOL: valorTotalInventario > 0
        ? (totalValorEOL / valorTotalInventario) * 100
        : 0,
      descEOL: totalDescEOL,
      ioaEOL: totalIOAEOL,
      retailEOL: totalRetailEOL,
    },
  });
};

export const PortfolioAnalysisService = Object.freeze({
  consolidateRecords,
  analyzePortfolio,
});
