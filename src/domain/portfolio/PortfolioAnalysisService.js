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

  return freezeOwnedStructure({
    recs: ownedRecords,
    eolVencidos,
    eolFuturos,
    activos,
    sinMaestro,
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
  } = cloneStructure(consolidation);

  // Distribution y Pareto llegan desde Application Service. Se copian antes de
  // integrarse para que su congelación no alcance referencias del llamador.
  const ownedDistribucionTier = cloneStructure(distribucionTier);
  const ownedDistribucionCategoria = cloneStructure(distribucionCategoria);
  const ownedAnalisisPareto = cloneStructure(analisisPareto);

  const totalUnidEOL = eolVencidos.reduce((sum, record) => sum + record.invFinal, 0);
  const totalValorEOL = eolVencidos.reduce((sum, record) => sum + record.valorInv, 0);
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
  const quiebreActivos = skusEnQuiebre.filter((record) => record.estado === 'ACTIVO').length;
  const quiebreEOL = skusEnQuiebre.filter((record) => record.estado === 'EOL').length;
  const totalReposicionUnid = activos.reduce(
    (sum, record) => sum + record.reposicionSugerida,
    0,
  );
  const totalReposicionValor = activos.reduce(
    (sum, record) => sum + record.valorReposicion,
    0,
  );

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
      quiebreActivos,
      quiebreEOL,
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
      unidEOL: totalUnidEOL,
      valorEOL: totalValorEOL,
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
