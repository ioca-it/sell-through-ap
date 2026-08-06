// =============================================================================
// Propósito: construir el DTO mínimo del Executive Report para presentación.
// Responsabilidad: seleccionar resumen ejecutivo, KPIs, totales, indicadores y
// resumen de dashboard desde el DTO inmutable de PortfolioAnalysisService.
// Entrada: un Portfolio Analysis DTO ya consolidado y validado.
// Salida: un DTO de reporte inmutable, sin records ni reglas de presentación UI.
// Dependencias: ninguna; no accede a React, UI, Repository, Provider o fuentes.
// AI-First: contrato pequeño, determinista y explícito para consumidores futuros.
// Evolución: Executive Report completo y Recommendation Engine requerirán contratos
// separados; este MVP no crea hallazgos, recomendaciones, Pareto o Distribution.
// =============================================================================

const freezeReport = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach((entry) => freezeReport(entry));
    Object.freeze(value);
  }
  return value;
};

// Selecciona únicamente valores ya calculados por PortfolioAnalysisService.
const buildExecutiveReport = (portfolioAnalysis) => {
  const {
    fechaCalculo,
    configSnapshot,
    analisisPareto,
    alertas,
    totales,
    semanasPeriodoUsadas,
  } = portfolioAnalysis;

  const executiveSummary = {
    fechaCalculo,
    periodoAnalizado: configSnapshot.periodoAnalizado,
    totalSKUs: totales.totalSKUs,
    activos: totales.activos,
    eolVencidos: totales.eolVencidos,
    eolFuturos: totales.eolFuturos,
    sinMaestro: totales.sinMaestro,
  };

  const kpis = {
    valorEOL: totales.valorEOL,
    unidEOL: totales.unidEOL,
    totalReposicionUnid: alertas.totalReposicionUnid,
    totalReposicionValor: alertas.totalReposicionValor,
    totalMermaUnid: alertas.totalMermaUnid,
    totalMermaValor: alertas.totalMermaValor,
    quiebreActivos: alertas.quiebreActivos,
    quiebreEOL: alertas.quiebreEOL,
    totalSkusConVentas: analisisPareto.totalSkusConVentas,
    pctSKUsA: analisisPareto.pctSKUsA,
    pctVentasA: analisisPareto.pctVentasA,
  };

  const indicadoresGenerales = {
    semanasPeriodoUsadas,
    umbralMermaPct: alertas.umbralMermaPct,
    interpretacionPareto: { ...analisisPareto.interpretacion },
  };

  const dashboard = {
    alertas: {
      skusSinOrigen: alertas.skusSinOrigen.length,
      skusConMerma: alertas.skusConMerma.length,
      skusEnQuiebre: alertas.skusEnQuiebre.length,
      quiebreActivos: alertas.quiebreActivos,
      quiebreEOL: alertas.quiebreEOL,
    },
    pareto: {
      totalSkusConVentas: analisisPareto.totalSkusConVentas,
      pctSKUsA: analisisPareto.pctSKUsA,
      pctVentasA: analisisPareto.pctVentasA,
      interpretacion: { ...analisisPareto.interpretacion },
    },
  };

  return freezeReport({
    executiveSummary,
    kpis,
    totales: { ...totales },
    indicadoresGenerales,
    dashboard,
  });
};

export const ExecutiveReportService = Object.freeze({
  buildExecutiveReport,
});
