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
import {
  isAvailablePrice,
  multiplyPrice,
  sumPriceValues,
} from '../product/product.js';

const compareNullableMoneyDescending = (left, right) => {
  if (isAvailablePrice(left) && isAvailablePrice(right)) return right - left;
  if (isAvailablePrice(left)) return -1;
  if (isAvailablePrice(right)) return 1;
  return 0;
};

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
  ).sort((a, b) => (
    b.diasDesc - a.diasDesc
    || compareNullableMoneyDescending(a.descUSD, b.descUSD)
  ));
  const eolFuturos = ownedRecords.filter((record) =>
    record.estado === 'EOL' && record.diasDesc !== null && record.diasDesc < 0
  ).sort((a, b) => b.diasDesc - a.diasDesc);
  const eolTodos = ownedRecords.filter((record) => record.estado === 'EOL');
  const eolConDescuentoAplicable = eolTodos.filter((record) => (
    Number.isFinite(record.invFinal)
    && record.invFinal > 0
    && Number.isFinite(record.descPct)
    && record.descPct > 0
  ));
  const eolSinFecha = eolTodos.filter((record) => record.diasDesc === null);
  const activos = ownedRecords.filter((record) => record.estado === 'ACTIVO')
    .sort((a, b) => compareNullableMoneyDescending(a.valorInv, b.valorInv));
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
    eolTodos,
    eolConDescuentoAplicable,
    eolSinFecha,
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
  newProductsMissingInventory = [],
}) => {
  const {
    recs,
    eolVencidos,
    eolFuturos,
    eolTodos,
    eolConDescuentoAplicable,
    eolSinFecha,
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
  const ownedNewProductsMissingInventory = cloneStructure(newProductsMissingInventory);

  const totalUnidEOL = eolTodos.reduce((sum, record) => sum + record.invFinal, 0);
  const totalUnidEOLVencido = eolVencidos.reduce(
    (sum, record) => sum + record.invFinal,
    0,
  );
  const totalValorEOL = sumPriceValues(eolTodos.map((record) => record.valorInv));
  const totalUnidEOLConDescuento = eolConDescuentoAplicable.reduce(
    (sum, record) => sum + record.invFinal,
    0,
  );
  const totalValorEOLConDescuento = sumPriceValues(
    eolConDescuentoAplicable.map((record) => record.valorInv),
  );
  const totalDescuentoEOLAplicable = sumPriceValues(
    eolConDescuentoAplicable.map((record) => record.descTotal),
  );
  const totalValorEOLVencido = sumPriceValues(
    eolVencidos.map((record) => record.valorInv),
  );
  const totalDescEOL = sumPriceValues(eolVencidos.map((record) => record.descTotal));
  const totalIOAEOL = sumPriceValues(eolVencidos.map((record) => record.ioaTotal));
  const totalRetailEOL = sumPriceValues(eolVencidos.map((record) => record.retailTotal));

  const skusSinOrigen = recs.filter((record) =>
    record.sinOrigenInv && record.estado !== 'SIN MAESTRO'
  );
  const skusConMerma = recs.filter((record) => record.alertaMerma);
  const totalMermaUnid = skusConMerma.reduce((sum, record) => sum + record.merma, 0);
  const totalMermaValor = sumPriceValues(
    skusConMerma.map((record) => multiplyPrice(record.costo, record.merma)),
  );
  const todosSkusEnQuiebre = recs.filter((record) => record.alertaQuiebre);
  const skusEnQuiebreActivos = todosSkusEnQuiebre.filter(
    (record) => record.estado === 'ACTIVO',
  );
  const skusEnQuiebreEOL = todosSkusEnQuiebre.filter((record) => record.estado === 'EOL');
  // Las alertas y tablas de bajo inventario exponen solo ACTIVO. Los EOL se
  // conservan internamente para consumidores no operativos y no cambian el Engine.
  const skusEnQuiebre = skusEnQuiebreActivos;
  const quiebreActivos = skusEnQuiebreActivos.length;
  const quiebreEOL = skusEnQuiebreEOL.length;
  const unidadesSinOrigen = skusSinOrigen.reduce((sum, record) => sum + record.invFinal, 0);
  const unidadesEnQuiebre = skusEnQuiebreActivos.reduce(
    (sum, record) => sum + record.invFinal,
    0,
  );
  const unidadesQuiebreActivos = skusEnQuiebreActivos.reduce(
    (sum, record) => sum + record.invFinal,
    0,
  );
  const unidadesQuiebreEOL = skusEnQuiebreEOL.reduce(
    (sum, record) => sum + record.invFinal,
    0,
  );
  const productosSinRotacion = recs.filter((record) => record.ventas === 0);
  const unidadesSinVentas = productosSinRotacion.reduce(
    (sum, record) => sum + record.invFinal,
    0,
  );
  const valorInventarioSinVentas = sumPriceValues(
    productosSinRotacion.map((record) => record.valorInv),
  );

  const transitoPorSku = new Map();
  recs.filter((record) => record.compra > 0).forEach((record) => {
    const valorEnTransito = multiplyPrice(record.costo, record.compra);
    const existente = transitoPorSku.get(record.sku);
    if (existente) {
      existente.unidadesEnTransito += record.compra;
      existente.valorEnTransito = sumPriceValues([
        existente.valorEnTransito,
        valorEnTransito,
      ]);
      return;
    }
    transitoPorSku.set(record.sku, {
      sku: record.sku,
      modelo: record.modelo,
      estado: record.estado,
      tier: record.tier,
      imageUrl: record.imageUrl,
      productUrl: record.productUrl,
      unidadesEnTransito: record.compra,
      valorEnTransito,
    });
  });
  const productosEnTransito = Array.from(transitoPorSku.values());
  const totalUnidadesTransito = productosEnTransito.reduce(
    (sum, record) => sum + record.unidadesEnTransito,
    0,
  );
  // La totalización conserva la valorización ya calculada por SKU con el costo
  // aplicable vigente; no selecciona ni inventa un precio alternativo.
  const totalValorTransito = sumPriceValues(
    productosEnTransito.map((record) => record.valorEnTransito),
  );
  const productosReposicionSugerida = activos.filter(
    (record) => record.reposicionSugerida > 0,
  );
  const totalReposicionUnid = productosReposicionSugerida.reduce(
    (sum, record) => sum + record.reposicionSugerida,
    0,
  );
  const totalReposicionValor = sumPriceValues(
    productosReposicionSugerida.map((record) => record.valorReposicion),
  );
  const totalUnidades = recs.reduce((sum, record) => sum + record.invFinal, 0);
  const unidadesActivas = skusActivos.reduce((sum, record) => sum + record.invFinal, 0);
  const unidadesVencidas = skusVencidos.reduce((sum, record) => sum + record.invFinal, 0);
  const unidadesPorVencer = skusPorVencer.reduce((sum, record) => sum + record.invFinal, 0);
  const unidadesMaestro = skusMaestro.reduce((sum, record) => sum + record.invFinal, 0);
  const unidadesSinMaestro = sinMaestro.reduce((sum, record) => sum + record.invFinal, 0);
  const valorActivo = sumPriceValues(activos.map((record) => record.valorInv));
  const valorEOLFuturo = sumPriceValues(eolFuturos.map((record) => record.valorInv));
  const valorEOLSinFecha = sumPriceValues(eolSinFecha.map((record) => record.valorInv));
  const valorSinMaestro = sumPriceValues(sinMaestro.map((record) => record.valorInv));
  // Opti ChatGPT: totalizar filas evita sumar segmentos derivados que puedan
  // superponerse y conserva solo los valores SKU realmente calculables.
  const valorTotalInventario = sumPriceValues(recs.map((record) => record.valorInv));

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
    eolTodos,
    eolConDescuentoAplicable,
    eolSinFecha,
    activos,
    sinMaestro,
    distribucionTier: ownedDistribucionTier,
    distribucionCategoria: ownedDistribucionCategoria,
    analisisPareto: ownedAnalisisPareto,
    newProductsMissingInventory: ownedNewProductsMissingInventory,
    productosReposicionSugerida,
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
      unidadesSinOrigen,
      unidadesEnQuiebre,
      unidadesQuiebreActivos,
      unidadesQuiebreEOL,
      productosSinRotacion,
      unidadesSinVentas,
      valorInventarioSinVentas,
      productosNuevosNoPresentes: ownedNewProductsMissingInventory,
      productosEnTransito,
      totalUnidadesTransito,
      totalValorTransito,
      totalReposicionUnid,
      totalReposicionValor,
      umbralMermaPct,
    },
    totales: {
      totalSKUs: recs.length,
      activos: activos.length,
      eolVencidos: eolVencidos.length,
      eolFuturos: eolFuturos.length,
      eolSinFecha: eolSinFecha.length,
      skuEOL: eolTodos.length,
      skuEOLConDescuento: eolConDescuentoAplicable.length,
      sinMaestro: sinMaestro.length,
      skuActivos: skusActivos.length,
      skuVencidos: skusVencidos.length,
      skuPorVencer: skusPorVencer.length,
      skuSinVentas: productosSinRotacion.length,
      skuMaestro: skusMaestro.length,
      totalUnidades,
      unidadesActivas,
      unidadesVencidas,
      unidadesPorVencer,
      unidadesSinVentas,
      unidadesMaestro,
      unidadesSinMaestro,
      unidEOL: totalUnidEOL,
      unidadesEOLConDescuento: totalUnidEOLConDescuento,
      unidadesEOLVencidas: totalUnidEOLVencido,
      valorActivo,
      valorEOL: totalValorEOL,
      valorEOLConDescuento: totalValorEOLConDescuento,
      valorEOLVencido: totalValorEOLVencido,
      valorEOLFuturo,
      valorEOLSinFecha,
      valorSinMaestro,
      valorInventarioSinVentas,
      valorTotalInventario,
      pctValorEOL: isAvailablePrice(valorTotalInventario)
        && isAvailablePrice(totalValorEOL)
        ? (valorTotalInventario > 0 ? (totalValorEOL / valorTotalInventario) * 100 : null)
        : null,
      pctValorEOLVencido: isAvailablePrice(valorTotalInventario)
        && isAvailablePrice(totalValorEOLVencido)
        ? (valorTotalInventario > 0
          ? (totalValorEOLVencido / valorTotalInventario) * 100
          : null)
        : null,
      descEOL: totalDescEOL,
      descEOLAplicable: totalDescuentoEOLAplicable,
      ioaEOL: totalIOAEOL,
      retailEOL: totalRetailEOL,
    },
  });
};

export const PortfolioAnalysisService = Object.freeze({
  consolidateRecords,
  analyzePortfolio,
});
