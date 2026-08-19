// =============================================================================
// Propósito: coordinar el caso de uso completo de procesamiento sell-through.
// Responsabilidad: validar entradas y orquestar parsers y servicios de dominio.
// Entradas/Salidas: recibe un Repository estable y devuelve resultado/error.
// Reglas protegidas: Pareto, Distribution y el contrato público vigente.
// Dependencias: parsers, record assembler, Portfolio Analysis, Executive Report y utilidades.
// Fuentes: accede a Maestro, Inventario, parámetros y configuración solo por Repository.
// Evolución: el origen podrá migrar a Dataverse sin cambiar este caso de uso.
// =============================================================================

import { parseMaster } from '../domain/parser/masterParser.js';
import { parseInventory } from '../domain/parser/inventoryParser.js';
import { assembleRecord } from '../domain/parser/recordAssembler.js';
import { PortfolioAnalysisService } from '../domain/portfolio/PortfolioAnalysisService.js';
import { ExecutiveReportService } from '../domain/report/ExecutiveReportService.js';
import { findNewProductsMissingInventory } from '../domain/product/newProduct.js';
import { indexProductsBySku, isAvailablePrice } from '../domain/product/product.js';
import { listarFasesEOLDisponibles } from '../domain/eol/eolEngine.js';
import { primerDiaMes } from '../utils/dateUtils.js';

const REQUIRED_PROCESSING_CONFIG_KEYS = [
  'periodoAnalizado',
  'semanasPersonalizadas',
  'safetyStockSemanas',
  'leadTimeUSA',
  'leadTimeCHINA',
];

// La nulabilidad del Repository no se propaga al caso de uso de procesamiento.
const validateProcessingConfig = (config) => {
  if (config === null || config === undefined) {
    return 'Falta la configuración requerida para procesar sell-through.';
  }
  if (typeof config !== 'object' || Array.isArray(config)) {
    return 'La configuración requerida para procesar sell-through debe ser un objeto válido.';
  }

  const missingKeys = REQUIRED_PROCESSING_CONFIG_KEYS.filter((key) => (
    !Object.prototype.hasOwnProperty.call(config, key)
    || config[key] === null
    || config[key] === undefined
  ));
  if (missingKeys.length > 0) {
    return `La configuración requerida para procesar sell-through está incompleta. Faltan: ${missingKeys.join(', ')}.`;
  }

  return null;
};

// Entrega a presentación la lista efectiva de fases sin exponerle la regla F4
// ni permitir acceso directo a la fuente física.
export const getPhaseDiscountTable = (repository) => {
  const { tablaFases } = repository.getParametros();
  return listarFasesEOLDisponibles({ tablaFases });
};

// Agrupa todas las unidades por nivel operativo. EOL es la cuarta clasificación;
// SIN CATEGORIA queda reservada exclusivamente a registros sin Maestro.
export const calculateTierDistribution = (records, unitField, valueField) => {
  const tiers = ['GOOD', 'BETTER', 'BEST', 'EOL', 'SIN CATEGORIA'];
  const result = {};
  let totalU = 0;
  let totalV = null;
  let totalSKUs = 0;

  tiers.forEach((tier) => {
    result[tier] = {
      unidades: 0,
      valor: null,
      skus: 0,
      pctUnidades: 0,
      pctValor: 0,
      pctSKUs: 0,
    };
  });
  records.forEach((record) => {
    const tier = (record.tier || '').toUpperCase();
    const validTier = record.estado === 'SIN MAESTRO'
      ? 'SIN CATEGORIA'
      : (tiers.slice(0, 4).includes(tier) ? tier : 'GOOD');
    const units = record[unitField] || 0;
    const value = record[valueField];
    if (units > 0) {
      result[validTier].unidades += units;
      if (isAvailablePrice(value)) {
        // Opti ChatGPT: agregar solo valores calculables conserva la
        // nulabilidad del SKU sin ocultar los demás importes válidos.
        result[validTier].valor = isAvailablePrice(result[validTier].valor)
          ? result[validTier].valor + value
          : value;
        totalV = isAvailablePrice(totalV) ? totalV + value : value;
      }
      result[validTier].skus += 1;
      totalU += units;
      totalSKUs += 1;
    }
  });
  tiers.forEach((tier) => {
    if (result[tier].skus === 0) result[tier].valor = 0;
    result[tier].pctUnidades = totalU > 0 ? result[tier].unidades / totalU : 0;
    result[tier].pctValor = isAvailablePrice(totalV)
      && isAvailablePrice(result[tier].valor)
      ? (totalV > 0 ? result[tier].valor / totalV : null)
      : null;
    result[tier].pctSKUs = totalSKUs > 0 ? result[tier].skus / totalSKUs : 0;
  });

  if (totalSKUs === 0) totalV = 0;

  return { tiers: result, lista: tiers, totalU, totalV, totalSKUs };
};

// Agrupa unidades, valor y filas según las categorías ya derivadas del Maestro.
const calculateCategoryDistribution = (records, categories, unitField, valueField) => {
  const result = {};
  let totalU = 0;
  let totalV = null;
  let totalSKUs = 0;

  categories.forEach((category) => {
    result[category] = {
      unidades: 0,
      valor: null,
      skus: 0,
      pctUnidades: 0,
      pctValor: 0,
      pctSKUs: 0,
    };
  });
  records.forEach((record) => {
    const category = record.categoria || 'SIN CATEGORIA';
    const units = record[unitField] || 0;
    const value = record[valueField];
    if (units > 0 && result[category]) {
      result[category].unidades += units;
      if (isAvailablePrice(value)) {
        result[category].valor = isAvailablePrice(result[category].valor)
          ? result[category].valor + value
          : value;
        totalV = isAvailablePrice(totalV) ? totalV + value : value;
      }
      result[category].skus += 1;
      totalU += units;
      totalSKUs += 1;
    }
  });
  categories.forEach((category) => {
    if (result[category].skus === 0) result[category].valor = 0;
    result[category].pctUnidades = totalU > 0 ? result[category].unidades / totalU : 0;
    result[category].pctValor = isAvailablePrice(totalV)
      && isAvailablePrice(result[category].valor)
      ? (totalV > 0 ? result[category].valor / totalV : null)
      : null;
    result[category].pctSKUs = totalSKUs > 0 ? result[category].skus / totalSKUs : 0;
  });

  if (totalSKUs === 0) totalV = 0;

  return { categorias: result, totalU, totalV, totalSKUs };
};

// Clasifica por unidades vendidas con cortes acumulados A=80%, B=95%, C=resto.
export const calculatePareto = (records) => {
  const withSales = records.filter((record) => record.ventas > 0)
    .sort((a, b) => b.ventas - a.ventas);
  const totalSales = withSales.reduce((sum, record) => sum + record.ventas, 0);

  let accumulated = 0;
  const recordsWithPareto = withSales.map((record) => {
    const pctVentas = totalSales > 0 ? record.ventas / totalSales : 0;
    const pctAcumAntes = totalSales > 0 ? accumulated / totalSales : 0;
    accumulated += record.ventas;
    const pctAcum = totalSales > 0 ? accumulated / totalSales : 0;
    const paretoClase = pctAcumAntes < 0.80 ? 'A' : (pctAcumAntes < 0.95 ? 'B' : 'C');
    return { ...record, pctVentas, pctAcum, paretoClase };
  });

  const skusParetoA = recordsWithPareto.filter((record) => record.paretoClase === 'A');
  const skusParetoB = recordsWithPareto.filter((record) => record.paretoClase === 'B');
  const skusParetoC = recordsWithPareto.filter((record) => record.paretoClase === 'C');
  const skusColaLarga = [...skusParetoB, ...skusParetoC];
  const totalSkusConVentas = recordsWithPareto.length;
  const pctSKUsA = totalSkusConVentas > 0
    ? (skusParetoA.length / totalSkusConVentas) * 100
    : 0;
  const ventasA = skusParetoA.reduce((sum, record) => sum + record.ventas, 0);
  const ventasB = skusParetoB.reduce((sum, record) => sum + record.ventas, 0);
  const ventasC = skusParetoC.reduce((sum, record) => sum + record.ventas, 0);
  const pctVentasA = totalSales > 0 ? (ventasA / totalSales) * 100 : 0;
  const pctVentasB = totalSales > 0 ? (ventasB / totalSales) * 100 : 0;
  const pctVentasC = totalSales > 0 ? (ventasC / totalSales) * 100 : 0;
  const pctSKUsB = totalSkusConVentas > 0
    ? (skusParetoB.length / totalSkusConVentas) * 100
    : 0;
  const pctSKUsC = totalSkusConVentas > 0
    ? (skusParetoC.length / totalSkusConVentas) * 100
    : 0;

  let interpretacion;
  if (totalSkusConVentas === 0) {
    interpretacion = {
      titulo: 'Sin datos de ventas',
      linea1: 'No hay SKUs con ventas en el período analizado.',
      linea2: 'Validar el archivo de inventario o el período del análisis.',
      color: '#92400e', bg: '#fef3c7',
    };
  } else if (pctSKUsA <= 20) {
    interpretacion = {
      titulo: 'Concentración saludable (Pareto clásico)',
      linea1: `${skusParetoA.length} SKUs (${pctSKUsA.toFixed(0)}% del portafolio activo) generan ${pctVentasA.toFixed(0)}% de las ventas.`,
      linea2: `Reposición prioritaria de los SKUs A; revisar los ${skusColaLarga.length} SKUs B/C complementarios.`,
      color: '#065f46', bg: '#d1fae5',
    };
  } else if (pctSKUsA <= 35) {
    interpretacion = {
      titulo: 'Mix balanceado',
      linea1: `${skusParetoA.length} SKUs (${pctSKUsA.toFixed(0)}%) acumulan ${pctVentasA.toFixed(0)}% de las ventas — distribución algo más amplia que Pareto clásico.`,
      linea2: 'Mantener disponibilidad de los SKUs A y evaluar los complementarios B/C para evitar sobre-stock.',
      color: '#1e40af', bg: '#dbeafe',
    };
  } else {
    interpretacion = {
      titulo: 'Distribución plana — portafolio disperso',
      linea1: `${skusParetoA.length} SKUs (${pctSKUsA.toFixed(0)}%) acumulan ${pctVentasA.toFixed(0)}% de las ventas, dispersión alta.`,
      linea2: 'Cobertura amplia necesaria; oportunidad clara de racionalizar SKUs complementarios marginales.',
      color: '#92400e', bg: '#fef3c7',
    };
  }

  return {
    skusParetoA,
    skusParetoB,
    skusParetoC,
    skusColaLarga,
    totalSkusConVentas,
    totalVentas: totalSales,
    pctSKUsA,
    pctSKUsB,
    pctSKUsC,
    pctSKUsColaLarga: pctSKUsB + pctSKUsC,
    ventasA,
    ventasB,
    ventasC,
    pctVentasA,
    pctVentasB,
    pctVentasC,
    pctVentasColaLarga: pctVentasB + pctVentasC,
    interpretacion,
  };
};

// Ejecuta el pipeline síncrono usando únicamente los contratos del Repository.
export const processSellThrough = (repository, { products } = {}) => {
  const rawMaestro = repository.getMaestro();
  const rawInventario = repository.getInventario();
  const usesNormalizedProducts = products !== undefined;
  if ((!usesNormalizedProducts && !rawMaestro.trim())
    || (usesNormalizedProducts && (!Array.isArray(products) || products.length === 0))) {
    return { resultados: null, error: 'Falta cargar el Maestro de Productos.' };
  }
  if (!rawInventario.trim()) {
    return { resultados: null, error: 'Falta cargar el Inventario del Cliente.' };
  }

  const masterResult = usesNormalizedProducts
    ? { masterBySku: indexProductsBySku(products), error: null }
    : parseMaster(rawMaestro);
  if (masterResult.error) {
    return { resultados: null, error: masterResult.error };
  }
  const inventoryResult = parseInventory(rawInventario);
  if (inventoryResult.error) {
    return { resultados: null, error: inventoryResult.error };
  }

  const config = repository.getConfiguracion();
  const configError = validateProcessingConfig(config);
  if (configError) {
    return { resultados: null, error: configError };
  }
  const {
    bucketEOL,
    tablaFases,
    umbralMermaPct,
    semanasPorPeriodo,
  } = repository.getParametros();

  const fechaBase = primerDiaMes();
  const newProductsMissingInventory = findNewProductsMissingInventory({
    masterBySku: masterResult.masterBySku,
    inventoryRecords: inventoryResult.inventoryRecords,
    processingDate: fechaBase,
  });
  const recs = inventoryResult.inventoryRecords.map((inventoryRecord) => assembleRecord({
    inventoryRecord,
    masterRecord: masterResult.masterBySku[inventoryRecord.sku],
    config,
    fechaBase,
    bucketEOL,
    tablaFases,
    umbralMermaPct,
    semanasPorPeriodo,
  }));

  const portfolioConsolidation = PortfolioAnalysisService.consolidateRecords(recs);
  const { activos } = portfolioConsolidation;

  const distribucionTier = {
    inventario: calculateTierDistribution(recs, 'invFinal', 'valorInv'),
    ventas: calculateTierDistribution(recs, 'ventas', 'valorVentas'),
    reposicion: calculateTierDistribution(activos, 'reposicionSugerida', 'valorReposicion'),
  };

  const categoriesSet = new Set();
  recs.forEach((record) => {
    if (record.categoria && record.categoria !== 'SIN CATEGORIA') {
      categoriesSet.add(record.categoria);
    }
  });
  const listaCategorias = Array.from(categoriesSet).sort();
  if (recs.some((record) => record.categoria === 'SIN CATEGORIA')) {
    listaCategorias.push('SIN CATEGORIA');
  }
  const distribucionCategoria = {
    lista: listaCategorias,
    inventario: calculateCategoryDistribution(recs, listaCategorias, 'invFinal', 'valorInv'),
    ventas: calculateCategoryDistribution(recs, listaCategorias, 'ventas', 'valorVentas'),
    reposicion: calculateCategoryDistribution(
      activos,
      listaCategorias,
      'reposicionSugerida',
      'valorReposicion',
    ),
  };

  const analisisPareto = calculatePareto(recs);
  const portfolioAnalysis = PortfolioAnalysisService.analyzePortfolio({
    consolidation: portfolioConsolidation,
    fechaCalculo: fechaBase,
    config,
    umbralMermaPct,
    semanasPorPeriodo,
    distribucionTier,
    distribucionCategoria,
    analisisPareto,
    newProductsMissingInventory,
  });
  const executiveReport = ExecutiveReportService.buildExecutiveReport(portfolioAnalysis);

  return {
    error: null,
    resultados: Object.freeze({
      ...portfolioAnalysis,
      executiveReport,
    }),
  };
};
