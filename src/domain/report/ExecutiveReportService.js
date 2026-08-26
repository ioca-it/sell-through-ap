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
    distribucionTier,
    semanasPeriodoUsadas,
  } = portfolioAnalysis;

  // Inventario Actual del Cliente es un único universo canónico (Inventario
  // Final > 0) ya calculado por distribucionTier.inventario. Reutilizarlo aquí
  // evita que Executive Summary muestre un SKU/valor distinto del que ya
  // presenta Resumen Ejecutivo y Distribución por Tier para el mismo concepto.
  const inventarioActual = distribucionTier.inventario;

  const executiveSummary = {
    fechaCalculo,
    periodoAnalizado: configSnapshot.periodoAnalizado,
    totalSKUs: inventarioActual.totalSKUs,
    activos: totales.activos,
    eolVencidos: totales.eolVencidos,
    eolFuturos: totales.eolFuturos,
    sinMaestro: totales.sinMaestro,
    totalUnidades: inventarioActual.totalU,
    skuActivos: totales.skuActivos,
    unidadesActivas: totales.unidadesActivas,
    skuVencidos: totales.skuVencidos,
    unidadesVencidas: totales.unidadesVencidas,
    skuEOL: totales.skuEOL,
    unidadesEOL: totales.unidEOL,
    skuPorVencer: totales.skuPorVencer,
    unidadesPorVencer: totales.unidadesPorVencer,
    skuSinVentas: totales.skuSinVentas,
    unidadesSinVentas: totales.unidadesSinVentas,
    valorInventarioSinVentas: totales.valorInventarioSinVentas,
    skuMaestro: totales.skuMaestro,
    unidadesMaestro: totales.unidadesMaestro,
    skuSinMaestro: totales.sinMaestro,
    unidadesSinMaestro: totales.unidadesSinMaestro,
    // Inventario Actual del Cliente (mismo universo/dataset que Resumen
    // Ejecutivo y Distribución por Tier); no confundir con BR-015 "Valor Total
    // Inventario" (suma sobre todos los registros analizados), que
    // `valorizacion.valorTotalInventario` conserva sin cambios más abajo.
    valorTotalInventario: inventarioActual.totalV,
    valorActivo: totales.valorActivo,
    valorEOL: totales.valorEOL,
    valorEOLVencido: totales.valorEOLVencido,
    valorEOLFuturo: totales.valorEOLFuturo,
    valorSinMaestro: totales.valorSinMaestro,
  };

  const kpis = {
    valorEOL: totales.valorEOL,
    valorEOLVencido: totales.valorEOLVencido,
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
    totalUnidades: totales.totalUnidades,
    unidadesActivas: totales.unidadesActivas,
    unidadesVencidas: totales.unidadesVencidas,
    unidadesPorVencer: totales.unidadesPorVencer,
    unidadesMaestro: totales.unidadesMaestro,
  };

  const valorizacion = {
    valorTotalInventario: totales.valorTotalInventario,
    valorActivo: totales.valorActivo,
    valorEOL: totales.valorEOL,
    valorEOLFuturo: totales.valorEOLFuturo,
    valorSinMaestro: totales.valorSinMaestro,
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
      unidadesSinOrigen: alertas.unidadesSinOrigen,
      unidadesConMerma: alertas.totalMermaUnid,
      unidadesEnQuiebre: alertas.unidadesEnQuiebre,
      unidadesQuiebreActivos: alertas.unidadesQuiebreActivos,
      unidadesQuiebreEOL: alertas.unidadesQuiebreEOL,
      nuevosNoPresentes: alertas.productosNuevosNoPresentes.length,
      totalUnidadesTransito: alertas.totalUnidadesTransito,
      totalValorTransito: alertas.totalValorTransito,
      skusEnTransito: alertas.productosEnTransito.length,
    },
    pareto: {
      totalSkusConVentas: analisisPareto.totalSkusConVentas,
      pctSKUsA: analisisPareto.pctSKUsA,
      pctVentasA: analisisPareto.pctVentasA,
      skusPocosVitales: analisisPareto.skusParetoA.length,
      skusColaLarga: analisisPareto.skusColaLarga.length,
      unidadesPocosVitales: analisisPareto.ventasA,
      unidadesColaLarga: analisisPareto.ventasB + analisisPareto.ventasC,
      totalUnidadesConVentas: analisisPareto.totalVentas,
      pctVentasColaLarga: analisisPareto.pctVentasColaLarga,
      interpretacion: { ...analisisPareto.interpretacion },
    },
  };

  return freezeReport({
    executiveSummary,
    kpis,
    valorizacion,
    totales: { ...totales },
    indicadoresGenerales,
    dashboard,
  });
};

export const ExecutiveReportService = Object.freeze({
  buildExecutiveReport,
});
