import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Package, AlertCircle, CheckCircle2, FileText, Download, Trash2, PlayCircle, Database, AlertTriangle, TrendingDown, DollarSign, Calendar, Calculator, FileSpreadsheet, Settings, Upload, BarChart3, ChevronRight, ClipboardList } from 'lucide-react';
import { createSellThroughRepository } from './repositories/sellThroughRepository.js';
import {
  fmtUSD,
  fmtPct,
  fmtPctPoints,
  fmtUSDInline,
  toDisplayValue,
} from './utils/formatters.js';
import { normalizeFechaStr, primerDiaMes } from './utils/dateUtils.js';
import {
  getPhaseDiscountTable,
  processSellThrough,
} from './application/sellThroughApplicationService.js';
import {
  createCustomerMasterService,
  getCustomerSearchErrorMessage,
} from './application/customerMasterService.js';
import { AuthenticationControls } from './auth/AuthenticationControls.jsx';
import { getAccessToken } from './auth/customerApiAccessToken.js';
import { configurationService } from './configuration/configurationService.js';
import { createCustomerRepository } from './repositories/customerRepository.js';
import { createCustomerProvider } from './providers/customerProviderFactory.js';
import {
  createProductMasterService,
  getProductBrandErrorMessage,
  getProductMasterErrorMessage,
} from './application/productMasterService.js';
import { createProductRepository } from './repositories/productRepository.js';
import {
  createProductProvider,
  normalizeProductSource,
  PRODUCT_SOURCES,
} from './providers/productProviderFactory.js';
import {
  isAvailablePrice,
  multiplyPrice,
  subtractPrices,
  sumPriceValues,
} from './domain/product/product.js';
import { obtenerRecomendacionEOL } from './domain/eol/eolEngine.js';
import { ProductSkuCell, getSafeProductUrl } from './components/ProductSkuCell.jsx';
import { DefinitionLegend } from './components/DefinitionLegend.jsx';
import {
  DEFINITION_GROUPS,
  metricDefinitionsAsRows,
} from './presentation/metricDefinitions.js';
import {
  buildDefinitionsCsv,
  buildSellThroughCsv,
} from './presentation/csvExport.js';

// La hidratación ocurre en el servicio; mantenerla fuera del componente permite
// conservar los contratos de caracterización que ejecutan App como función pura.
configurationService.loadPersistedValues();

// Preserva elementos React intencionales y evita entregar objetos de los DTO
// como hijos directos. null/undefined se muestran con el fallback institucional.
const renderServiceValue = (value, fallback = '—') => (
  Array.isArray(value)
    ? value.map((entry) => renderServiceValue(entry, fallback))
    : (React.isValidElement(value) ? value : toDisplayValue(value, fallback))
);

// ============================================================
// BASE DE CONOCIMIENTO INSTITUCIONAL IOCA
// (Cargada mediante Repository — futuro Provider: Dataverse)
// ============================================================

const sourceRepository = createSellThroughRepository();
const customerSourceRepository = createCustomerRepository({
  provider: createCustomerProvider({
    source: import.meta.env.VITE_CUSTOMER_SOURCE,
    getAccessToken,
  }),
});
const defaultCustomerMasterService = createCustomerMasterService({
  repository: customerSourceRepository,
});
const defaultProductSource = normalizeProductSource(import.meta.env.VITE_PRODUCT_SOURCE);
const defaultProductMasterService = createProductMasterService({
  repository: createProductRepository({
    provider: createProductProvider({
      source: defaultProductSource,
      getAccessToken,
    }),
  }),
});
const {
  bucketEOL: BUCKET_EOL,
} = sourceRepository.getParametros();
const DEFAULT_PHASE_DISCOUNT_TABLE = getPhaseDiscountTable(sourceRepository);
const {
  periodosAnalisis: PERIODOS_ANALISIS,
  notaInvSeguridadIOCA: NOTA_INV_SEGURIDAD,
} = sourceRepository.getCatalogos();
const APP_VERSION = 'V1';
const APP_NAME = 'IOCA Sell-Through Intelligence V1';
const PARETO_CLASS_STYLES = Object.freeze({
  A: Object.freeze({ badge: '#166534', background: '#dcfce7', text: '#166534' }),
  B: Object.freeze({ badge: '#1e40af', background: '#dbeafe', text: '#1e40af' }),
  C: Object.freeze({ badge: '#b91c1c', background: '#fee2e2', text: '#991b1b' }),
});
const EOL_PHASE_STYLES = Object.freeze({
  'EOL Vencido': Object.freeze({ label: 'VENCIDO', priority: 0, background: '#fee2e2', color: '#7f1d1d' }),
  'EOL Crítico': Object.freeze({ label: 'CRÍTICO', priority: 1, background: '#ffedd5', color: '#9a3412' }),
  'EOL Próximo': Object.freeze({ label: 'PRÓXIMO', priority: 2, background: '#fef3c7', color: '#92400e' }),
  'EOL Planificado': Object.freeze({ label: 'PLANIFICADO', priority: 3, background: '#dbeafe', color: '#1e40af' }),
});
const EOL_PHASE_UNCLASSIFIED = Object.freeze({
  label: '—', priority: 4, background: '#f5f5f0', color: '#78716c',
});

// ============================================================
// HELPERS
// ============================================================

const compareNullableMoneyDescending = (left, right) => {
  if (isAvailablePrice(left) && isAvailablePrice(right)) return right - left;
  if (isAvailablePrice(left)) return -1;
  if (isAvailablePrice(right)) return 1;
  return 0;
};

const getEolPhaseStyle = (bucket) => EOL_PHASE_STYLES[bucket] ?? EOL_PHASE_UNCLASSIFIED;

// Orden de gestión: vencidos primero, seguidos por crítico, próximo y planificado.
// Los días y buckets llegan calculados por EOL Engine; presentación no los redefine.
const compareEolManagementPriority = (left, right) => {
  const phaseDelta = getEolPhaseStyle(left.bucket).priority
    - getEolPhaseStyle(right.bucket).priority;
  if (phaseDelta !== 0) return phaseDelta;
  if (left.diasDesc !== null && right.diasDesc !== null && left.diasDesc !== right.diasDesc) {
    return right.diasDesc - left.diasDesc;
  }
  return left.sku.localeCompare(right.sku);
};

const colorPorcentajeRotacion = (v) => {
  if (v === null || v === undefined || isNaN(v)) return { bg: '#f5f5f0', fg: '#999' };
  if (v > 100) return { bg: '#d1fae5', fg: '#065f46' };
  if (v >= (100 / 3)) return { bg: '#dbeafe', fg: '#1e40af' };
  if (v >= 10) return { bg: '#fef3c7', fg: '#92400e' };
  return { bg: '#fee2e2', fg: '#7f1d1d' };
};

const generarInformeEjecutivo = (resultados, config) => {
  if (!resultados) return null;
  
  const recs = resultados.recs;
  const pareto = resultados.analisisPareto;
  const dT = resultados.distribucionTier;
  const dC = resultados.distribucionCategoria;
  const alertas = resultados.alertas;
  const totales = resultados.totales;
  
  // ===== DIAGNÓSTICO DE ROTACIÓN =====
  const altaRotacion = recs.filter(r => r.porcentajeRotacion !== null && r.porcentajeRotacion > 100 && r.estado === 'ACTIVO');
  const bajaRotacion = recs.filter(r => r.porcentajeRotacion !== null && r.porcentajeRotacion >= 10 && r.porcentajeRotacion < (100 / 3) && r.ventas > 0 && r.estado === 'ACTIVO');
  const muyBajaRotacion = recs.filter(r => r.porcentajeRotacion !== null && r.porcentajeRotacion < 10 && r.ventas > 0 && r.estado === 'ACTIVO');
  const sinMovimiento = resultados.alertas.productosSinRotacion;
  const sinMovValor = sumPriceValues(sinMovimiento.map((r) => r.valorInv));
  const sobreinventario = recs.filter(r => r.estado === 'ACTIVO' && r.ventas > 0 && r.porcentajeRotacion !== null && r.porcentajeRotacion < 20);
  const subinventario = alertas.skusEnQuiebreActivos;
  const enQuiebreActivo = alertas.skusEnQuiebreActivos;
  const enQuiebreEOL = alertas.skusEnQuiebreEOL;
  const obsolescencia = recs.filter(r => r.estado === 'EOL' && r.diasDesc !== null && r.diasDesc >= 0 && r.invFinal > 0);
  const obsolescenciaValor = sumPriceValues(obsolescencia.map((r) => r.valorInv));
  const requierenActivacion = recs.filter(r => r.estado === 'ACTIVO' && r.invFinal > 0 && r.ventas <= 1 && r.tier === 'BEST');
  
  // Métricas agregadas
  const valorTotalInventario = totales.valorTotalInventario;
  const pctValorEOL = totales.pctValorEOLVencido;
  const pctValorSinMov = isAvailablePrice(valorTotalInventario)
    && isAvailablePrice(sinMovValor)
    ? (valorTotalInventario > 0 ? (sinMovValor / valorTotalInventario) * 100 : null)
    : null;
  
  // SKU héroe (mayor venta)
  const skuHeroe = pareto.skusParetoA[0] || null;
  
  // Categoría dominante en ventas
  let categoriaDominante = null;
  let maxVentasCat = 0;
  Object.entries(dC.ventas.categorias).forEach(([cat, d]) => {
    if (d.unidades > maxVentasCat) {
      maxVentasCat = d.unidades;
      categoriaDominante = { nombre: cat, pct: d.pctUnidades * 100, unidades: d.unidades };
    }
  });
  
  // Categorías en obsolescencia (100% EOL en el inventario)
  const categoriasEnObsolescencia = [];
  dC.lista.forEach(cat => {
    const skusCat = recs.filter(r => r.categoria === cat && r.invFinal > 0);
    if (skusCat.length > 0) {
      const eolCount = skusCat.filter(r => r.estado === 'EOL').length;
      const pctEOL = (eolCount / skusCat.length) * 100;
      if (pctEOL >= 75) categoriasEnObsolescencia.push({ categoria: cat, pctEOL, totalSKUs: skusCat.length });
    }
  });
  
  // Reposición alineada o desalineada con ventas
  const alineacionReposicion = [];
  dC.lista.forEach(cat => {
    const vts = dC.ventas.categorias[cat] ? dC.ventas.categorias[cat].pctUnidades : 0;
    const rep = dC.reposicion.categorias[cat] ? dC.reposicion.categorias[cat].pctUnidades : 0;
    const delta = (rep - vts) * 100;
    alineacionReposicion.push({ categoria: cat, vts: vts * 100, rep: rep * 100, delta });
  });
  
  // ===== HALLAZGOS CLAVE (5-10) =====
  const hallazgos = [];
  
  if (isAvailablePrice(pctValorEOL) && pctValorEOL > 20) {
    hallazgos.push({
      titulo: 'Alto valor inmovilizado en SKUs descontinuados',
      hallazgo: `El ${pctValorEOL.toFixed(0)}% del valor del inventario (${fmtUSD(totales.valorEOLVencido)}) está en SKUs ya descontinuados (EOL Vencidos).`,
      importa: 'Capital atrapado que no rota y deteriora la liquidez del cliente. Cada semana adicional sin liquidar acelera la obsolescencia comercial.',
      impacto: `Pérdida potencial de margen del 30-50% si no se activa una liquidación estructurada en los próximos 60 días.`,
      accion: `Lanzar campaña de liquidación con descuentos escalonados por fase (F1 → F4) y aportes según la fase aplicable.`,
      prioridad: 'CRÍTICA',
    });
  }
  
  if (enQuiebreActivo.length > 0) {
    const valorQuiebre = sumPriceValues(enQuiebreActivo.map((r) => r.valorReposicion));
    hallazgos.push({
      titulo: 'SKUs Activos en quiebre — pérdida de venta en curso',
      hallazgo: `${enQuiebreActivo.length} SKUs Activos están bajo Inventario de Seguridad. Reposición estimada: ${fmtUSD(valorQuiebre)}.`,
      importa: 'Cada día sin reponer estos SKUs es venta perdida — el cliente no puede vender lo que no tiene en piso.',
      impacto: `Estimado ${alertas.totalReposicionUnid} unidades de venta potencial bloqueada. SKUs A en quiebre tienen el mayor costo de oportunidad.`,
      accion: `Orden de compra urgente para los SKUs Pareto A en quiebre. Considerar aire express para SKUs USA y ajuste de lead time China.`,
      prioridad: 'ALTA',
    });
  }
  
  if (sinMovimiento.length > 0
    && isAvailablePrice(pctValorSinMov)
    && pctValorSinMov > 10) {
    hallazgos.push({
      titulo: 'Inventario muerto — capital atrapado sin rotación',
      hallazgo: `${sinMovimiento.length} SKUs sin ventas en el período con inventario en piso por ${fmtUSD(sinMovValor)} (${pctValorSinMov.toFixed(0)}% del valor total).`,
      importa: 'Inventario sin movimiento genera costos de almacenamiento, ocupa espacio de exhibición y compromete la liquidez del comprador.',
      impacto: `Liberar este capital permitiría reinvertir en SKUs Pareto A de alta rotación, mejorando el sell-through general.`,
      accion: `Auditar exhibición, precio y ubicación en tienda. Para los EOL del grupo, liquidar. Para los Activos, considerar activación comercial o eliminación del surtido.`,
      prioridad: 'ALTA',
    });
  }
  
  if (pareto.pctSKUsA <= 20 && pareto.totalSkusConVentas > 0) {
    hallazgos.push({
      titulo: 'Concentración de ventas saludable tipo Pareto',
      hallazgo: `${pareto.skusParetoA.length} SKUs (${pareto.pctSKUsA.toFixed(0)}% del portafolio activo) generan ${pareto.pctVentasA.toFixed(0)}% de las ventas.`,
      importa: 'Una concentración bajo el 20% indica un portafolio disciplinado donde los "vital few" son claros.',
      impacto: 'Permite enfocar capital de trabajo y exhibición en pocos SKUs de alta rotación, optimizando margen y rotación.',
      accion: `Asegurar disponibilidad permanente de los ${pareto.skusParetoA.length} SKUs A. Revisar racionalización de los ${pareto.skusColaLarga.length} SKUs B/C con menor velocidad.`,
      prioridad: 'OPORTUNIDAD',
    });
  } else if (pareto.pctSKUsA > 35 && pareto.totalSkusConVentas > 0) {
    hallazgos.push({
      titulo: 'Portafolio plano — dispersión alta de ventas',
      hallazgo: `${pareto.skusParetoA.length} SKUs (${pareto.pctSKUsA.toFixed(0)}%) acumulan ${pareto.pctVentasA.toFixed(0)}% de las ventas — dispersión más alta que Pareto clásico.`,
      importa: 'Cobertura amplia con pocos best-sellers claros dificulta el foco comercial y aumenta costos de gestión.',
      impacto: 'Oportunidad de racionalizar el portafolio reduciendo SKUs marginales y enfocando ejecución en los más rentables.',
      accion: `Revisar surtido: eliminar SKUs con bajo movimiento sostenido y reforzar exhibición de los Pareto A.`,
      prioridad: 'MEDIA',
    });
  }
  
  categoriasEnObsolescencia.forEach(c => {
    hallazgos.push({
      titulo: `Categoría ${c.categoria} en obsolescencia comercial`,
      hallazgo: `El ${c.pctEOL.toFixed(0)}% de los SKUs en piso de la categoría ${c.categoria} están descontinuados (${c.totalSKUs} SKUs en piso).`,
      importa: 'Una categoría con alta concentración de EOL indica que la marca está retirándose del segmento o que el surtido no se ha refrescado.',
      impacto: 'Pérdida de relevancia de categoría en la góndola, riesgo de canibalización por competidores con líneas activas.',
      accion: `Validar con HQ disponibilidad de SKUs activos para refrescar la categoría. Si no hay reemplazo, planificar exit ordenado.`,
      prioridad: 'ALTA',
    });
  });
  
  const desalineacionFuerte = alineacionReposicion.filter(a => Math.abs(a.delta) >= 10);
  if (desalineacionFuerte.length > 0) {
    const lista = desalineacionFuerte.map(d => `${d.categoria} (Δ ${d.delta > 0 ? '+' : ''}${d.delta.toFixed(0)} pp)`).join(', ');
    hallazgos.push({
      titulo: 'Reposición desalineada con demanda real',
      hallazgo: `En ${desalineacionFuerte.length} categoría(s), la reposición sugerida difiere de las ventas en más de 10 pp: ${lista}.`,
      importa: 'Si la reposición no sigue al mercado, perpetúa los desbalances actuales en lugar de corregirlos.',
      impacto: 'Riesgo de sobreinventario en categorías débiles y subinventario en categorías fuertes.',
      accion: 'Revisar lógica de Safety Stock y ponderar la reposición por velocidad de ventas reciente, no por inventario actual.',
      prioridad: 'MEDIA',
    });
  }
  
  if (skuHeroe) {
    const valorHeroe = multiplyPrice(skuHeroe.costo, skuHeroe.ventas);
    hallazgos.push({
      titulo: 'SKU héroe — concentra la oportunidad de crecimiento',
      hallazgo: `${skuHeroe.sku} (${skuHeroe.modelo}) lidera ventas con ${skuHeroe.ventas} unidades (${(skuHeroe.pctVentas * 100).toFixed(0)}% del total), tier ${skuHeroe.tier}.`,
      importa: 'El SKU héroe es la mejor vitrina de la marca en el punto de venta — su disponibilidad afecta la percepción de la categoría.',
      impacto: 'Asegurar zero-quiebre y exhibición premium del SKU héroe maximiza el sell-through general.',
      accion: `Posición prioritaria en góndola, bundles con accesorios complementarios, training a vendedores sobre beneficios diferenciadores.`,
      prioridad: 'OPORTUNIDAD',
    });
  }
  
  if (alertas.skusConMerma.length > 0 && alertas.totalMermaValor > 0) {
    hallazgos.push({
      titulo: 'Merma operativa por encima del umbral',
      hallazgo: `${alertas.skusConMerma.length} SKUs con merma superior al ${(alertas.umbralMermaPct * 100).toFixed(0)}% (${alertas.totalMermaUnid} unidades · ${fmtUSD(alertas.totalMermaValor)}).`,
      importa: 'Merma alta puede indicar pérdida operativa, robo, error de conteo o problemas en la cadena de custodia.',
      impacto: 'Impacto directo en margen y en la confiabilidad del reporte de inventario del cliente.',
      accion: 'Auditoría conjunta IOCA-cliente del proceso de recepción y conteo. Calibrar el umbral si es estructural.',
      prioridad: 'MEDIA',
    });
  }
  
  // ===== CAUSAS RAÍZ =====
  const causasRaiz = [];
  if (isAvailablePrice(pctValorEOL) && pctValorEOL > 20) causasRaiz.push({ causa: 'Compra inicial mal calculada', evidencia: `${pctValorEOL.toFixed(0)}% del valor en EOL sugiere sobre-compra del ciclo anterior.` });
  if (sobreinventario.length > 5) causasRaiz.push({ causa: 'Exceso de SKUs de baja rotación', evidencia: `${sobreinventario.length} SKUs con Porcentaje de Rotación menor a 20% y ventas positivas — surtido inflado.` });
  if (requierenActivacion.length > 0) causasRaiz.push({ causa: 'Falta de comunicación de beneficios', evidencia: `${requierenActivacion.length} SKUs BEST con inventario y sin venta — exhibición o entrenamiento débil.` });
  if (categoriasEnObsolescencia.length > 0) causasRaiz.push({ causa: 'Portafolio no alineado al consumidor', evidencia: `${categoriasEnObsolescencia.length} categoría(s) con +75% EOL — el cliente no ha refrescado el surtido.` });
  if (enQuiebreActivo.length > 0) causasRaiz.push({ causa: 'Falta de reposición / lead time mal estimado', evidencia: `${enQuiebreActivo.length} SKUs Activos en sub-stock — el ciclo de orden no anticipa la velocidad real.` });
  if (desalineacionFuerte.length > 0) causasRaiz.push({ causa: 'Mal surtido por categoría', evidencia: 'Reposición sigue inventario en lugar de ventas reales.' });
  
  // Top 5 SKUs a reponer (Pareto A activos en quiebre o sub-stock)
  const topReponer = [...enQuiebreActivo, ...recs.filter(r => r.estado === 'ACTIVO' && r.reposicionSugerida > 0 && !r.alertaQuiebre)]
    .sort((a, b) => b.ventas - a.ventas)
    .slice(0, 5);
  
  // Top 5 SKUs a liquidar (EOL Vencidos con mayor valor inmovilizado)
  const topLiquidar = recs.filter(r => r.estado === 'EOL' && r.diasDesc !== null && r.diasDesc >= 0 && r.invFinal > 0)
    .sort((a, b) => compareNullableMoneyDescending(a.valorInv, b.valorInv))
    .slice(0, 5);
  
  // Top 5 SKUs a eliminar del surtido (Activos sin movimiento)
  const topEliminar = sinMovimiento.filter(r => r.estado === 'ACTIVO')
    .sort((a, b) => compareNullableMoneyDescending(a.valorInv, b.valorInv))
    .slice(0, 5);
  
  return {
    altaRotacion, bajaRotacion, muyBajaRotacion,
    sinMovimiento, sinMovValor, pctValorSinMov,
    sobreinventario, subinventario,
    enQuiebreActivo, enQuiebreEOL,
    obsolescencia, obsolescenciaValor,
    requierenActivacion,
    valorTotalInventario, pctValorEOL,
    skuHeroe, categoriaDominante,
    categoriasEnObsolescencia,
    alineacionReposicion,
    hallazgos, causasRaiz,
    topReponer, topLiquidar, topEliminar,
  };
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function App({
  customerMasterService = defaultCustomerMasterService,
  productMasterService = defaultProductMasterService,
  productSource = defaultProductSource,
  phaseDiscountTable = DEFAULT_PHASE_DISCOUNT_TABLE,
} = {}) {
  const fase4Referencial = phaseDiscountTable.find((fase) => fase.fase === 4);
  const fase4DiscountLabel = fase4Referencial
    ? fmtPct(fase4Referencial.descConsumidor)
    : '—';
  const [rawMaestro, setRawMaestro] = useState('');
  const [rawInventario, setRawInventario] = useState('');
  const [resultados, setResultados] = useState(null);
  const [error, setError] = useState(null);
  const [showActivos, setShowActivos] = useState(false);
  const [showLogica, setShowLogica] = useState(false);
  
  // Estado: Tab activo
  const [activeTab, setActiveTab] = useState('config');
  const [configurationRevision, setConfigurationRevision] = useState(0);
  const [configurationSearch, setConfigurationSearch] = useState('');
  const [configurationCategory, setConfigurationCategory] = useState('Todas');
  const [configurationMessage, setConfigurationMessage] = useState(null);

  const configurationSchema = configurationService.getSchema();
  const configurationValues = configurationService.getConfiguration();
  const configurationCategories = [...new Set(configurationSchema.map((parameter) => parameter.categoria))];
  const visibleConfiguration = configurationSchema.filter((parameter) => {
    const search = configurationSearch.trim().toLowerCase();
    const matchesSearch = !search
      || parameter.nombre?.toLowerCase().includes(search)
      || parameter.key.toLowerCase().includes(search)
      || parameter.descripcion.toLowerCase().includes(search);
    const matchesCategory = configurationCategory === 'Todas' || parameter.categoria === configurationCategory;
    return matchesSearch && matchesCategory;
  });

  const updateConfiguration = (parameter, rawValue) => {
    try {
      const value = parameter.tipo === 'number' ? Number(rawValue)
        : parameter.tipo === 'boolean' ? rawValue === 'true' : rawValue;
      configurationService.setValue(parameter.key, value);
      setConfigurationRevision((revision) => revision + 1);
      setConfigurationMessage({ type: 'success', text: `Valor guardado: ${parameter.key}.` });
    } catch (configurationError) {
      setConfigurationMessage({ type: 'error', text: configurationError.message });
    }
  };

  const resetConfigurationValue = (parameter) => {
    try {
      configurationService.resetValue(parameter.key);
      setConfigurationRevision((revision) => revision + 1);
      setConfigurationMessage({ type: 'success', text: `Valor restaurado: ${parameter.key}.` });
    } catch (configurationError) {
      setConfigurationMessage({ type: 'error', text: configurationError.message });
    }
  };

  const resetAllConfiguration = () => {
    configurationService.resetAll();
    setConfigurationRevision((revision) => revision + 1);
    setConfigurationMessage({ type: 'success', text: 'Todos los parámetros fueron restaurados a sus defaults.' });
  };
  
  // Estado: Configuración del análisis
  const hoyISO = new Date().toISOString().slice(0, 10);
  const [config, setConfig] = useState({
    codigoCliente: '',
    nombreCliente: '',
    pais: '',
    customerType: '',
    fechaCorte: hoyISO,
    periodoAnalizado: 'Mensual',
    periodoDetalle: '',
    semanasPersonalizadas: 4,
    safetyStockSemanas: 4,
    leadTimeUSA: 4,
    leadTimeCHINA: 12,
  });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchState, setCustomerSearchState] = useState({
    mode: null,
    query: '',
    status: 'idle',
    results: [],
    message: '',
  });
  // No participa del render: el id invalida A→B→A y pendingKey deduplica el request activo.
  const [customerSearchRequest] = useState({ id: 0, pendingKey: null });
  const [selectedBrand, setSelectedBrand] = useState('');
  const [brandSearch, setBrandSearch] = useState('');
  const [brandOptionsOpen, setBrandOptionsOpen] = useState(false);
  const [brandActiveIndex, setBrandActiveIndex] = useState(-1);
  const [brandLoadState, setBrandLoadState] = useState({
    status: 'idle',
    brands: [],
    message: '',
  });
  const [brandLoadRequest] = useState({ id: 0, pending: false, loaded: false });
  const [productLoadState, setProductLoadState] = useState({
    status: 'idle',
    brand: '',
    products: [],
    message: '',
  });
  // Mantiene una sola carga por marca y permite ignorar respuestas A después de seleccionar B.
  const [productLoadRequest] = useState({ id: 0, brand: '', promise: null });
  
  const updateConfig = (campo, valor) => {
    setConfig(prev => ({ ...prev, [campo]: valor }));
  };

  const searchCustomers = async (mode, query) => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      customerSearchRequest.id += 1;
      customerSearchRequest.pendingKey = null;
      setCustomerSearchState({ mode, query: '', status: 'idle', results: [], message: '' });
      return;
    }

    const requestKey = `${mode}:${normalizedQuery}`;
    if (customerSearchRequest.pendingKey === requestKey) return;
    const requestId = customerSearchRequest.id + 1;
    customerSearchRequest.id = requestId;
    customerSearchRequest.pendingKey = requestKey;

    setCustomerSearchState({
      mode,
      query: normalizedQuery,
      status: 'loading',
      results: [],
      message: '',
    });
    try {
      const results = mode === 'code'
        ? await customerMasterService.searchByCode(normalizedQuery)
        : await customerMasterService.searchByName(normalizedQuery);
      if (customerSearchRequest.id !== requestId) return;
      setCustomerSearchState({
        mode,
        query: normalizedQuery,
        status: 'ready',
        results,
        message: results.length === 0 ? 'No se encontraron clientes.' : '',
      });
    } catch (searchError) {
      if (customerSearchRequest.id !== requestId) return;
      setCustomerSearchState({
        mode,
        query: normalizedQuery,
        status: 'error',
        results: [],
        message: getCustomerSearchErrorMessage(searchError),
      });
    } finally {
      if (customerSearchRequest.id === requestId) {
        customerSearchRequest.pendingKey = null;
      }
    }
  };

  const updateCustomerSearch = (mode, value) => {
    setSelectedCustomer(null);
    setConfig((previousConfig) => ({
      ...previousConfig,
      codigoCliente: '',
      nombreCliente: '',
      pais: '',
      customerType: '',
    }));
    void searchCustomers(mode, value);
  };

  const selectCustomer = (customer) => {
    // Una única entidad seleccionada sincroniza ambos combobox y los cuatro campos.
    customerSearchRequest.id += 1;
    customerSearchRequest.pendingKey = null;
    setSelectedCustomer(customer);
    setConfig((previousConfig) => (
      customerMasterService.selectCustomer(previousConfig, customer)
    ));
    setCustomerSearchState({
      mode: null,
      query: '',
      status: 'idle',
      results: [],
      message: '',
    });
  };

  const customerInputValue = (mode) => {
    if (customerSearchState.mode === mode) return customerSearchState.query;
    if (!selectedCustomer) return '';
    return mode === 'code'
      ? selectedCustomer.customerCode
      : selectedCustomer.customerName;
  };

  const renderCustomerOptions = (mode) => {
    if (customerSearchState.mode !== mode) return null;
    if (customerSearchState.status === 'loading') {
      return <div className="mt-1 px-3 py-2 border text-xs text-stone-500">Buscando clientes…</div>;
    }
    if (customerSearchState.message) {
      return (
        <div
          className="mt-1 px-3 py-2 border text-xs"
          style={{ color: customerSearchState.status === 'error' ? '#991b1b' : '#57534e' }}
        >
          {customerSearchState.message}
        </div>
      );
    }
    if (customerSearchState.results.length === 0) return null;

    return (
      <div
        id={`customer-${mode}-options`}
        role="listbox"
        className="mt-1 border bg-white shadow-sm max-h-48 overflow-y-auto"
        style={{ borderColor: '#e5e0d5' }}
      >
        {customerSearchState.results.map((customer, index) => (
          <button
            key={`${customer.customerCode}-${customer.customerName}-${index}`}
            type="button"
            role="option"
            aria-selected="false"
            onClick={() => selectCustomer(customer)}
            className="w-full px-3 py-2 text-left text-xs border-b last:border-b-0 hover:bg-stone-50"
            style={{ borderColor: '#e5e0d5' }}
          >
            <span className="font-bold" style={{ color: '#0a2540' }}>
              {customer.customerCode || 'Sin código'}
            </span>
            {' — '}{customer.customerName || 'Sin nombre'}
            <span className="block text-[10px] text-stone-500">
              {customer.country || 'País no informado'} · {customer.customerType || 'Tipo no informado'}
            </span>
          </button>
        ))}
      </div>
    );
  };

  const visibleBrands = brandLoadState.brands.filter((brand) => (
    !brandSearch.trim()
    || brand.toLocaleLowerCase().includes(brandSearch.trim().toLocaleLowerCase())
  ));

  const loadBrands = async () => {
    if (brandLoadRequest.pending || brandLoadRequest.loaded) return;
    const requestId = brandLoadRequest.id + 1;
    brandLoadRequest.id = requestId;
    brandLoadRequest.pending = true;
    setBrandLoadState({ status: 'loading', brands: [], message: '' });
    try {
      const brands = await productMasterService.loadBrands();
      if (brandLoadRequest.id !== requestId) return;
      brandLoadRequest.loaded = true;
      setBrandLoadState({
        status: 'ready',
        brands,
        message: brands.length === 0 ? 'No se encontraron marcas.' : '',
      });
    } catch (brandError) {
      if (brandLoadRequest.id !== requestId) return;
      setBrandLoadState({
        status: 'error',
        brands: [],
        message: getProductBrandErrorMessage(brandError),
      });
    } finally {
      if (brandLoadRequest.id === requestId) brandLoadRequest.pending = false;
    }
  };

  const clearProductDataset = () => {
    productLoadRequest.id += 1;
    productLoadRequest.brand = '';
    productLoadRequest.promise = null;
    setProductLoadState({ status: 'idle', brand: '', products: [], message: '' });
  };

  const loadSelectedBrandProducts = (brand) => {
    if (productLoadState.status === 'ready' && productLoadState.brand === brand) {
      return Promise.resolve(productLoadState.products);
    }
    if (productLoadRequest.promise && productLoadRequest.brand === brand) {
      return productLoadRequest.promise;
    }

    const requestId = productLoadRequest.id + 1;
    productLoadRequest.id = requestId;
    productLoadRequest.brand = brand;
    setProductLoadState({ status: 'loading', brand, products: [], message: '' });

    const pending = (async () => {
      try {
        const products = await productMasterService.loadProducts({ brand });
        if (productLoadRequest.id !== requestId) return null;
        setProductLoadState({ status: 'ready', brand, products, message: '' });
        return products;
      } catch (productError) {
        if (productLoadRequest.id !== requestId) return null;
        setProductLoadState({
          status: 'error',
          brand,
          products: [],
          message: getProductMasterErrorMessage(productError),
        });
        throw productError;
      } finally {
        if (productLoadRequest.id === requestId) {
          productLoadRequest.promise = null;
        }
      }
    })();
    productLoadRequest.promise = pending;
    return pending;
  };

  const updateBrandSearch = (value) => {
    setBrandSearch(value);
    setBrandOptionsOpen(true);
    setBrandActiveIndex(-1);
    if (value !== selectedBrand) {
      if (selectedBrand) {
        setResultados(null);
        clearProductDataset();
      }
      setSelectedBrand('');
    }
    void loadBrands();
  };

  const selectBrand = (brand) => {
    if (brand !== selectedBrand) {
      setResultados(null);
      clearProductDataset();
    }
    setSelectedBrand(brand);
    setBrandSearch(brand);
    setBrandOptionsOpen(false);
    setBrandActiveIndex(-1);
    setError(null);
    if (productBrandRequired) {
      void loadSelectedBrandProducts(brand).catch(() => {});
    }
  };

  const handleBrandKeyDown = (event) => {
    if (event.key === 'Escape') {
      setBrandOptionsOpen(false);
      setBrandActiveIndex(-1);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setBrandOptionsOpen(true);
      void loadBrands();
      if (visibleBrands.length === 0) return;
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setBrandActiveIndex((current) => (
        (current + direction + visibleBrands.length) % visibleBrands.length
      ));
      return;
    }
    if (event.key === 'Enter' && brandOptionsOpen
      && brandActiveIndex >= 0 && visibleBrands[brandActiveIndex]) {
      event.preventDefault();
      selectBrand(visibleBrands[brandActiveIndex]);
    }
  };

  const renderBrandOptions = () => {
    if (!brandOptionsOpen) return null;
    if (brandLoadState.status === 'loading') {
      return <div className="mt-1 px-3 py-2 border text-xs text-stone-500">Cargando marcas…</div>;
    }
    if (brandLoadState.status === 'error' || brandLoadState.message) {
      return (
        <div
          className="mt-1 px-3 py-2 border text-xs"
          style={{ color: brandLoadState.status === 'error' ? '#991b1b' : '#57534e' }}
        >
          {brandLoadState.message}
        </div>
      );
    }
    if (visibleBrands.length === 0 && brandLoadState.status === 'ready') {
      return <div className="mt-1 px-3 py-2 border text-xs text-stone-500">No hay marcas que coincidan.</div>;
    }
    if (visibleBrands.length === 0) return null;
    return (
      <div
        id="product-brand-options"
        role="listbox"
        className="mt-1 border bg-white shadow-sm max-h-48 overflow-y-auto"
        style={{ borderColor: '#e5e0d5' }}
      >
        {visibleBrands.map((brand, index) => (
          <button
            id={`product-brand-option-${index}`}
            key={brand}
            type="button"
            role="option"
            aria-selected={brand === selectedBrand}
            onClick={() => selectBrand(brand)}
            className="w-full px-3 py-2 text-left text-xs border-b last:border-b-0 hover:bg-stone-50"
            style={{
              borderColor: '#e5e0d5',
              background: index === brandActiveIndex ? '#faf8f3' : '#ffffff',
            }}
          >
            {brand}
          </button>
        ))}
      </div>
    );
  };
  
  // Validaciones para habilitar navegación
  const customerConfigurationComplete = config.codigoCliente.trim() !== ''
    && config.nombreCliente.trim() !== '';
  const productBrandRequired = productSource === PRODUCT_SOURCES.DATAVERSE;
  const configCompleta = customerConfigurationComplete
    && (!productBrandRequired || selectedBrand !== '');
  const dataCargada = (
    (productSource === PRODUCT_SOURCES.DATAVERSE
      ? selectedBrand !== ''
      : rawMaestro.trim() !== '')
  ) && rawInventario.trim() !== '';
  const productosReposicionSugerida = resultados?.recs
    ?.filter((record) => record.reposicionSugerida > 0) ?? [];
  const productosNuevosNoPresentes = resultados?.newProductsMissingInventory ?? [];
  const eolDetailRows = [...(resultados?.eolTodos ?? [])]
    .sort(compareEolManagementPriority);
  const paretoClassBySku = new Map([
    ...(resultados?.analisisPareto?.skusParetoA ?? []),
    ...(resultados?.analisisPareto?.skusParetoB ?? []),
    ...(resultados?.analisisPareto?.skusParetoC ?? []),
  ].map((record) => [record.sku, record.paretoClase]));

  const procesar = async () => {
    setError(null);
    try {
      let normalizedProducts;
      if (productSource === PRODUCT_SOURCES.DATAVERSE) {
        if (!selectedBrand) {
          setError('Selecciona una marca antes de cargar el Maestro Producto.');
          return;
        }
        try {
          normalizedProducts = await loadSelectedBrandProducts(selectedBrand);
          if (normalizedProducts === null) return;
        } catch (productError) {
          setError(getProductMasterErrorMessage(productError));
          return;
        }
      }
      const processingRepository = createSellThroughRepository({
        rawMaestro,
        rawInventario,
        config,
      });
      const { resultados: nuevosResultados, error: errorProcesamiento } = processSellThrough(
        processingRepository,
        normalizedProducts === undefined ? undefined : { products: normalizedProducts },
      );
      if (errorProcesamiento) {
        setError(errorProcesamiento);
        return;
      }

      setResultados(nuevosResultados);
      // Saltar automáticamente al dashboard cuando termina el procesamiento
      setActiveTab('dashboard');
    } catch (e) {
      setError("Error procesando datos: " + e.message);
    }
  };

  const cargarEjemplo = () => {
    const datosEjemplo = sourceRepository.getDatosEjemplo();
    setRawMaestro(datosEjemplo.maestro);
    setRawInventario(datosEjemplo.inventario);
    setError(null);
  };

  const limpiar = () => {
    setRawMaestro(''); setRawInventario(''); setResultados(null); setError(null);
  };

  const exportarCSV = () => {
    if (!resultados) return;
    const fecha = resultados.fechaCalculo.toISOString().slice(0, 10);
    const downloadCsv = (content, filename) => {
      const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    };

    downloadCsv(buildSellThroughCsv(resultados), `IOCA_Fases_EOL_${fecha}.csv`);
    downloadCsv(buildDefinitionsCsv(), `IOCA_Definiciones_y_Formulas_${fecha}.csv`);
  };

  const exportarExcel = () => {
    if (!resultados) return;
    const wb = XLSX.utils.book_new();
    const fechaStr = resultados.fechaCalculo.toISOString().slice(0,10);
    const fechaLegible = resultados.fechaCalculo.toLocaleDateString('es-GT', { day: '2-digit', month: 'long', year: 'numeric' });
    
    const aplicarFormato = (ws, formatosPorCol) => {
      if (!ws['!ref']) return;
      const range = XLSX.utils.decode_range(ws['!ref']);
      Object.entries(formatosPorCol).forEach(([colIdx, fmt]) => {
        const c = parseInt(colIdx);
        for (let row = range.s.r + 1; row <= range.e.r; row++) {
          const ref = XLSX.utils.encode_cell({ r: row, c });
          if (ws[ref] && typeof ws[ref].v === 'number') ws[ref].z = fmt;
        }
      });
    };

    const aplicarEnlacesProducto = (
      ws,
      records,
      { startRow = 1, skuColumn = 0, imageColumn = null } = {},
    ) => {
      records.forEach((record, index) => {
        const row = startRow + index;
        const productUrl = getSafeProductUrl(record.productUrl);
        const imageUrl = getSafeProductUrl(record.imageUrl);
        if (productUrl) {
          const skuRef = XLSX.utils.encode_cell({ r: row, c: skuColumn });
          if (ws[skuRef]) {
            ws[skuRef].l = { Target: productUrl, Tooltip: `Abrir producto ${record.sku}` };
          }
        }
        if (imageColumn !== null && imageUrl) {
          const imageRef = XLSX.utils.encode_cell({ r: row, c: imageColumn });
          if (ws[imageRef]) {
            ws[imageRef].l = { Target: imageUrl, Tooltip: `Ver imagen ${record.sku}` };
          }
        }
      });
    };
    
    // ===== HOJA 1: RESUMEN EJECUTIVO =====
    const resumenData = [
      ['IOCA SELL-THROUGH INTELLIGENCE V1 — ANÁLISIS DE FASES EOL Y MOTOR INV. SEGURIDAD IOCA'],
      [`Fecha base EOL: ${fechaLegible}`],
      [],
      ['CONTEXTO DEL CLIENTE', ''],
      ['Campo', 'Valor'],
      ['Código del cliente', config.codigoCliente || '—'],
      ['Nombre del cliente', config.nombreCliente || '—'],
      ['País', config.pais],
      ['Fecha de corte', config.fechaCorte],
      ['Período analizado', config.periodoAnalizado + (config.periodoDetalle ? ` (${config.periodoDetalle})` : '')],
      ['Semanas del período (motor V1)', resultados.semanasPeriodoUsadas],
      ['Safety stock (semanas)', config.safetyStockSemanas],
      ['Lead time USA (semanas)', config.leadTimeUSA],
      ['Lead time China (semanas)', config.leadTimeCHINA],
      [],
      ['MOTOR INV. SEGURIDAD IOCA V1', ''],
      ['Fórmula aplicada', NOTA_INV_SEGURIDAD.formula],
      ['Condición 1', 'Si Ventas > 0 en el período → aplica fórmula IOCA (Fuente: IOCA)'],
      ['Condición 2', 'Si Ventas = 0 en el período → se mantiene valor reportado por cliente (Fuente: Cliente)'],
      ['Condición 3', 'Lead Time se toma según origen del SKU: USA o China'],
      ['Condición 4', 'Bajo nivel: Inv. Proyectado < Inv. Seguridad IOCA; la reposición final descuenta Compra (inventario en tránsito)'],
      ['Tabla de semanas por período', NOTA_INV_SEGURIDAD.tablaSemanas],
      [],
      ['DISTRIBUCIÓN DEL PORTAFOLIO', ''],
      ['Métrica', 'Valor'],
      ['Total SKUs en inventario', resultados.totales.totalSKUs],
      ['Total Unidades', resultados.totales.totalUnidades],
      ['SKUs Activos', resultados.totales.skuActivos],
      ['Total Unidades Activas', resultados.totales.unidadesActivas],
      ['SKUs con EOL definido', resultados.totales.skuEOL],
      ['Total Unidades EOL', resultados.totales.unidEOL],
      ['SKUs sin ventas', resultados.totales.skuSinVentas],
      ['Total Unidades sin ventas', resultados.totales.unidadesSinVentas],
      ['Valor inventario sin ventas', resultados.totales.valorInventarioSinVentas],
      ['SKUs Maestro', resultados.totales.skuMaestro],
      ['Total Unidades Maestro', resultados.totales.unidadesMaestro],
      [],
      ['VALORIZACIÓN DEL INVENTARIO', ''],
      ['Métrica', 'Valor USD'],
      ['Valor Total Inventario', resultados.totales.valorTotalInventario],
      ['Valor Activo', resultados.totales.valorActivo],
      ['Valor EOL', resultados.totales.valorEOL],
      ['Valor EOL Vencido', resultados.totales.valorEOLVencido],
      ['Valor EOL Futuro', resultados.totales.valorEOLFuturo],
      ['Valor Sin Maestro', resultados.totales.valorSinMaestro],
      [],
      ['IMPACTO FINANCIERO EOL', ''],
      ['Métrica', 'Valor USD'],
      ['Inventario EOL vencido en piso (unidades)', resultados.totales.unidadesEOLVencidas],
      ['Valor del Inventario EOL vencido', resultados.totales.valorEOLVencido],
      ['Descuento Total al Consumidor', resultados.totales.descEOL],
      ['Absorbe IOCA', resultados.totales.ioaEOL],
      ['Absorbe Retail', resultados.totales.retailEOL],
      [],
      ['ALERTAS OPERATIVAS', ''],
      ['Alerta', 'Cantidad'],
      ['SKUs sin Origen en Inv (asumidos USA)', resultados.alertas.skusSinOrigen.length],
      [`SKUs con Merma > ${(resultados.alertas.umbralMermaPct*100).toFixed(0)}%`, resultados.alertas.skusConMerma.length],
      ['Total unidades de Merma', resultados.alertas.totalMermaUnid],
      ['Valor total de Merma (USD)', resultados.alertas.totalMermaValor],
      ['SKUs Activos bajo Inv. Seguridad', resultados.alertas.skusEnQuiebre.length],
      ['Total unidades de Reposición Sugerida', resultados.alertas.totalReposicionUnid],
      ['Valor total Reposición (USD)', resultados.alertas.totalReposicionValor],
      ['Unidades en Tránsito', resultados.alertas.totalUnidadesTransito],
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    wsResumen['!cols'] = [{ wch: 48 }, { wch: 28 }];
    const etiquetasMoneda = new Set([
      'Valor Total Inventario', 'Valor Activo', 'Valor EOL', 'Valor EOL Vencido', 'Valor EOL Futuro',
      'Valor Sin Maestro', 'Valor del Inventario EOL vencido', 'Descuento Total al Consumidor',
      'Absorbe IOCA', 'Absorbe Retail', 'Valor total de Merma (USD)',
      'Valor total Reposición (USD)', 'Valor inventario sin ventas',
    ]);
    resumenData.forEach((row, r) => {
      if (!etiquetasMoneda.has(row[0])) return;
      const ref = XLSX.utils.encode_cell({ r, c: 1 });
      if (wsResumen[ref] && typeof wsResumen[ref].v === 'number') wsResumen[ref].z = '$#,##0.00';
    });
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
    
    // ===== HOJA 2: EOL CON FASE ACTIVA =====
    if (resultados.eolVencidos.length > 0) {
      const hdr = ['SKU', 'Modelo', 'Marca', 'Fecha EOL', 'Días Desc.', 'Fase', 'Origen', 'Costo', 'Desc. %', 'Desc. Consumi $', 'Aporte IOCA %', 'Aporte IOCA $', 'Aporte Retail %', 'Aporte Retail $', 'Inv. Inicial', 'Ventas', 'Inv. Final', 'Porcentaje de Rotación', 'Desc. Total $', 'Valor Inv.', 'Imagen'];
      const rows = resultados.eolVencidos.map(r => [
        r.sku, r.modelo, r.marca, r.fechaStr, r.diasDesc,
        r.fase !== null ? `F${r.fase}` : '—', r.origen,
        r.costo, r.descPct, r.descUSD,
        r.ioaPct, r.ioaUSD, r.retailPct, r.retailUSD,
        r.invInicial, r.ventas, r.invFinal,
        r.porcentajeRotacion !== null ? r.porcentajeRotacion / 100 : null,
        r.descTotal, r.valorInv, getSafeProductUrl(r.imageUrl) ? 'Ver imagen' : ''
      ]);
      // Fila de totales
      rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', resultados.totales.unidadesEOLVencidas, '', resultados.totales.descEOL, resultados.totales.valorEOLVencido, '']);
      const ws = XLSX.utils.aoa_to_sheet([hdr, ...rows]);
      ws['!cols'] = [{ wch: 18 }, { wch: 42 }, { wch: 12 }, { wch: 12 }, { wch: 11 }, { wch: 7 }, { wch: 9 }, { wch: 11 }, { wch: 9 }, { wch: 15 }, { wch: 13 }, { wch: 14 }, { wch: 14 }, { wch: 15 }, { wch: 11 }, { wch: 8 }, { wch: 10 }, { wch: 22 }, { wch: 14 }, { wch: 13 }, { wch: 14 }];
      aplicarFormato(ws, { 7: '$#,##0.00', 8: '0%', 9: '$#,##0.00', 10: '0%', 11: '$#,##0.00', 12: '0%', 13: '$#,##0.00', 17: '0%', 18: '$#,##0.00', 19: '$#,##0.00' });
      aplicarEnlacesProducto(ws, resultados.eolVencidos, { imageColumn: 20 });
      XLSX.utils.book_append_sheet(wb, ws, 'EOL Fase Activa');
    }
    
    // ===== HOJA 3: EOL POR DESCONTINUARSE =====
    if (resultados.eolFuturos.length > 0) {
      const hdr = ['SKU', 'Modelo', 'Marca', 'Fecha EOL', 'Días hasta EOL', 'Bucket', 'Origen', 'Costo', 'Inv. Inicial', 'Ventas', 'Inv. Final', 'Porcentaje de Rotación', 'Valor Inv.', 'Imagen'];
      const rows = resultados.eolFuturos.map(r => [
        r.sku, r.modelo, r.marca, r.fechaStr,
        Math.abs(r.diasDesc), r.bucket, r.origen,
        r.costo, r.invInicial, r.ventas, r.invFinal,
        r.porcentajeRotacion !== null ? r.porcentajeRotacion / 100 : null,
        r.valorInv, getSafeProductUrl(r.imageUrl) ? 'Ver imagen' : ''
      ]);
      const ws = XLSX.utils.aoa_to_sheet([hdr, ...rows]);
      ws['!cols'] = [{ wch: 18 }, { wch: 42 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 18 }, { wch: 9 }, { wch: 11 }, { wch: 11 }, { wch: 8 }, { wch: 10 }, { wch: 22 }, { wch: 14 }, { wch: 14 }];
      aplicarFormato(ws, { 7: '$#,##0.00', 11: '0%', 12: '$#,##0.00' });
      aplicarEnlacesProducto(ws, resultados.eolFuturos, { imageColumn: 13 });
      XLSX.utils.book_append_sheet(wb, ws, 'EOL Por Descontinuarse');
    }
    
    // ===== HOJA 4: BAJO INV. SEGURIDAD IOCA V1 (paralelo comparativo) =====
    if (resultados.alertas.skusEnQuiebre.length > 0) {
      const notaInfo = [
        ['MOTOR INV. SEGURIDAD IOCA V1 — PARALELO COMPARATIVO', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [NOTA_INV_SEGURIDAD.formula, '', '', '', '', '', '', '', '', '', '', '', '', ''],
        [`Semanas del período aplicadas: ${resultados.semanasPeriodoUsadas} · Safety Stock: ${config.safetyStockSemanas} sem · Lead Time USA: ${config.leadTimeUSA} sem · Lead Time China: ${config.leadTimeCHINA} sem`, '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['Condiciones: Si Ventas > 0 → aplica fórmula IOCA (Fuente: IOCA). Si Ventas = 0 → se mantiene valor del cliente (Fuente: Cliente).', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ];
      const hdr = ['SKU', 'Modelo', 'Marca', 'Estado', 'Bucket EOL', 'Origen', 'Ventas', 'Inv. Seg. Cliente', 'Inv. Seg. IOCA', 'Δ IOCA-Cliente', 'Fuente', 'Inv. Proyectado', 'Inv. Final', 'Compra / Tránsito', 'Necesidad', 'Reposición Final', 'Acción Sugerida', 'Imagen'];
      const rows = resultados.alertas.skusEnQuiebre.map(r => [
        r.sku, r.modelo, r.marca, r.estado, r.bucket || '—', r.origen, r.ventas,
        r.invSeguridad, r.invSeguridadIOCA, r.deltaInvSeguridad, r.fuenteInvSeguridad,
        r.invProyectado, r.invFinal, r.compra, r.necesidadReposicion,
        r.reposicionSugerida,
        r.accionSugerida,
        getSafeProductUrl(r.imageUrl) ? 'Ver imagen' : '',
      ]);
      const totalRepoActivos = resultados.alertas.skusEnQuiebre
        .filter(r => r.estado === 'ACTIVO')
        .reduce((s, r) => s + r.reposicionSugerida, 0);
      rows.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'TOTAL Reposición (solo Activos)', totalRepoActivos, '', '']);
      const ws = XLSX.utils.aoa_to_sheet([...notaInfo, hdr, ...rows]);
      ws['!cols'] = [{ wch: 18 }, { wch: 42 }, { wch: 12 }, { wch: 11 }, { wch: 18 }, { wch: 9 }, { wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 14 }, { wch: 10 }, { wch: 15 }, { wch: 11 }, { wch: 18 }, { wch: 12 }, { wch: 18 }, { wch: 42 }, { wch: 14 }];
      aplicarEnlacesProducto(ws, resultados.alertas.skusEnQuiebre, { startRow: 6, imageColumn: 17 });
      XLSX.utils.book_append_sheet(wb, ws, 'Bajo Inv Seguridad V1');
    }
    
    // ===== HOJA 5: MERMA OPERATIVA =====
    if (resultados.alertas.skusConMerma.length > 0) {
      const hdr = ['SKU', 'Modelo', 'Marca', 'Estado', 'Inv. Inicial', 'Compra', 'Ventas', 'Inv. Proyectado', 'Inv. Final', 'Merma (u)', 'Merma %', 'Costo', 'Costo Merma', 'Imagen'];
      const rows = resultados.alertas.skusConMerma.map(r => [
        r.sku, r.modelo, r.marca, r.estado,
        r.invInicial, r.compra, r.ventas, r.invProyectado, r.invFinal,
        r.merma, r.mermaPct, r.costo, multiplyPrice(r.costo, r.merma),
        getSafeProductUrl(r.imageUrl) ? 'Ver imagen' : '',
      ]);
      rows.push(['', '', '', '', '', '', '', '', 'TOTAL', resultados.alertas.totalMermaUnid, '', '', resultados.alertas.totalMermaValor, '']);
      const ws = XLSX.utils.aoa_to_sheet([hdr, ...rows]);
      ws['!cols'] = [{ wch: 18 }, { wch: 42 }, { wch: 12 }, { wch: 11 }, { wch: 11 }, { wch: 9 }, { wch: 9 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 11 }, { wch: 13 }, { wch: 14 }];
      aplicarFormato(ws, { 10: '0%', 11: '$#,##0.00', 12: '$#,##0.00' });
      aplicarEnlacesProducto(ws, resultados.alertas.skusConMerma, { imageColumn: 13 });
      XLSX.utils.book_append_sheet(wb, ws, 'Merma Operativa');
    }
    
    // ===== HOJA 6: ACTIVOS COMPLETOS =====
    if (resultados.activos.length > 0) {
      const hdr = ['SKU', 'Modelo', 'Marca', 'Tier', 'Origen', 'Inv. Seguridad', 'Inv. Inicial', 'Compra', 'Ventas', 'Inv. Proyectado', 'Inv. Final', 'Porcentaje de Rotación', 'Costo', 'Valor Inv.', 'Reposición Sugerida', 'Valor Reposición', 'Imagen'];
      const rows = resultados.activos.map(r => [
        r.sku, r.modelo, r.marca, r.tier, r.origen,
        r.invSeguridad, r.invInicial, r.compra, r.ventas, r.invProyectado, r.invFinal,
        r.porcentajeRotacion !== null ? r.porcentajeRotacion / 100 : null,
        r.costo, r.valorInv, r.reposicionSugerida, r.valorReposicion,
        getSafeProductUrl(r.imageUrl) ? 'Ver imagen' : '',
      ]);
      const ws = XLSX.utils.aoa_to_sheet([hdr, ...rows]);
      ws['!cols'] = [{ wch: 18 }, { wch: 42 }, { wch: 12 }, { wch: 8 }, { wch: 9 }, { wch: 14 }, { wch: 12 }, { wch: 9 }, { wch: 9 }, { wch: 15 }, { wch: 11 }, { wch: 22 }, { wch: 11 }, { wch: 14 }, { wch: 20 }, { wch: 17 }, { wch: 14 }];
      aplicarFormato(ws, { 11: '0%', 12: '$#,##0.00', 13: '$#,##0.00', 15: '$#,##0.00' });
      aplicarEnlacesProducto(ws, resultados.activos, { imageColumn: 16 });
      XLSX.utils.book_append_sheet(wb, ws, 'Activos');
    }
    
    // ===== HOJA 8: SIN MAESTRO =====
    if (resultados.sinMaestro.length > 0) {
      const hdr = ['SKU', 'Modelo (del Inventario)', 'Tienda', 'Inv. Final', 'Acción Sugerida'];
      const rows = resultados.sinMaestro.map(r => [
        r.sku, r.modelo, r.tienda, r.invFinal, 'Agregar al Maestro IOCA'
      ]);
      const ws = XLSX.utils.aoa_to_sheet([hdr, ...rows]);
      ws['!cols'] = [{ wch: 18 }, { wch: 45 }, { wch: 14 }, { wch: 11 }, { wch: 28 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Sin Maestro');
    }
    
    // ===== HOJA 9: SIN ORIGEN EN INV =====
    if (resultados.alertas.skusSinOrigen.length > 0) {
      const hdr = ['SKU', 'Modelo', 'Estado', 'Costo USA (aplicado)', 'Costo CHINA (alterno)', 'Delta USA-CHINA', 'Imagen'];
      const rows = resultados.alertas.skusSinOrigen.map(r => [
        r.sku, r.modelo, r.estado, r.costoUSA, r.costoCHINA,
        subtractPrices(r.costoUSA, r.costoCHINA),
        getSafeProductUrl(r.imageUrl) ? 'Ver imagen' : '',
      ]);
      const ws = XLSX.utils.aoa_to_sheet([hdr, ...rows]);
      ws['!cols'] = [{ wch: 18 }, { wch: 42 }, { wch: 11 }, { wch: 20 }, { wch: 22 }, { wch: 18 }, { wch: 14 }];
      aplicarFormato(ws, { 3: '$#,##0.00', 4: '$#,##0.00', 5: '$#,##0.00' });
      aplicarEnlacesProducto(ws, resultados.alertas.skusSinOrigen, { imageColumn: 6 });
      XLSX.utils.book_append_sheet(wb, ws, 'Sin Origen en Inv');
    }

    const transitHeader = [
      'SKU', 'Modelo', 'Estado', 'Nivel', 'Unidades en tránsito', 'Valor en tránsito', 'Imagen',
    ];
    const transitRows = resultados.alertas.productosEnTransito.map((record) => [
      record.sku,
      record.modelo,
      record.estado,
      record.tier || 'SIN CATEGORIA',
      record.unidadesEnTransito,
      record.valorEnTransito,
      getSafeProductUrl(record.imageUrl) ? 'Ver imagen' : '',
    ]);
    const wsTransit = XLSX.utils.aoa_to_sheet([transitHeader, ...transitRows]);
    wsTransit['!cols'] = [
      { wch: 18 }, { wch: 42 }, { wch: 12 }, { wch: 16 }, { wch: 22 }, { wch: 20 }, { wch: 14 },
    ];
    aplicarFormato(wsTransit, { 5: '$#,##0.00' });
    aplicarEnlacesProducto(wsTransit, resultados.alertas.productosEnTransito, { imageColumn: 6 });
    XLSX.utils.book_append_sheet(wb, wsTransit, 'Inventario en tránsito');

    const replenishmentHeader = [
      'SKU', 'Modelo', 'Marca', 'Nivel', 'Inv. Proyectado', 'Compra / Tránsito',
      'Necesidad', 'Reposición Sugerida', 'Valor Reposición', 'Imagen',
    ];
    const replenishmentRows = productosReposicionSugerida.map((record) => [
      record.sku,
      record.modelo,
      record.marca,
      record.tier,
      record.invProyectado,
      record.compra,
      record.necesidadReposicion,
      record.reposicionSugerida,
      record.valorReposicion,
      getSafeProductUrl(record.imageUrl) ? 'Ver imagen' : '',
    ]);
    const wsReplenishment = XLSX.utils.aoa_to_sheet([
      replenishmentHeader,
      ...replenishmentRows,
    ]);
    wsReplenishment['!cols'] = [
      { wch: 18 }, { wch: 42 }, { wch: 14 }, { wch: 12 },
      { wch: 17 }, { wch: 20 }, { wch: 14 }, { wch: 22 }, { wch: 18 }, { wch: 14 },
    ];
    aplicarFormato(wsReplenishment, { 8: '$#,##0.00' });
    aplicarEnlacesProducto(wsReplenishment, productosReposicionSugerida, { imageColumn: 9 });
    XLSX.utils.book_append_sheet(wb, wsReplenishment, 'Reposición sugerida');

    const newProductHeader = ['SKU', 'Producto / Modelo', 'Marca', 'Categoría', 'Fecha de creación', 'Imagen'];
    const newProductRows = productosNuevosNoPresentes.map((product) => [
      product.sku,
      product.modelo,
      product.marca,
      product.categoria,
      normalizeFechaStr(product.creationDate),
      getSafeProductUrl(product.imageUrl) ? 'Ver imagen' : '',
    ]);
    const wsNewProducts = XLSX.utils.aoa_to_sheet([newProductHeader, ...newProductRows]);
    wsNewProducts['!cols'] = [
      { wch: 18 }, { wch: 42 }, { wch: 14 }, { wch: 24 }, { wch: 20 }, { wch: 14 },
    ];
    aplicarEnlacesProducto(wsNewProducts, productosNuevosNoPresentes, { imageColumn: 5 });
    XLSX.utils.book_append_sheet(wb, wsNewProducts, 'Nuevos no presentes');
    
    // ===== HOJA 10: DATOS COMPLETOS (auditoría) =====
    const hdrAll = [
      'SKU', 'Tienda', 'Modelo', 'Marca', 'Categoría', 'Estado', 'Tier',
      'Fecha EOL', 'Fecha de creación', 'Días Desc.', 'Días Restantes', 'Clasificación Temporal',
      'Bucket', 'Fase', 'Origen', 'Sin Origen Inv',
      'Inv. Seguridad Cliente', 'Inv. Seguridad IOCA', 'Δ IOCA-Cliente', 'Fuente Inv. Seg.',
      'Semanas Período', 'Lead Time Aplicado',
      'Inv. Inicial', 'Compra', 'Ventas', 'Inv. Proyectado', 'Inv. Final',
      'Porcentaje de Rotación',
      'Merma', 'Merma %', 'Alerta Merma',
      'Necesidad Reposición', 'Reposición Final', 'Alerta Quiebre', 'Acción Sugerida',
      'Costo USA', 'Costo CHINA', 'Costo Aplicado',
      'Desc. %', 'Desc. Consumi $', 'Aporte IOCA %', 'Aporte IOCA $', 'Aporte Retail %', 'Aporte Retail $',
      'Inv. Mínimo Reconocido', 'Liquidación Solo Retail',
      'Valor Inv.', 'Valor Ventas', 'Valor Reposición', 'Desc. Total $', 'Imagen'
    ];
    const rowsAll = resultados.recs.map(r => [
      r.sku, r.tienda, r.modelo, r.marca, r.categoria || 'SIN CATEGORIA', r.estado, r.tier,
      r.fechaStr, normalizeFechaStr(r.creationDate), r.diasDesc, r.diasRestantes, r.clasificacionTemporal,
      r.bucket, r.fase !== null ? `F${r.fase}` : '', r.origen, r.sinOrigenInv ? 'SI' : 'NO',
      r.invSeguridad, r.invSeguridadIOCA, r.deltaInvSeguridad, r.fuenteInvSeguridad,
      r.semanasPeriodo, r.leadTimeAplicado,
      r.invInicial, r.compra, r.ventas, r.invProyectado, r.invFinal,
      r.porcentajeRotacion !== null ? r.porcentajeRotacion / 100 : null,
      r.merma, r.mermaPct, r.alertaMerma ? 'SI' : 'NO',
      r.necesidadReposicion, r.reposicionSugerida,
      r.alertaQuiebre ? 'SI' : 'NO', r.accionSugerida || '',
      r.costoUSA, r.costoCHINA, r.costo,
      r.descPct, r.descUSD, r.ioaPct, r.ioaUSD, r.retailPct, r.retailUSD,
      r.inventarioMinimoReconocido, r.liquidacionSoloRetail ? 'SI' : 'NO',
      r.valorInv, r.valorVentas, r.valorReposicion, r.descTotal,
      getSafeProductUrl(r.imageUrl) ? 'Ver imagen' : '',
    ]);
    const wsAll = XLSX.utils.aoa_to_sheet([hdrAll, ...rowsAll]);
    const rotationColumn = hdrAll.indexOf('Porcentaje de Rotación');
    aplicarFormato(wsAll, { [rotationColumn]: '0%' });
    aplicarEnlacesProducto(wsAll, resultados.recs, { imageColumn: hdrAll.indexOf('Imagen') });
    XLSX.utils.book_append_sheet(wb, wsAll, 'Datos Completos');
    
    // ===== HOJA: DISTRIBUCIÓN POR TIER (GOOD / BETTER / BEST / EOL) =====
    const dT = resultados.distribucionTier;
    const tiersGBB = dT.inventario.lista.filter((tier) =>
      tier !== 'SIN CATEGORIA' || dT.inventario.tiers[tier].skus > 0
    );
    const distribData = [
      ['DISTRIBUCIÓN POR TIER — GOOD / BETTER / BEST / EOL', '', '', '', '', ''],
      [`Cliente analizado · Fecha: ${fechaLegible}`, '', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['INVENTARIO ACTUAL DEL CLIENTE', '', '', '', '', ''],
      [`Total: ${dT.inventario.totalU} unidades · ${dT.inventario.totalSKUs} SKUs`, '', '', '', '', ''],
      ['Tier', 'SKUs', 'Unidades', '% Unidades', 'Valor USD', '% Valor'],
      ...tiersGBB.map(t => {
        const d = dT.inventario.tiers[t];
        return [t, d.skus, d.unidades, d.pctUnidades, d.valor, d.pctValor];
      }),
      ['TOTAL', dT.inventario.totalSKUs, dT.inventario.totalU, 1,
        dT.inventario.totalV, dT.inventario.totalV > 0 ? 1 : null],
      ['', '', '', '', '', ''],
      ['VENTAS DEL CLIENTE', '', '', '', '', ''],
      [`Total: ${dT.ventas.totalU} unidades · ${dT.ventas.totalSKUs} SKUs con venta`, '', '', '', '', ''],
      ['Tier', 'SKUs', 'Unidades', '% Unidades', 'Valor USD', '% Valor'],
      ...tiersGBB.map(t => {
        const d = dT.ventas.tiers[t];
        return [t, d.skus, d.unidades, d.pctUnidades, d.valor, d.pctValor];
      }),
      ['TOTAL', dT.ventas.totalSKUs, dT.ventas.totalU, 1,
        dT.ventas.totalV, dT.ventas.totalV > 0 ? 1 : null],
      ['', '', '', '', '', ''],
      ['REPOSICIÓN SUGERIDA', '', '', '', '', ''],
      [`Total: ${dT.reposicion.totalU} unidades · ${dT.reposicion.totalSKUs} SKUs`, '', '', '', '', ''],
      ['Tier', 'SKUs', 'Unidades', '% Unidades', 'Valor USD', '% Valor'],
      ...tiersGBB.map(t => {
        const d = dT.reposicion.tiers[t];
        return [t, d.skus, d.unidades, d.pctUnidades, d.valor, d.pctValor];
      }),
      ['TOTAL', dT.reposicion.totalSKUs, dT.reposicion.totalU, 1,
        dT.reposicion.totalV, dT.reposicion.totalV > 0 ? 1 : null],
      ['', '', '', '', '', ''],
      ['COMPARATIVA: ¿La reposición sigue al inventario o a las ventas?', '', '', '', '', ''],
      ['Tier', '% Inv. Actual', '% Ventas', '% Reposición', 'Lectura', ''],
      ...tiersGBB.map(t => {
        const inv = dT.inventario.tiers[t].pctUnidades;
        const vts = dT.ventas.tiers[t].pctUnidades;
        const rep = dT.reposicion.tiers[t].pctUnidades;
        const deltaRepVtas = (rep - vts) * 100;
        const deltaRepInv = (rep - inv) * 100;
        let lectura = '';
        if (Math.abs(deltaRepVtas) < 2 && Math.abs(deltaRepInv) < 2) lectura = `Mix balanceado en ${t}`;
        else if (Math.abs(deltaRepVtas) < Math.abs(deltaRepInv)) lectura = `Reposición sigue las VENTAS en ${t}`;
        else lectura = `Reposición sigue al INVENTARIO en ${t}`;
        return [t, inv, vts, rep, lectura, ''];
      }),
    ];
    const wsDistrib = XLSX.utils.aoa_to_sheet(distribData);
    wsDistrib['!cols'] = [{ wch: 32 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 42 }, { wch: 10 }];
    const fmtCell = (r, c, fmt) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (wsDistrib[ref] && typeof wsDistrib[ref].v === 'number') wsDistrib[ref].z = fmt;
    };
    aplicarFormato(wsDistrib, { 3: '0%', 4: '$#,##0.00', 5: '0%' });
    const comparativaTierStart = distribData.findIndex((row) => row[0] === 'Tier'
      && row[1] === '% Inv. Actual') + 1;
    tiersGBB.forEach((_tier, index) => {
      fmtCell(comparativaTierStart + index, 1, '0%');
      fmtCell(comparativaTierStart + index, 2, '0%');
      fmtCell(comparativaTierStart + index, 3, '0%');
    });
    XLSX.utils.book_append_sheet(wb, wsDistrib, 'Distribución Tier');
    
    // ===== HOJA: DISTRIBUCIÓN POR CATEGORÍA =====
    const dC = resultados.distribucionCategoria;
    const listaCats = dC.lista;
    const distribCatData = [
      ['DISTRIBUCIÓN POR CATEGORÍA', '', '', '', '', ''],
      [`Cliente analizado · Fecha: ${fechaLegible}`, '', '', '', '', ''],
      [`Categorías detectadas: ${listaCats.join(' · ')}`, '', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['INVENTARIO ACTUAL DEL CLIENTE', '', '', '', '', ''],
      [`Total: ${dC.inventario.totalU} unidades · ${dC.inventario.totalSKUs} SKUs`, '', '', '', '', ''],
      ['Categoría', 'SKUs', 'Unidades', '% Unidades', 'Valor USD', '% Valor'],
    ];
    listaCats.forEach(c => {
      const d = dC.inventario.categorias[c];
      if (d) distribCatData.push([c, d.skus, d.unidades, d.pctUnidades, d.valor, d.pctValor]);
    });
    distribCatData.push(['TOTAL', dC.inventario.totalSKUs, dC.inventario.totalU, 1,
      dC.inventario.totalV, dC.inventario.totalV > 0 ? 1 : null]);
    const invStart = 6; // primera fila de datos (tiers) en 0-indexed
    const invEnd = invStart + listaCats.length; // incluye fila TOTAL
    
    distribCatData.push(['', '', '', '', '', '']);
    distribCatData.push(['VENTAS DEL CLIENTE', '', '', '', '', '']);
    distribCatData.push([`Total: ${dC.ventas.totalU} unidades · ${dC.ventas.totalSKUs} SKUs con venta`, '', '', '', '', '']);
    distribCatData.push(['Categoría', 'SKUs', 'Unidades', '% Unidades', 'Valor USD', '% Valor']);
    const vtsStart = distribCatData.length;
    listaCats.forEach(c => {
      const d = dC.ventas.categorias[c];
      if (d) distribCatData.push([c, d.skus, d.unidades, d.pctUnidades, d.valor, d.pctValor]);
    });
    distribCatData.push(['TOTAL', dC.ventas.totalSKUs, dC.ventas.totalU, 1,
      dC.ventas.totalV, dC.ventas.totalV > 0 ? 1 : null]);
    const vtsEnd = vtsStart + listaCats.length;
    
    distribCatData.push(['', '', '', '', '', '']);
    distribCatData.push(['REPOSICIÓN SUGERIDA', '', '', '', '', '']);
    distribCatData.push([`Total: ${dC.reposicion.totalU} unidades · ${dC.reposicion.totalSKUs} SKUs`, '', '', '', '', '']);
    distribCatData.push(['Categoría', 'SKUs', 'Unidades', '% Unidades', 'Valor USD', '% Valor']);
    const repStart = distribCatData.length;
    listaCats.forEach(c => {
      const d = dC.reposicion.categorias[c];
      if (d) distribCatData.push([c, d.skus, d.unidades, d.pctUnidades, d.valor, d.pctValor]);
    });
    distribCatData.push(['TOTAL', dC.reposicion.totalSKUs, dC.reposicion.totalU, 1,
      dC.reposicion.totalV, dC.reposicion.totalV > 0 ? 1 : null]);
    const repEnd = repStart + listaCats.length;
    
    // Comparativa
    distribCatData.push(['', '', '', '', '', '']);
    distribCatData.push(['COMPARATIVA: ¿La reposición sigue al inventario o a las ventas?', '', '', '', '', '']);
    distribCatData.push(['Categoría', '% Inv. Actual', '% Ventas', '% Reposición', 'Lectura', '']);
    const compStart = distribCatData.length;
    listaCats.forEach(c => {
      const inv = dC.inventario.categorias[c] ? dC.inventario.categorias[c].pctUnidades : 0;
      const vts = dC.ventas.categorias[c] ? dC.ventas.categorias[c].pctUnidades : 0;
      const rep = dC.reposicion.categorias[c] ? dC.reposicion.categorias[c].pctUnidades : 0;
      const deltaRepVtas = (rep - vts) * 100;
      const deltaRepInv = (rep - inv) * 100;
      let lectura = '';
      if (vts === 0 && rep > 0) lectura = `${c}: reponiendo sin venta — alerta`;
      else if (rep === 0 && vts > 0) lectura = `${c}: vendiendo sin reposición — alerta`;
      else if (Math.abs(deltaRepVtas) < 2 && Math.abs(deltaRepInv) < 2) lectura = `${c}: mix balanceado`;
      else if (Math.abs(deltaRepVtas) < Math.abs(deltaRepInv)) lectura = `${c}: reposición sigue VENTAS`;
      else lectura = `${c}: reposición sigue INVENTARIO`;
      distribCatData.push([c, inv, vts, rep, lectura, '']);
    });
    
    const wsDistribCat = XLSX.utils.aoa_to_sheet(distribCatData);
    wsDistribCat['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 40 }, { wch: 10 }];
    const fmtCellCat = (r, c, fmt) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (wsDistribCat[ref] && typeof wsDistribCat[ref].v === 'number') wsDistribCat[ref].z = fmt;
    };
    // Aplicar formato a los tres bloques de datos
    for (let r = invStart; r <= invEnd; r++) {
      fmtCellCat(r, 3, '0%'); fmtCellCat(r, 4, '$#,##0.00'); fmtCellCat(r, 5, '0%');
    }
    for (let r = vtsStart; r <= vtsEnd; r++) {
      fmtCellCat(r, 3, '0%'); fmtCellCat(r, 4, '$#,##0.00'); fmtCellCat(r, 5, '0%');
    }
    for (let r = repStart; r <= repEnd; r++) {
      fmtCellCat(r, 3, '0%'); fmtCellCat(r, 4, '$#,##0.00'); fmtCellCat(r, 5, '0%');
    }
    for (let r = compStart; r < compStart + listaCats.length; r++) {
      fmtCellCat(r, 1, '0%'); fmtCellCat(r, 2, '0%'); fmtCellCat(r, 3, '0%');
    }
    XLSX.utils.book_append_sheet(wb, wsDistribCat, 'Distribución Categoría');
    
    // ===== HOJA: ANÁLISIS PARETO A/B/C =====
    const pareto = resultados.analisisPareto;
    if (pareto.totalSkusConVentas > 0) {
      const paretoData = [
        ['ANÁLISIS PARETO A/B/C — UNIDADES VENDIDAS POR SKU', '', '', '', '', '', '', '', '', '', ''],
        [`Cliente analizado · Fecha: ${fechaLegible}`, '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', ''],
        ['RESUMEN', '', '', '', '', '', '', '', '', '', ''],
        ['Métrica', 'Valor', '', '', '', '', '', '', '', '', ''],
        ['SKUs con ventas en el período', pareto.totalSkusConVentas, '', '', '', '', '', '', '', '', ''],
        ['Total unidades vendidas', pareto.totalVentas, '', '', '', '', '', '', '', '', ''],
        ['SKUs Pareto A', pareto.skusParetoA.length, '', '', '', '', '', '', '', '', ''],
        ['SKUs Pareto B', pareto.skusParetoB.length, '', '', '', '', '', '', '', '', ''],
        ['SKUs Pareto C', pareto.skusParetoC.length, '', '', '', '', '', '', '', '', ''],
        ['% del portafolio que es Clase A', pareto.pctSKUsA / 100, '', '', '', '', '', '', '', '', ''],
        ['% del portafolio que es Clase B', pareto.pctSKUsB / 100, '', '', '', '', '', '', '', '', ''],
        ['% del portafolio que es Clase C', pareto.pctSKUsC / 100, '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', ''],
        ['INTERPRETACIÓN Y SUGERENCIA DE REPOSICIÓN', '', '', '', '', '', '', '', '', '', ''],
        [pareto.interpretacion.titulo, '', '', '', '', '', '', '', '', '', ''],
        [pareto.interpretacion.linea1, '', '', '', '', '', '', '', '', '', ''],
        [pareto.interpretacion.linea2, '', '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', ''],
        ['DETALLE SKU POR SKU (ordenado por velocidad de ventas)', '', '', '', '', '', '', '', '', '', ''],
        ['Clase', 'SKU', 'Modelo', 'Marca', 'Estado', 'Tier', 'Ventas (u)', '% Ventas', '% Acum.', 'Inv. Final', 'Acción Reposición', 'Imagen'],
      ];
      
      const todosSkusOrdenados = [
        ...pareto.skusParetoA,
        ...pareto.skusParetoB,
        ...pareto.skusParetoC,
      ];
      todosSkusOrdenados.forEach(r => {
        const esA = r.paretoClase === 'A';
        let accionRepo = '';
        if (r.estado === 'EOL') {
          accionRepo = obtenerRecomendacionEOL({
            bucket: r.bucket,
            paretoClase: r.paretoClase,
          });
        } else if (esA && r.estado === 'ACTIVO') accionRepo = 'Reposición prioritaria';
        else if (!esA && r.estado === 'ACTIVO') accionRepo = 'Stock mínimo';
        else accionRepo = 'Agregar al Maestro y decidir';
        
        paretoData.push([
          r.paretoClase, r.sku, r.modelo, r.marca, r.estado, r.tier || 'GOOD',
          r.ventas, r.pctVentas, r.pctAcum, r.invFinal, accionRepo,
          getSafeProductUrl(r.imageUrl) ? 'Ver imagen' : '',
        ]);
      });
      
      const wsPareto = XLSX.utils.aoa_to_sheet(paretoData);
      wsPareto['!cols'] = [
        { wch: 8 }, { wch: 16 }, { wch: 42 }, { wch: 12 }, { wch: 11 }, { wch: 9 },
        { wch: 12 }, { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 46 }, { wch: 14 }
      ];
      
      const fmtParetoCell = (r, c, fmt) => {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (wsPareto[ref] && typeof wsPareto[ref].v === 'number') wsPareto[ref].z = fmt;
      };
      paretoData.forEach((row, index) => {
        if (String(row[0]).startsWith('% del portafolio')) {
          fmtParetoCell(index, 1, '0%');
        }
      });

      // Formato del detalle: % Ventas, % Acum
      const detalleStartRow = paretoData.findIndex((row) => row[0] === 'Clase') + 1;
      const detalleEndRow = detalleStartRow + todosSkusOrdenados.length - 1;
      for (let r = detalleStartRow; r <= detalleEndRow; r++) {
        fmtParetoCell(r, 7, '0%'); // % Ventas
        fmtParetoCell(r, 8, '0%'); // % Acum
      }
      aplicarEnlacesProducto(wsPareto, todosSkusOrdenados, {
        startRow: detalleStartRow,
        skuColumn: 1,
        imageColumn: 11,
      });
      
      XLSX.utils.book_append_sheet(wb, wsPareto, 'Análisis Pareto ABC');
    }

    const definitionRows = [
      ['Indicador/Campo', 'Definición', 'Fórmula', 'Unidad', 'Fuente', 'Interpretación'],
      ...metricDefinitionsAsRows(),
    ];
    const wsDefinitions = XLSX.utils.aoa_to_sheet(definitionRows);
    wsDefinitions['!cols'] = [
      { wch: 30 }, { wch: 58 }, { wch: 72 }, { wch: 20 }, { wch: 42 }, { wch: 62 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDefinitions, 'Definiciones y Fórmulas');
    
    // ===== HOJA 11: REF BUCKET EOL =====
    const bucketData = [
      ['Bucket', 'Días Desde', 'Días Hasta', 'Umbral', 'Estrategia Comercial', 'Descuento Base', 'Prioridad'],
      ...BUCKET_EOL.map(b => [b.bucket, b.diasDesde, b.diasHasta, b.umbral, b.estrategia, b.descuentoBase, b.prioridad])
    ];
    const wsBucket = XLSX.utils.aoa_to_sheet(bucketData);
    wsBucket['!cols'] = [{ wch: 18 }, { wch: 11 }, { wch: 11 }, { wch: 22 }, { wch: 48 }, { wch: 16 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsBucket, 'Ref Bucket EOL');
    
    // ===== HOJA 12: REF TABLA FASES =====
    const fasesData = [
      ['Marca', 'Fase', 'Días Mín.', 'Origen', 'Desc. Consumidor', 'Aporte IOCA', 'Aporte Retail'],
      ...phaseDiscountTable.map(f => [f.marca, f.fase, f.diasMin, f.origen, f.descConsumidor, f.aporteIOCA, f.aporteRetail])
    ];
    const wsFases = XLSX.utils.aoa_to_sheet(fasesData);
    wsFases['!cols'] = [{ wch: 14 }, { wch: 8 }, { wch: 11 }, { wch: 9 }, { wch: 18 }, { wch: 14 }, { wch: 14 }];
    aplicarFormato(wsFases, { 4: '0%', 5: '0%', 6: '0%' });
    XLSX.utils.book_append_sheet(wb, wsFases, 'Ref Tabla Fases');
    
    // Descargar
    const codigoSafe = (config.codigoCliente || 'SC').replace(/[^A-Za-z0-9_-]/g, '');
    XLSX.writeFile(wb, `IOCA_STI_V1_${codigoSafe}_${fechaStr}.xlsx`);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen" style={{ background: '#faf8f3', fontFamily: 'Arial, sans-serif' }}>
      {/* HEADER */}
      <div style={{ background: '#0a2540', color: '#faf8f3' }} className="px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs tracking-widest" style={{ color: '#d4af37' }}>IOCA GROUP</div>
              <h1 className="text-2xl mt-1 flex items-center gap-2" style={{ fontFamily: '"Times New Roman", serif' }}>
                Sell-Through Intelligence
                <span className="text-xs font-bold px-2 py-0.5" style={{ background: '#d4af37', color: '#0a2540', fontFamily: 'Arial, sans-serif' }}>V1</span>
              </h1>
              <div className="text-xs mt-1 opacity-80">
                Motor Inv. Seguridad IOCA · Análisis de Fases EOL · Distribución por Tier y Categoría · Informe Ejecutivo Consultivo
              </div>
            </div>
            <div className="flex items-end gap-5">
              <div className="text-right text-xs">
                <div className="opacity-70">Fecha base EOL</div>
                <div className="font-bold text-base" style={{ color: '#d4af37' }}>
                  {primerDiaMes().toLocaleDateString('es-GT', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
                <div className="opacity-60 mt-1">Primer día del mes utilizado para calcular días y fases EOL.</div>
              </div>
              <AuthenticationControls />
            </div>
          </div>
          <div style={{ background: '#d4af37', height: '3px' }} className="mt-4" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 sm:py-6 space-y-5 sm:space-y-6">

        {/* BARRA DE NAVEGACIÓN POR TABS */}
        <div className="bg-white border shadow-sm" style={{ borderColor: '#e5e0d5' }}>
          <nav className="grid grid-cols-2 md:flex">
            {[
              { id: 'config', label: 'Configuración', icon: Settings, done: configCompleta },
              { id: 'configurationCenter', label: 'Configuration Center', icon: Settings, done: true },
              { id: 'carga', label: 'Carga de Información', icon: Upload, done: dataCargada },
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3, done: !!resultados },
              { id: 'informe', label: 'Informe Ejecutivo', icon: FileText, done: !!resultados },
            ].map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-center gap-2 sm:gap-3 border-r last:border-r-0 transition-all min-h-[56px]"
                  style={{
                    borderColor: '#e5e0d5',
                    background: isActive ? '#0a2540' : '#faf8f3',
                    color: isActive ? '#faf8f3' : '#0a2540',
                    borderBottom: isActive ? '3px solid #d4af37' : '3px solid transparent',
                  }}
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs"
                    style={{
                      background: isActive ? '#d4af37' : (tab.done ? '#d1fae5' : '#e5e0d5'),
                      color: isActive ? '#0a2540' : (tab.done ? '#065f46' : '#666'),
                    }}>
                    {tab.done ? '✓' : (idx + 1)}
                  </div>
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-bold uppercase tracking-wider hidden md:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* ========================= TAB 1: CONFIGURACIÓN ========================= */}
        {activeTab === 'configurationCenter' && (
          <section className="bg-white border shadow-sm" style={{ borderColor: '#e5e0d5' }}>
            <div className="px-6 py-4 border-b flex items-center justify-between flex-wrap gap-3" style={{ borderColor: '#e5e0d5', background: '#0a2540', color: '#faf8f3' }}>
              <div>
                <div className="text-[10px] uppercase tracking-widest" style={{ color: '#d4af37' }}>Configuration Center</div>
                <h2 className="text-xl font-bold mt-1" style={{ fontFamily: '"Times New Roman", serif' }}>Parámetros registrados</h2>
                <div className="text-xs opacity-75 mt-1">CONFIGURATION_SCHEMA es la única fuente autorizada.</div>
              </div>
              <button onClick={resetAllConfiguration} className="px-3 py-2 text-xs font-bold border" style={{ borderColor: '#d4af37', color: '#d4af37' }}>
                Restaurar todos los parámetros
              </button>
            </div>

            <div className="p-6 space-y-4">
              {configurationMessage && (
                <div className="px-4 py-3 text-sm border" style={{ borderColor: configurationMessage.type === 'success' ? '#86efac' : '#fca5a5', background: configurationMessage.type === 'success' ? '#f0fdf4' : '#fef2f2', color: configurationMessage.type === 'success' ? '#166534' : '#991b1b' }}>
                  {configurationMessage.text}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
                <input type="search" value={configurationSearch} onChange={(event) => setConfigurationSearch(event.target.value)} placeholder="Buscar por nombre, clave o descripción" className="border px-3 py-2 text-sm" style={{ borderColor: '#d6d3d1' }} />
                <select value={configurationCategory} onChange={(event) => setConfigurationCategory(event.target.value)} className="border px-3 py-2 text-sm" style={{ borderColor: '#d6d3d1' }}>
                  <option value="Todas">Todas las categorías</option>
                  {configurationCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                {visibleConfiguration.map((parameter) => {
                  const currentValue = configurationValues[parameter.key];
                  return (
                    <div key={parameter.id} className="border p-4" style={{ borderColor: '#e5e0d5' }}>
                      <div className="grid grid-cols-1 lg:grid-cols-[90px_1.1fr_1.1fr_1fr_1.5fr] gap-3 items-start">
                        <div><div className="text-[10px] uppercase text-stone-500">ID</div><div className="font-bold text-sm" style={{ color: '#0a2540' }}>{parameter.id}</div></div>
                        <div><div className="text-[10px] uppercase text-stone-500">Nombre</div><div className="font-bold text-sm" style={{ color: '#0a2540' }}>{parameter.nombre || parameter.key}</div></div>
                        <div><div className="text-[10px] uppercase text-stone-500">Clave</div><div className="font-mono text-xs mt-1">{parameter.key}</div><div className="text-xs text-stone-500 mt-1">{parameter.categoria}</div></div>
                        <div><div className="text-[10px] uppercase text-stone-500">Valor actual</div><input disabled={!parameter.editable} value={String(currentValue ?? '')} onChange={(event) => updateConfiguration(parameter, event.target.value)} className="w-full border px-2 py-1.5 text-sm mt-1 disabled:bg-stone-100 disabled:text-stone-500" style={{ borderColor: '#d6d3d1' }} /></div>
                        <div><div className="text-[10px] uppercase text-stone-500">Descripción</div><div className="text-xs text-stone-600 mt-1">{parameter.descripcion}</div></div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                        <span className="px-2 py-1" style={{ background: parameter.editable ? '#dcfce7' : '#f1f5f9', color: parameter.editable ? '#166534' : '#475569' }}>{parameter.editable ? 'Editable' : 'No editable'}</span>
                        <span className="text-stone-500">Default: <strong>{parameter.valorPorDefecto}</strong></span>
                        <span className="text-stone-500">Fuente: <strong>{parameter.origen}</strong></span>
                        <button disabled={!parameter.editable} onClick={() => updateConfiguration(parameter, String(currentValue))} className="px-2 py-1 border disabled:opacity-40" style={{ borderColor: '#d6d3d1', color: '#0a2540' }}>Guardar</button>
                        <button disabled={!parameter.editable} onClick={() => resetConfigurationValue(parameter)} className="px-2 py-1 border disabled:opacity-40" style={{ borderColor: '#d6d3d1', color: '#0a2540' }}>Restaurar default</button>
                      </div>
                    </div>
                  );
                })}
                {visibleConfiguration.length === 0 && <div className="text-center text-sm text-stone-500 py-8">No hay parámetros que coincidan con los filtros.</div>}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'config' && (
          <div className="bg-white border shadow-sm" style={{ borderColor: '#e5e0d5' }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: '#e5e0d5', background: '#faf8f3' }}>
              <h2 className="text-lg flex items-center gap-2" style={{ fontFamily: '"Times New Roman", serif', color: '#0a2540' }}>
                <ClipboardList className="w-5 h-5" style={{ color: '#d4af37' }} />
                Configuración del análisis
              </h2>
              <div className="text-xs text-stone-500 mt-1">
                Define los parámetros del cliente y del análisis. Esta información aparece en el dashboard y en todas las exportaciones a Excel.
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              {/* Identificación del cliente */}
              <div className="md:col-span-2">
                <div className="text-[11px] uppercase tracking-wider font-bold mb-3" style={{ color: '#7f1d1d' }}>
                  Identificación del cliente
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#0a2540' }}>
                  Código del cliente <span className="text-red-700">*</span>
                </label>
                <input type="search" value={customerInputValue('code')}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={customerSearchState.mode === 'code' && customerSearchState.results.length > 0}
                  aria-controls="customer-code-options"
                  onChange={e => updateCustomerSearch('code', e.target.value)}
                  placeholder="Buscar por código"
                  className="w-full px-3 py-2 border text-sm"
                  style={{ borderColor: '#e5e0d5', background: '#faf8f3' }} />
                {renderCustomerOptions('code')}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#0a2540' }}>
                  Nombre del cliente <span className="text-red-700">*</span>
                </label>
                <input type="search" value={customerInputValue('name')}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={customerSearchState.mode === 'name' && customerSearchState.results.length > 0}
                  aria-controls="customer-name-options"
                  onChange={e => updateCustomerSearch('name', e.target.value)}
                  placeholder="Buscar por nombre"
                  className="w-full px-3 py-2 border text-sm"
                  style={{ borderColor: '#e5e0d5', background: '#faf8f3' }} />
                {renderCustomerOptions('name')}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#0a2540' }}>País</label>
                <input value={config.pais}
                  readOnly
                  placeholder="Se carga al seleccionar el cliente"
                  className="w-full px-3 py-2 border text-sm"
                  style={{ borderColor: '#e5e0d5', background: '#f5f5f4' }} />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#0a2540' }}>Tipo de cliente</label>
                <input value={config.customerType}
                  readOnly
                  aria-label="Tipo de cliente"
                  placeholder="Tipo no informado"
                  className="w-full px-3 py-2 border text-sm"
                  style={{ borderColor: '#e5e0d5', background: '#f5f5f4' }} />
              </div>

              {/* La selección permanece separada de Customer y del Configuration Center. */}
              <div className="md:col-span-2 mt-2">
                <div className="text-[11px] uppercase tracking-wider font-bold mb-3" style={{ color: '#7f1d1d' }}>
                  Maestro de Productos
                </div>
                <label className="block text-xs font-bold mb-1.5" htmlFor="product-brand-search" style={{ color: '#0a2540' }}>
                  Marca {productBrandRequired && <span className="text-red-700">*</span>}
                </label>
                <input
                  id="product-brand-search"
                  type="search"
                  value={brandSearch}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={brandOptionsOpen && visibleBrands.length > 0}
                  aria-controls="product-brand-options"
                  aria-activedescendant={brandActiveIndex >= 0
                    ? `product-brand-option-${brandActiveIndex}`
                    : undefined}
                  onFocus={() => {
                    setBrandOptionsOpen(true);
                    void loadBrands();
                  }}
                  onChange={(event) => updateBrandSearch(event.target.value)}
                  onKeyDown={handleBrandKeyDown}
                  placeholder="Buscar y seleccionar marca"
                  className="w-full px-3 py-2 border text-sm"
                  style={{ borderColor: '#e5e0d5', background: '#faf8f3' }}
                />
                {renderBrandOptions()}
                <div className="text-[10px] text-stone-500 mt-1">
                  {selectedBrand
                    ? <>Marca seleccionada: <strong>{selectedBrand}</strong>.</>
                    : productBrandRequired
                      ? 'Selecciona una marca antes de cargar el Maestro Producto.'
                      : 'La selección se aplicará al Product Provider cuando corresponda.'}
                </div>
                {productBrandRequired && selectedBrand
                  && productLoadState.brand === selectedBrand && (
                    <div
                      role="status"
                      className="text-[10px] mt-1"
                      style={{ color: productLoadState.status === 'error' ? '#991b1b' : '#57534e' }}
                    >
                      {productLoadState.status === 'loading' && 'Cargando Maestro Producto de la marca seleccionada…'}
                      {productLoadState.status === 'ready' && (
                        productLoadState.products.length > 0
                          ? 'Maestro Producto listo para la marca seleccionada.'
                          : 'No se encontraron productos para la marca seleccionada.'
                      )}
                      {productLoadState.status === 'error' && productLoadState.message}
                    </div>
                )}
              </div>

              {/* Periodo y fechas */}
              <div className="md:col-span-2 mt-2">
                <div className="text-[11px] uppercase tracking-wider font-bold mb-3" style={{ color: '#7f1d1d' }}>
                  Período de análisis
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#0a2540' }}>Fecha de corte</label>
                <input type="date" value={config.fechaCorte}
                  onChange={e => updateConfig('fechaCorte', e.target.value)}
                  className="w-full px-3 py-2 border text-sm"
                  style={{ borderColor: '#e5e0d5', background: '#faf8f3' }} />
                <div className="text-[10px] text-stone-500 mt-1">Fecha de cierre del inventario y ventas reportados.</div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#0a2540' }}>Período analizado</label>
                <select value={config.periodoAnalizado}
                  onChange={e => updateConfig('periodoAnalizado', e.target.value)}
                  className="w-full px-3 py-2 border text-sm"
                  style={{ borderColor: '#e5e0d5', background: '#faf8f3' }}>
                  {PERIODOS_ANALISIS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <div className="text-[10px] text-stone-500 mt-1">
                  Conversión IOCA: Semanal=1 · Quincenal=2 · Mensual=4.33 · Bimestral=8.67 · Trimestral=13 · Semestral=26 · Anual=52
                </div>
              </div>

              {config.periodoAnalizado === 'Personalizado' && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold mb-1.5" style={{ color: '#7f1d1d' }}>
                    Semanas del período (personalizado) <span className="text-red-700">*</span>
                  </label>
                  <input type="number" min="0.1" step="0.1" value={config.semanasPersonalizadas}
                    onChange={e => updateConfig('semanasPersonalizadas', parseFloat(e.target.value) || 4.33)}
                    className="w-full px-3 py-2 border text-sm"
                    style={{ borderColor: '#7f1d1d', background: '#fef3c7' }} />
                  <div className="text-[10px] text-stone-600 mt-1">Requerido para el motor Inv. Seguridad IOCA V1 cuando el período es Personalizado.</div>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#0a2540' }}>Detalle del período (opcional)</label>
                <input type="text" value={config.periodoDetalle}
                  onChange={e => updateConfig('periodoDetalle', e.target.value)}
                  placeholder="Ej: Octubre 2025 · Sem 40-43 · Q3 2025"
                  className="w-full px-3 py-2 border text-sm"
                  style={{ borderColor: '#e5e0d5', background: '#faf8f3' }} />
              </div>

              {/* Parámetros operativos */}
              <div className="md:col-span-2 mt-2">
                <div className="text-[11px] uppercase tracking-wider font-bold mb-3" style={{ color: '#7f1d1d' }}>
                  Parámetros operativos
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#0a2540' }}>Safety stock (semanas)</label>
                <input type="number" min="0" step="1" value={config.safetyStockSemanas}
                  onChange={e => updateConfig('safetyStockSemanas', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border text-sm"
                  style={{ borderColor: '#e5e0d5', background: '#faf8f3' }} />
                <div className="text-[10px] text-stone-500 mt-1">Cobertura mínima en piso para evitar quiebres.</div>
              </div>

              <div></div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#0a2540' }}>Lead time USA (semanas)</label>
                <input type="number" min="0" step="1" value={config.leadTimeUSA}
                  onChange={e => updateConfig('leadTimeUSA', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border text-sm"
                  style={{ borderColor: '#e5e0d5', background: '#faf8f3' }} />
                <div className="text-[10px] text-stone-500 mt-1">Ruta aérea Miami → mercado.</div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#0a2540' }}>Lead time China (semanas)</label>
                <input type="number" min="0" step="1" value={config.leadTimeCHINA}
                  onChange={e => updateConfig('leadTimeCHINA', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border text-sm"
                  style={{ borderColor: '#e5e0d5', background: '#faf8f3' }} />
                <div className="text-[10px] text-stone-500 mt-1">Ruta marítima China → mercado.</div>
              </div>

              {/* Bloque explicativo del Motor Inv. Seguridad IOCA V1 */}
              <div className="md:col-span-2 mt-2 border-l-4 p-4" style={{ borderColor: '#d4af37', background: '#faf8f3' }}>
                <div className="text-[11px] uppercase tracking-wider font-bold mb-2 flex items-center gap-2" style={{ color: '#0a2540' }}>
                  <Calculator className="w-3.5 h-3.5" style={{ color: '#d4af37' }} />
                  {NOTA_INV_SEGURIDAD.titulo}
                </div>
                <div className="text-[11px] font-mono mb-2 p-2" style={{ background: '#0a2540', color: '#d4af37' }}>
                  {NOTA_INV_SEGURIDAD.formula}
                </div>
                <div className="text-[11px] font-bold mb-1" style={{ color: '#7f1d1d' }}>Condiciones que aplican:</div>
                <ul className="text-[11px] mb-2" style={{ color: '#444', paddingLeft: '18px', listStyle: 'disc' }}>
                  {NOTA_INV_SEGURIDAD.condiciones.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
                <div className="text-[10px] italic" style={{ color: '#666' }}>
                  <strong>Propósito consultivo:</strong> {NOTA_INV_SEGURIDAD.propositoConsultivo}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex items-center justify-between flex-wrap gap-3" style={{ borderColor: '#e5e0d5', background: '#faf8f3' }}>
              <div className="text-xs text-stone-600">
                {configCompleta 
                  ? <span style={{ color: '#065f46' }}><CheckCircle2 className="w-3.5 h-3.5 inline" /> Configuración completa — listo para cargar información</span>
                  : <span style={{ color: '#92400e' }}>
                    {!customerConfigurationComplete
                      ? 'Completa código y nombre del cliente para continuar'
                      : 'Selecciona una marca antes de cargar el Maestro Producto'}
                  </span>}
              </div>
              <button onClick={() => setActiveTab('carga')}
                disabled={!configCompleta}
                className="px-5 py-2 text-sm font-bold flex items-center gap-2 shadow-sm"
                style={{
                  background: configCompleta ? '#d4af37' : '#cbd5e1',
                  color: configCompleta ? '#0a2540' : '#666',
                  cursor: configCompleta ? 'pointer' : 'not-allowed',
                }}>
                Siguiente: Carga de Información
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================= TAB 2: CARGA DE INFORMACIÓN ========================= */}
        {activeTab === 'carga' && (
        <>
        {/* INSUMOS */}
        <div className="bg-white border shadow-sm" style={{ borderColor: '#e5e0d5' }}>
          <div className="px-6 py-4 border-b flex items-center justify-between flex-wrap gap-2" style={{ borderColor: '#e5e0d5', background: '#faf8f3' }}>
            <h2 className="text-lg flex items-center gap-2" style={{ fontFamily: '"Times New Roman", serif', color: '#0a2540' }}>
              <Database className="w-5 h-5" style={{ color: '#d4af37' }} />
              Insumos requeridos
            </h2>
            <div className="flex gap-2">
              <button onClick={cargarEjemplo} className="px-3 py-1.5 text-xs border flex items-center gap-1.5 hover:opacity-80" style={{ borderColor: '#0a2540', color: '#0a2540' }}>
                <PlayCircle className="w-3.5 h-3.5" />Cargar ejemplo
              </button>
              <button onClick={limpiar} className="px-3 py-1.5 text-xs border flex items-center gap-1.5 hover:opacity-80" style={{ borderColor: '#999', color: '#666' }}>
                <Trash2 className="w-3.5 h-3.5" />Limpiar
              </button>
            </div>
          </div>

          <div className="p-6 flex justify-center">
            {/* Inventario es la única entrada manual; Product Master llega por su Provider. */}
            <div className="w-full max-w-5xl">
              <label className="block text-sm font-bold mb-2" style={{ color: '#0a2540' }}>
                1. Inventario del Cliente
              </label>
              <div className="text-[11px] text-stone-500 mb-2">
                Mínimo: <code className="bg-stone-100 px-1">SKU</code> · <code className="bg-stone-100 px-1">INV FINAL</code>. Opcionales: <code className="bg-stone-100 px-1">Tienda</code> · <code className="bg-stone-100 px-1">MARCA</code> · <code className="bg-stone-100 px-1">Nombre</code>
              </div>
              <textarea
                value={rawInventario}
                onChange={e => setRawInventario(e.target.value)}
                placeholder="Pega aquí el inventario del cliente..."
                className="w-full h-44 p-3 border font-mono text-[10px]"
                style={{ borderColor: '#e5e0d5', background: '#faf8f3' }}
              />
            </div>
          </div>

          <div className="px-6 pb-6 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-xs text-stone-600 max-w-2xl">
              <Database className="w-4 h-4 flex-shrink-0" style={{ color: '#d4af37' }} />
              <span>
                El <strong>Origen</strong> de cada SKU (USA o CHINA) se obtiene del <strong>Inventario del Cliente</strong> y determina el precio aplicable del <strong>Product Master Dataverse</strong>. Si no se declara Origen, se asume USA por default.
              </span>
            </div>

            {productBrandRequired && !selectedBrand && (
              <div role="status" className="w-full px-3 py-2 text-xs border" style={{ borderColor: '#f59e0b', color: '#92400e', background: '#fffbeb' }}>
                Selecciona una marca en Configuración antes de ejecutar el análisis; Product Master se obtendrá de Dataverse.
              </div>
            )}

            <button onClick={procesar}
              disabled={!dataCargada}
              className="px-6 py-2.5 text-sm font-bold flex items-center gap-2 shadow-sm hover:opacity-90 disabled:opacity-50"
              style={{
                background: dataCargada ? '#d4af37' : '#cbd5e1',
                color: dataCargada ? '#0a2540' : '#666',
                cursor: dataCargada ? 'pointer' : 'not-allowed',
              }}>
              <Calculator className="w-4 h-4" />
              Calcular y ver dashboard
            </button>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-700 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-900">{error}</div>
          </div>
        )}
        </>
        )}

        {/* ========================= TAB 3: DASHBOARD ========================= */}
        {activeTab === 'dashboard' && !resultados && (
          <div className="bg-white border shadow-sm p-12 text-center" style={{ borderColor: '#e5e0d5' }}>
            <BarChart3 className="w-12 h-12 mx-auto mb-3" style={{ color: '#cbd5e1' }} />
            <div className="text-sm font-bold mb-1" style={{ color: '#0a2540' }}>Dashboard sin datos</div>
            <div className="text-xs text-stone-500 mb-4">Primero carga el Inventario del Cliente y presiona "Calcular"; Product Master se obtiene de la fuente configurada.</div>
            <button onClick={() => setActiveTab('carga')}
              className="px-5 py-2 text-sm font-bold inline-flex items-center gap-2"
              style={{ background: '#0a2540', color: '#faf8f3' }}>
              <Upload className="w-4 h-4" /> Ir a Carga de Información
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && resultados?.executiveReport && (() => {
          const report = resultados.executiveReport;
          const summary = report.executiveSummary ?? {};
          const kpis = report.kpis ?? {};
          const indicators = report.indicadoresGenerales ?? {};
          const paretoInterpretation = indicators.interpretacionPareto ?? {};
          const dashboardAlerts = report.dashboard?.alertas ?? {};
          const dashboardPareto = report.dashboard?.pareto ?? {};

          return (
            <section className="bg-white border shadow-sm" style={{ borderColor: '#e5e0d5' }}>
              <div className="px-6 py-4 border-b flex items-center justify-between flex-wrap gap-3"
                style={{ borderColor: '#e5e0d5', background: '#0a2540', color: '#faf8f3' }}>
                <div>
                  <div className="text-[10px] uppercase tracking-widest" style={{ color: '#d4af37' }}>Executive Dashboard</div>
                  <h2 className="text-xl font-bold mt-1" style={{ fontFamily: '"Times New Roman", serif' }}>Resumen para presentación ejecutiva</h2>
                </div>
                <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ background: '#d4af37', color: '#0a2540' }}>MVP</span>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-stone-500 mb-3">Executive Summary</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {[
                      ['Total SKU', summary.totalSKUs, 'Total Unidades', summary.totalUnidades, 'Valor Inventario Total', summary.valorTotalInventario],
                      ['SKU Activos', summary.skuActivos, 'Unidades Activas', summary.unidadesActivas, 'Valor Inventario SKU Activos', summary.valorActivo],
                      ['SKU con EOL definido', summary.skuEOL, 'Unidades con EOL definido', summary.unidadesEOL, 'Valor Inventario EOL', summary.valorEOL],
                      ['SKU sin ventas', summary.skuSinVentas, 'Unidades sin ventas', summary.unidadesSinVentas, 'Valor inventario sin ventas', summary.valorInventarioSinVentas],
                      ['SKU Sin Maestro', summary.skuSinMaestro, 'Unidades Sin Maestro', summary.unidadesSinMaestro, 'Valor Inventario Sin Maestro', summary.valorSinMaestro],
                    ].map(([label, value, unitLabel, unitValue, moneyLabel, moneyValue]) => (
                      <div key={label} className="border p-3" style={{ borderColor: '#e5e0d5', background: '#faf8f3' }}>
                        <div className="text-[10px] uppercase tracking-wider text-stone-500">{label}</div>
                        <div className="mt-1 text-xl font-bold" style={{ color: '#0a2540' }}>{renderServiceValue(value)}</div>
                        <div className="mt-2 pt-2 border-t" style={{ borderColor: '#e5e0d5' }}>
                          <div className="text-[9px] uppercase tracking-wider text-stone-500">{unitLabel}</div>
                          <div className="text-sm font-bold" style={{ color: '#0a2540' }}>{renderServiceValue(unitValue)}</div>
                        </div>
                        {moneyLabel && (
                          <div className="mt-2 pt-2 border-t" style={{ borderColor: '#e5e0d5' }}>
                            <div className="text-[9px] uppercase tracking-wider text-stone-500">{moneyLabel}</div>
                            <div className="text-sm font-bold" style={{ color: '#0a2540' }}>{fmtUSD(moneyValue)}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    {[
                      ['Merma', fmtUSD(kpis.totalMermaValor), '#c2410c', 'Valor de la merma de los SKU que superan el umbral vigente.'],
                      ['Ventas Pareto A', fmtPctPoints(kpis.pctVentasA), '#15803d', 'Participación de las unidades vendidas generada por los SKU clase A.'],
                      ['Reposición', fmtUSD(kpis.totalReposicionValor), '#0369a1', 'Costo aplicado por las unidades de reposición sugerida ya calculadas.'],
                    ].map(([label, value, color, help]) => (
                      <div key={label} className="border p-4" style={{ borderColor: '#e5e0d5' }}>
                        <div className="text-[10px] uppercase tracking-wider text-stone-500">{label}</div>
                        <div className="text-2xl font-bold mt-1" style={{ color }}>{renderServiceValue(value)}</div>
                        <div className="text-[10px] text-stone-500 mt-2">{help}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <DefinitionLegend ids={DEFINITION_GROUPS.executive} />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="border p-4" style={{ borderColor: '#e5e0d5' }}>
                    <div className="text-[10px] uppercase tracking-widest text-stone-500 mb-3">Indicadores generales</div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><div className="text-xs text-stone-500">Semanas utilizadas</div><div className="font-bold text-[#0a2540]">{renderServiceValue(indicators?.semanasPeriodoUsadas)}</div></div>
                      <div><div className="text-xs text-stone-500">Umbral de merma</div><div className="font-bold text-[#0a2540]">{fmtPct(indicators?.umbralMermaPct)}</div><div className="text-[10px] text-stone-500 mt-1">La alerta aplica cuando Merma ÷ Inv. Inicial supera estrictamente este porcentaje.</div></div>
                      <div><div className="text-xs text-stone-500">SKUs con ventas</div><div className="font-bold text-[#0a2540]">{renderServiceValue(kpis?.totalSkusConVentas)}</div></div>
                      <div><div className="text-xs text-stone-500">SKUs Pareto A</div><div className="font-bold text-[#0a2540]">{fmtPctPoints(kpis?.pctSKUsA)}</div></div>
                    </div>
                    <div className="mt-4 px-3 py-2 text-xs border-l-4" style={{ borderColor: paretoInterpretation.color ?? '#d6d3d1', background: paretoInterpretation.bg ?? '#faf8f3', color: paretoInterpretation.color ?? '#444' }}>
                      <div className="font-bold">{renderServiceValue(paretoInterpretation.titulo)}</div>
                      <div className="mt-1">{renderServiceValue(paretoInterpretation.linea1)}</div>
                      <div className="mt-1">{renderServiceValue(paretoInterpretation.linea2)}</div>
                    </div>
                  </div>

                  <div className="border p-4" style={{ borderColor: '#e5e0d5' }}>
                    <div className="text-[10px] uppercase tracking-widest text-stone-500 mb-3">Resumen Dashboard</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        ['Sin origen', dashboardAlerts.skusSinOrigen, dashboardAlerts.unidadesSinOrigen],
                        ['Con merma', dashboardAlerts.skusConMerma, dashboardAlerts.unidadesConMerma],
                        ['Quiebres Activos', dashboardAlerts.quiebreActivos, dashboardAlerts.unidadesQuiebreActivos],
                        ['Nuevos no presentes', dashboardAlerts.nuevosNoPresentes, null, 'Productos nuevos que aún no están presentes en el inventario del cliente.'],
                      ].map(([label, skuValue, unitValue, note]) => (
                        <div key={label} className="border p-3" style={{ borderColor: '#e5e0d5', background: '#faf8f3' }}>
                          <div className="text-xs text-stone-500">{label}</div>
                          <div className="text-lg font-bold" style={{ color: skuValue > 0 ? '#b91c1c' : '#15803d' }}>{renderServiceValue(skuValue)} SKU</div>
                          {unitValue !== null && unitValue !== undefined && (
                            <div className="text-xs font-bold text-stone-600">{renderServiceValue(unitValue)} Unidades</div>
                          )}
                          {note && <div className="text-[10px] text-stone-500 mt-2">{note}</div>}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 font-bold" style={{ background: '#dcfce7', color: '#166534' }}>Pareto A: Vitales · {renderServiceValue(dashboardPareto.skusPocosVitales)} SKU · {renderServiceValue(dashboardPareto.unidadesPocosVitales)} Unidades · {fmtPctPoints(dashboardPareto.pctVentasA)}</span>
                      <span className="px-2 py-1 font-bold" style={{ background: '#dbeafe', color: '#1e40af' }}>Pareto B/C: Complementarios · {renderServiceValue(dashboardPareto.skusColaLarga)} SKU · {renderServiceValue(dashboardPareto.unidadesColaLarga)} Unidades · {fmtPctPoints(dashboardPareto.pctVentasColaLarga)}</span>
                      <span className="px-2 py-1 font-bold" style={{ background: '#fef3c7', color: '#92400e' }}>Con ventas: {renderServiceValue(dashboardPareto.totalSkusConVentas)} SKU · {renderServiceValue(dashboardPareto.totalUnidadesConVentas)} Unidades</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })()}

        {activeTab === 'dashboard' && resultados && (
          <>
            {/* HEADER DEL DASHBOARD CON CONTEXTO DEL CLIENTE */}
            <div className="bg-white border shadow-sm" style={{ borderColor: '#e5e0d5' }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: '#e5e0d5', background: '#0a2540' }}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest" style={{ color: '#d4af37' }}>Cliente analizado</div>
                    <div className="text-xl font-bold mt-1" style={{ fontFamily: '"Times New Roman", serif', color: '#faf8f3' }}>
                      {config.nombreCliente || '(sin nombre)'}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#d4af37' }}>
                      Código: {config.codigoCliente || '—'} · {config.pais}
                    </div>
                  </div>
                  <div className="text-right text-xs" style={{ color: '#faf8f3' }}>
                    <div className="opacity-70">Fecha de corte</div>
                    <div className="font-bold text-sm" style={{ color: '#d4af37' }}>
                      {config.fechaCorte}
                    </div>
                    <div className="opacity-70 mt-1">{config.periodoAnalizado}{config.periodoDetalle ? ` · ${config.periodoDetalle}` : ''}</div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs" style={{ background: '#faf8f3' }}>
                <div>
                  <div className="text-stone-500 uppercase text-[10px] tracking-wider">Safety Stock</div>
                  <div className="font-bold" style={{ color: '#0a2540' }}>{config.safetyStockSemanas} semanas</div>
                </div>
                <div>
                  <div className="text-stone-500 uppercase text-[10px] tracking-wider">Lead Time USA</div>
                  <div className="font-bold" style={{ color: '#0a2540' }}>{config.leadTimeUSA} semanas</div>
                </div>
                <div>
                  <div className="text-stone-500 uppercase text-[10px] tracking-wider">Lead Time China</div>
                  <div className="font-bold" style={{ color: '#0a2540' }}>{config.leadTimeCHINA} semanas</div>
                </div>
                <div>
                  <div className="text-stone-500 uppercase text-[10px] tracking-wider">SKUs en cruce</div>
                  <div className="font-bold" style={{ color: '#0a2540' }}>{renderServiceValue(resultados.totales?.totalSKUs)}</div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'dashboard' && resultados && (
          <>
            {/* KPIs */}
            <div className="bg-white border shadow-sm" style={{ borderColor: '#e5e0d5' }}>
              <div className="px-6 py-4 border-b flex items-center justify-between flex-wrap gap-3" style={{ borderColor: '#e5e0d5', background: '#faf8f3' }}>
                <h2 className="text-lg flex items-center gap-2" style={{ fontFamily: '"Times New Roman", serif', color: '#0a2540' }}>
                  <TrendingDown className="w-5 h-5" style={{ color: '#d4af37' }} />
                  Resumen ejecutivo
                </h2>
                <div className="flex gap-2">
                  <button onClick={exportarExcel} 
                    className="px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-sm hover:opacity-90"
                    style={{ background: '#0a2540', color: '#faf8f3' }}>
                    <FileSpreadsheet className="w-3.5 h-3.5" />Exportar Excel (todas las hojas)
                  </button>
                  <button onClick={exportarCSV} 
                    className="px-3 py-1.5 text-xs border flex items-center gap-1.5 hover:opacity-80"
                    style={{ borderColor: '#0a2540', color: '#0a2540' }}>
                    <Download className="w-3.5 h-3.5" />Exportar CSV
                  </button>
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <KPIUnitPair label="Total SKU" value={resultados.totales.totalSKUs} unitLabel="Total Unidades" unitValue={resultados.totales.totalUnidades} moneyLabel="Valor Inventario Total" moneyValue={fmtUSD(resultados.totales.valorTotalInventario)} />
                <KPIUnitPair label="SKU Activos" value={resultados.totales.skuActivos} unitLabel="Unidades Activas" unitValue={resultados.totales.unidadesActivas} moneyLabel="Valor Inventario SKU Activos" moneyValue={fmtUSD(resultados.totales.valorActivo)} color="#065f46" bg="#d1fae5" />
                <KPIUnitPair label="SKU con EOL definido" value={resultados.totales.skuEOL} unitLabel="Unidades con EOL definido" unitValue={resultados.totales.unidEOL} moneyLabel="Valor Inventario EOL" moneyValue={fmtUSD(resultados.totales.valorEOL)} color="#7f1d1d" bg="#fee2e2" />
                <KPIUnitPair label="SKU sin ventas" value={resultados.totales.skuSinVentas} unitLabel="Unidades sin ventas" unitValue={resultados.totales.unidadesSinVentas} moneyLabel="Valor inventario sin ventas" moneyValue={fmtUSD(resultados.totales.valorInventarioSinVentas)} color="#92400e" bg="#fef3c7" />
                <KPIUnitPair label="SKU Sin Maestro" value={resultados.totales.sinMaestro} unitLabel="Unidades Sin Maestro" unitValue={resultados.totales.unidadesSinMaestro} moneyLabel="Valor Inventario Sin Maestro" moneyValue={fmtUSD(resultados.totales.valorSinMaestro)} />
              </div>

              <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-4 gap-3 border-t pt-5" style={{ borderColor: '#e5e0d5' }}>
                <KPIBig label="Valor Inv. EOL" value={fmtUSD(resultados.totales.valorEOL)} sub="Costo × Unidades" />
                <KPIBig label="Descuento Consumi total" value={fmtUSD(resultados.totales.descEOL)} sub="Descuento × Unidades" color="#d4af37" />
                <KPIBig label="Absorbe IOCA" value={fmtUSD(resultados.totales.ioaEOL)} sub="Exposición financiera IOCA" color="#1e40af" />
                <KPIBig label="Absorbe Retail" value={fmtUSD(resultados.totales.retailEOL)} sub="Carga del cliente" color="#065f46" />
              </div>
              <div className="px-6 pb-6">
                <DefinitionLegend ids={DEFINITION_GROUPS.executive} />
              </div>
            </div>

            {/* PANEL DE ALERTAS OPERATIVAS */}
            <div className="bg-white border shadow-sm" style={{ borderColor: '#e5e0d5' }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: '#e5e0d5', background: '#faf8f3' }}>
                <h2 className="text-lg flex items-center gap-2" style={{ fontFamily: '"Times New Roman", serif', color: '#0a2540' }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: '#92400e' }} />
                  Alertas operativas
                </h2>
                <div className="text-xs text-stone-500 mt-1">
                  Detección automática: conflictos de origen · merma operativa · quiebres bajo Inventario Seguridad · reposición sugerida
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 border-b" style={{ borderColor: '#e5e0d5' }}>
                <AlertaCard 
                  titulo="Sin Origen en Inv." 
                  valor={`${resultados.alertas.skusSinOrigen.length} SKU`}
                  sub="Asumidos como USA por default"
                  color={resultados.alertas.skusSinOrigen.length > 0 ? '#92400e' : '#065f46'}
                  bg={resultados.alertas.skusSinOrigen.length > 0 ? '#fef3c7' : '#d1fae5'}
                />
                <AlertaCard 
                  titulo={`Merma > ${(resultados.alertas.umbralMermaPct * 100).toFixed(0)}%`}
                  valor={`${resultados.alertas.skusConMerma.length} SKU`}
                  sub={`${resultados.alertas.totalMermaUnid} unidades · ${fmtUSD(resultados.alertas.totalMermaValor)}`}
                  color={resultados.alertas.skusConMerma.length > 0 ? '#92400e' : '#065f46'}
                  bg={resultados.alertas.skusConMerma.length > 0 ? '#fef3c7' : '#d1fae5'}
                />
                <AlertaCard 
                  titulo="Bajo Inv. Seguridad" 
                  valor={`${resultados.alertas.skusEnQuiebre.length} SKU`}
                  sub="Solo productos ACTIVO"
                  color={resultados.alertas.skusEnQuiebre.length > 0 ? '#7f1d1d' : '#065f46'}
                  bg={resultados.alertas.skusEnQuiebre.length > 0 ? '#fee2e2' : '#d1fae5'}
                />
                <AlertaCard 
                  titulo="Reposición Sugerida" 
                  valor={`${resultados.alertas.totalReposicionUnid} unidades`}
                  sub={fmtUSD(resultados.alertas.totalReposicionValor)}
                  color="#1e40af"
                  bg="#dbeafe"
                />
              </div>
              <div className="px-6 py-3 border-b" style={{ borderColor: '#e5e0d5' }}>
                <DefinitionLegend ids={DEFINITION_GROUPS.alerts} />
              </div>

              {resultados.alertas.skusSinOrigen.length > 0 && (
                <div className="p-6 border-b" style={{ borderColor: '#e5e0d5' }}>
                  <div className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: '#92400e' }}>
                    <AlertCircle className="w-4 h-4" />
                    SKUs sin Origen declarado en el Inventario
                  </div>
                  <div className="text-xs text-stone-600 mb-3">
                    El Inventario del cliente no especifica si el surtido fue vía USA o CHINA para estos SKUs. La herramienta asumió <strong>USA por default</strong> y aplicó el Costo USA del Maestro. Validar con el KAM o solicitar al cliente que actualice esta información.
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] border" style={{ borderColor: '#e5e0d5' }}>
                      <thead style={{ background: '#92400e', color: 'white' }}>
                        <tr>
                          <Th>SKU</Th><Th>Modelo</Th><Th>Estado</Th>
                          <Th align="right">Costo USA aplicado</Th><Th align="right">Costo CHINA (alterno)</Th>
                          <Th align="right">Delta</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultados.alertas.skusSinOrigen.map((r, i) => (
                          <tr key={i} className="border-t" style={{ borderColor: '#e5e0d5' }}>
                            <Td><ProductSkuCell imageUrl={r.imageUrl} productUrl={r.productUrl}>{r.sku}</ProductSkuCell></Td>
                            <Td className="text-stone-600">{r.modelo}</Td>
                            <Td>{r.estado}</Td>
                            <Td align="right" bold style={{ color: '#1e40af' }}>{fmtUSD(r.costoUSA)}</Td>
                            <Td align="right" className="text-stone-600">{fmtUSD(r.costoCHINA)}</Td>
                            <Td align="right" bold style={{ color: isAvailablePrice(subtractPrices(r.costoUSA, r.costoCHINA)) && subtractPrices(r.costoUSA, r.costoCHINA) > 0 ? '#7f1d1d' : '#065f46' }}>
                              {fmtUSD(subtractPrices(r.costoUSA, r.costoCHINA))}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {resultados.alertas.skusConMerma.length > 0 && (
                <div className="p-6 border-b" style={{ borderColor: '#e5e0d5' }}>
                  <div className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: '#92400e' }}>
                    <TrendingDown className="w-4 h-4" />
                    SKUs con merma operativa &gt; {(resultados.alertas.umbralMermaPct * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-stone-600 mb-3">
                    Merma = Inv Proyectado − Inv Final. Causas posibles: ventas no captadas, transferencias no reportadas, mermas físicas, ajustes de inventario. Validar con el KAM y el cliente.
                  </div>
                  <div className="mb-3">
                    <DefinitionLegend ids={['merma', 'mermaPct', 'inventoryValue']} />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] border" style={{ borderColor: '#e5e0d5' }}>
                      <thead style={{ background: '#92400e', color: 'white' }}>
                        <tr>
                          <Th>SKU</Th><Th>Modelo</Th>
                          <Th align="center">Inv Inicial</Th><Th align="center">Compra</Th>
                          <Th align="center">Ventas</Th><Th align="center">Proyectado</Th>
                          <Th align="center">Inv Final</Th><Th align="center">Merma (u)</Th>
                          <Th align="center">Merma %</Th><Th align="right">Costo Merma</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultados.alertas.skusConMerma.map((r, i) => (
                          <tr key={i} className="border-t" style={{ borderColor: '#e5e0d5' }}>
                            <Td><ProductSkuCell imageUrl={r.imageUrl} productUrl={r.productUrl}>{r.sku}</ProductSkuCell></Td>
                            <Td className="text-stone-600">{r.modelo}</Td>
                            <Td align="center">{r.invInicial}</Td>
                            <Td align="center">{r.compra}</Td>
                            <Td align="center">{r.ventas}</Td>
                            <Td align="center">{r.invProyectado}</Td>
                            <Td align="center">{r.invFinal}</Td>
                            <Td align="center" bold style={{ background: '#fef3c7', color: '#92400e' }}>{r.merma}</Td>
                            <Td align="center" bold style={{ color: '#92400e' }}>{(r.mermaPct * 100).toFixed(0)}%</Td>
                            <Td align="right" bold>{fmtUSD(multiplyPrice(r.costo, r.merma))}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {resultados.alertas.skusEnQuiebre.length > 0 && (
                <div className="p-6">
                  <div className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: '#7f1d1d' }}>
                    <AlertCircle className="w-4 h-4" />
                    SKUs bajo Inventario Seguridad IOCA — Motor V1 · paralelo comparativo
                  </div>
                  <div className="text-xs text-stone-600 mb-2">
                    La alerta se dispara cuando el <strong>Inventario Proyectado</strong> es menor que el <strong>Inv. Seguridad IOCA</strong>. La reposición final descuenta Compra como inventario en tránsito.
                  </div>

                  {/* Nota compacta de la fórmula IOCA V1 */}
                  <div className="mb-3 p-3 border-l-4 text-[11px]" style={{ borderColor: '#d4af37', background: '#faf8f3', color: '#444' }}>
                    <div className="font-bold mb-1" style={{ color: '#0a2540' }}>Motor Inv. Seguridad IOCA V1 — fórmula aplicada:</div>
                    <div className="font-mono text-[10px] mb-1 p-1.5" style={{ background: '#0a2540', color: '#d4af37' }}>
                      {NOTA_INV_SEGURIDAD.formula}
                    </div>
                    <div>
                      <strong>Condiciones:</strong> Si Ventas &gt; 0 → aplica fórmula IOCA (Fuente: IOCA). Si Ventas = 0 → se mantiene el valor del cliente (Fuente: Cliente). Lead Time según origen del SKU.
                    </div>
                    <div className="mt-1">
                      <strong>Semanas del período aplicadas:</strong> {renderServiceValue(resultados.semanasPeriodoUsadas)} · <strong>Safety Stock:</strong> {config.safetyStockSemanas} sem · <strong>Lead Time USA:</strong> {config.leadTimeUSA} sem · <strong>Lead Time China:</strong> {config.leadTimeCHINA} sem
                    </div>
                  </div>

                  <div className="mb-3">
                    <DefinitionLegend
                      ids={DEFINITION_GROUPS.safety}
                      title="Definiciones y fórmulas de todas las columnas"
                    />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] border" style={{ borderColor: '#e5e0d5' }}>
                      <thead style={{ background: '#7f1d1d', color: 'white' }}>
                        <tr>
                          <Th>SKU</Th><Th>Modelo</Th>
                          <Th align="center">Estado</Th><Th align="center">Origen</Th>
                          <Th align="center">Inv. Seg. Cliente</Th>
                          <Th align="center">Inv. Seg. IOCA</Th>
                          <Th align="center">Δ IOCA-Cliente</Th>
                          <Th align="center">Fuente</Th>
                          <Th align="center">Inv. Proyectado</Th>
                          <Th align="center">Compra</Th>
                          <Th align="center">Necesidad</Th>
                          <Th align="center">Reposición Final</Th>
                          <Th>Acción Sugerida</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultados.alertas.skusEnQuiebre.map((r, i) => {
                          const esActivo = r.estado === 'ACTIVO';
                          const deltaColor = r.deltaInvSeguridad > 0 ? '#7f1d1d' : (r.deltaInvSeguridad < 0 ? '#065f46' : '#666');
                          return (
                            <tr key={i} className="border-t" style={{ borderColor: '#e5e0d5' }}>
                              <Td><ProductSkuCell imageUrl={r.imageUrl} productUrl={r.productUrl}>{r.sku}</ProductSkuCell></Td>
                              <Td className="text-stone-600">{r.modelo}</Td>
                              <Td align="center" bold>
                                <span className="px-2 py-0.5 text-[10px]" style={{
                                  background: esActivo ? '#d1fae5' : '#fee2e2',
                                  color: esActivo ? '#065f46' : '#7f1d1d',
                                }}>{renderServiceValue(r.estado)}</span>
                              </Td>
                              <Td align="center" className="text-stone-600">{r.origen}</Td>
                              <Td align="center">{r.invSeguridad}</Td>
                              <Td align="center" bold style={{ background: '#faf8f3', color: '#0a2540' }}>{r.invSeguridadIOCA}</Td>
                              <Td align="center" bold style={{ color: deltaColor }}>
                                {r.deltaInvSeguridad > 0 ? '+' : ''}{r.deltaInvSeguridad}
                              </Td>
                              <Td align="center">
                                <span className="px-2 py-0.5 text-[10px] font-bold" style={{
                                  background: r.fuenteInvSeguridad === 'IOCA' ? '#d4af37' : '#e5e0d5',
                                  color: r.fuenteInvSeguridad === 'IOCA' ? '#0a2540' : '#666',
                                }}>{renderServiceValue(r.fuenteInvSeguridad)}</span>
                              </Td>
                              <Td align="center" bold style={{ color: '#7f1d1d' }}>{r.invProyectado}</Td>
                              <Td align="center">{r.compra}</Td>
                              <Td align="center">{r.necesidadReposicion}</Td>
                              <Td align="center" bold style={{
                                background: esActivo ? '#dbeafe' : '#f5f5f0',
                                color: esActivo ? '#1e40af' : '#999'
                              }}>
                                {esActivo ? r.reposicionSugerida : '🔒'}
                              </Td>
                              <Td bold style={{
                                color: esActivo ? '#1e40af' : '#92400e',
                                fontSize: '10px'
                              }}>{r.accionSugerida}</Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border shadow-sm" style={{ borderColor: '#e5e0d5' }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: '#e5e0d5', background: '#faf8f3' }}>
                <h2 className="text-lg flex items-center gap-2" style={{ fontFamily: '"Times New Roman", serif', color: '#0a2540' }}>
                  <Calendar className="w-5 h-5" style={{ color: '#1e40af' }} />
                  Nuevos no presentes en el inventario del cliente
                </h2>
                <div className="text-xs text-stone-500 mt-1">
                  Productos del Maestro con menos de 90 días desde su fecha de creación y cuyo SKU no está presente en el inventario. Esta lista no calcula reposición.
                </div>
              </div>
              <div className="px-6 py-3 border-b" style={{ borderColor: '#e5e0d5' }}>
                <DefinitionLegend ids={DEFINITION_GROUPS.newProducts} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead style={{ background: '#0a2540', color: '#faf8f3' }}>
                    <tr>
                      <Th>SKU</Th><Th>Producto / Modelo</Th><Th>Marca</Th><Th>Categoría</Th><Th align="center">Fecha de creación</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosNuevosNoPresentes.length === 0 && (
                      <tr><td colSpan={5} className="p-6 text-center text-stone-500">No hay productos nuevos ausentes del inventario.</td></tr>
                    )}
                    {productosNuevosNoPresentes.map((product) => (
                      <tr key={product.sku} className="border-t" style={{ borderColor: '#e5e0d5' }}>
                        <Td><ProductSkuCell imageUrl={product.imageUrl} productUrl={product.productUrl}>{product.sku}</ProductSkuCell></Td>
                        <Td className="text-stone-600">{product.modelo}</Td>
                        <Td>{product.marca}</Td>
                        <Td>{product.categoria}</Td>
                        <Td align="center">{normalizeFechaStr(product.creationDate)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* INVENTARIO EN TRÁNSITO */}
            <div className="bg-white border shadow-sm" style={{ borderColor: '#e5e0d5' }}>
              <div className="px-6 py-4 border-b flex items-center justify-between flex-wrap gap-3" style={{ borderColor: '#e5e0d5', background: '#faf8f3' }}>
                <div>
                  <h2 className="text-lg flex items-center gap-2" style={{ fontFamily: '"Times New Roman", serif', color: '#0a2540' }}>
                    <Package className="w-5 h-5" style={{ color: '#1e40af' }} />
                    Inventario en tránsito
                  </h2>
                  <div className="text-xs text-stone-500 mt-1">Compra representa unidades en tránsito; incluye productos EOL aunque su reposición final sea cero.</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="px-4 py-2 text-center" style={{ background: '#dbeafe', color: '#1e40af' }}>
                    <div className="text-[10px] uppercase tracking-wider">Total unidades en tránsito</div>
                    <div className="text-2xl font-bold">{renderServiceValue(resultados.alertas?.totalUnidadesTransito)}</div>
                  </div>
                  <div className="px-4 py-2 text-center" style={{ background: '#dcfce7', color: '#166534' }}>
                    <div className="text-[10px] uppercase tracking-wider">Total valor en tránsito</div>
                    <div className="text-2xl font-bold">{fmtUSD(resultados.alertas?.totalValorTransito)}</div>
                  </div>
                </div>
              </div>
              <div className="px-6 py-3 border-b" style={{ borderColor: '#e5e0d5' }}>
                <DefinitionLegend ids={DEFINITION_GROUPS.transit} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead style={{ background: '#0a2540', color: '#faf8f3' }}>
                    <tr><Th>SKU</Th><Th>Modelo</Th><Th align="center">Estado</Th><Th align="center">Nivel</Th><Th align="right">Unidades en tránsito</Th><Th align="right">Valor en tránsito</Th></tr>
                  </thead>
                  <tbody>
                    {resultados.alertas.productosEnTransito.length === 0 && (
                      <tr><td colSpan={6} className="p-6 text-center text-stone-500">No hay unidades en tránsito.</td></tr>
                    )}
                    {resultados.alertas.productosEnTransito.map((r) => (
                      <tr key={r.sku} className="border-t" style={{ borderColor: '#e5e0d5' }}>
                        <Td><ProductSkuCell imageUrl={r.imageUrl} productUrl={r.productUrl}>{r.sku}</ProductSkuCell></Td>
                        <Td className="text-stone-600">{r.modelo}</Td>
                        <Td align="center">{r.estado}</Td>
                        <Td align="center" bold>{r.tier || 'SIN CATEGORIA'}</Td>
                        <Td align="right" bold style={{ color: '#1e40af' }}>{r.unidadesEnTransito}</Td>
                        <Td align="right" bold style={{ color: '#166534' }}>{fmtUSD(r.valorEnTransito)}</Td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold" style={{ borderColor: '#0a2540', background: '#faf8f3' }}>
                      <td colSpan={4} className="p-3 text-right">TOTAL GLOBAL</td>
                      <td className="p-3 text-right">{renderServiceValue(resultados.alertas?.totalUnidadesTransito)}</td>
                      <td className="p-3 text-right" style={{ color: '#166534' }}>{fmtUSD(resultados.alertas?.totalValorTransito)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* PANEL DE DISTRIBUCIÓN POR TIER (GBB) */}
            <div className="bg-white border shadow-sm" style={{ borderColor: '#e5e0d5' }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: '#e5e0d5', background: '#faf8f3' }}>
                <h2 className="text-lg flex items-center gap-2" style={{ fontFamily: '"Times New Roman", serif', color: '#0a2540' }}>
                  <Package className="w-5 h-5" style={{ color: '#d4af37' }} />
                  Distribución por Tier (Good / Better / Best / EOL)
                </h2>
                <div className="text-xs text-stone-500 mt-1">
                  Mix Balanceado con GOOD, BETTER, BEST y EOL. Las tres vistas incluyen todas las unidades y permiten comparar inventario, ventas y reposición.
                </div>
              </div>

              <div className="px-6 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <KPIBig
                  label="Cantidad de SKU"
                  value={resultados.distribucionTier.inventario.totalSKUs}
                  sub="GOOD + BETTER + BEST + EOL"
                />
                <KPIBig
                  label="Cantidad de Unidades"
                  value={resultados.distribucionTier.inventario.totalU}
                  sub="GOOD + BETTER + BEST + EOL"
                />
              </div>

              <div className="px-6 pt-3">
                <DefinitionLegend ids={DEFINITION_GROUPS.distributions} />
              </div>

              <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <DistribTierPanel
                  titulo="Inventario Actual del Cliente"
                  subtitulo={`${resultados.distribucionTier.inventario.totalU} unidades · ${fmtUSD(resultados.distribucionTier.inventario.totalV)} · ${resultados.distribucionTier.inventario.totalSKUs} SKUs`}
                  data={resultados.distribucionTier.inventario.tiers}
                />
                <DistribTierPanel
                  titulo="Ventas del Cliente"
                  subtitulo={`${resultados.distribucionTier.ventas.totalU} unidades · ${fmtUSD(resultados.distribucionTier.ventas.totalV)} · ${resultados.distribucionTier.ventas.totalSKUs} SKUs con venta`}
                  data={resultados.distribucionTier.ventas.tiers}
                />
                <DistribTierPanel
                  titulo="Reposición Sugerida"
                  subtitulo={`${resultados.distribucionTier.reposicion.totalU} unidades · ${fmtUSD(resultados.distribucionTier.reposicion.totalV)} · ${resultados.distribucionTier.reposicion.totalSKUs} SKUs`}
                  data={resultados.distribucionTier.reposicion.tiers}
                />
              </div>
            </div>

            {/* PANEL DE DISTRIBUCIÓN POR CATEGORÍA */}
            <div className="bg-white border shadow-sm" style={{ borderColor: '#e5e0d5' }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: '#e5e0d5', background: '#faf8f3' }}>
                <h2 className="text-lg flex items-center gap-2" style={{ fontFamily: '"Times New Roman", serif', color: '#0a2540' }}>
                  <Package className="w-5 h-5" style={{ color: '#d4af37' }} />
                  Distribución por Categoría
                </h2>
                <div className="text-xs text-stone-500 mt-1">
                  Tres vistas paralelas por categoría del Maestro: lo que el cliente <strong>tiene en piso</strong>, lo que <strong>está vendiendo</strong>, y lo que IOCA <strong>sugiere reponer</strong>. Categorías detectadas: <strong>{resultados.distribucionCategoria.lista.join(' · ')}</strong>
                </div>
              </div>

              <div className="px-6 pt-3">
                <DefinitionLegend ids={DEFINITION_GROUPS.distributions} />
              </div>

              <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <DistribCategoriaPanel
                  titulo="Inventario Actual del Cliente"
                  subtitulo={`${resultados.distribucionCategoria.inventario.totalU} unidades · ${fmtUSD(resultados.distribucionCategoria.inventario.totalV)} · ${resultados.distribucionCategoria.inventario.totalSKUs} SKUs`}
                  data={resultados.distribucionCategoria.inventario}
                  listaCategorias={resultados.distribucionCategoria.lista}
                />
                <DistribCategoriaPanel
                  titulo="Ventas del Cliente"
                  subtitulo={`${resultados.distribucionCategoria.ventas.totalU} unidades · ${fmtUSD(resultados.distribucionCategoria.ventas.totalV)} · ${resultados.distribucionCategoria.ventas.totalSKUs} SKUs con venta`}
                  data={resultados.distribucionCategoria.ventas}
                  listaCategorias={resultados.distribucionCategoria.lista}
                />
                <DistribCategoriaPanel
                  titulo="Reposición Sugerida"
                  subtitulo={`${resultados.distribucionCategoria.reposicion.totalU} unidades · ${fmtUSD(resultados.distribucionCategoria.reposicion.totalV)} · ${resultados.distribucionCategoria.reposicion.totalSKUs} SKUs`}
                  data={resultados.distribucionCategoria.reposicion}
                  listaCategorias={resultados.distribucionCategoria.lista}
                />
              </div>
            </div>

            {/* PANEL DE ANÁLISIS PARETO A/B/C */}
            <div className="bg-white border shadow-sm" style={{ borderColor: '#e5e0d5' }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: '#e5e0d5', background: '#faf8f3' }}>
                <h2 className="text-lg flex items-center gap-2" style={{ fontFamily: '"Times New Roman", serif', color: '#0a2540' }}>
                  <TrendingDown className="w-5 h-5" style={{ color: '#d4af37' }} />
                  Análisis Pareto A/B/C (unidades vendidas)
                </h2>
                <div className="text-xs text-stone-500 mt-1">
                  Clasificación técnica por participación acumulada real de unidades vendidas: A, B y C.
                </div>
              </div>

              {/* KPIs de Pareto */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-3 border-b" style={{ borderColor: '#e5e0d5' }}>
                <AlertaCard
                  titulo="Pareto A"
                  valor={`${resultados.analisisPareto.skusParetoA.length} SKUs`}
                  sub={`Mayor contribución · ${resultados.analisisPareto.pctSKUsA.toFixed(0)}% del portafolio · ${resultados.analisisPareto.pctVentasA.toFixed(0)}% de las ventas`}
                  color="#065f46"
                  bg="#d1fae5"
                />
                <AlertaCard
                  titulo="Pareto B"
                  valor={`${resultados.analisisPareto.skusParetoB.length} SKUs`}
                  sub={`Contribución intermedia · ${resultados.analisisPareto.pctSKUsB.toFixed(0)}% del portafolio · ${resultados.analisisPareto.pctVentasB.toFixed(0)}% de las ventas`}
                  color="#92400e"
                  bg="#fef3c7"
                />
                <AlertaCard
                  titulo="Pareto C"
                  valor={`${resultados.analisisPareto.skusParetoC.length} SKUs`}
                  sub={`Contribución restante/menor · ${resultados.analisisPareto.pctSKUsC.toFixed(0)}% del portafolio · ${resultados.analisisPareto.pctVentasC.toFixed(0)}% de las ventas`}
                  color="#7f1d1d"
                  bg="#fee2e2"
                />
                <AlertaCard
                  titulo="Tipo de distribución"
                  valor={resultados.analisisPareto.interpretacion.titulo}
                  sub={`${resultados.analisisPareto.totalSkusConVentas} SKUs con ventas · ${resultados.analisisPareto.totalVentas} unidades`}
                  color={resultados.analisisPareto.interpretacion.color}
                  bg={resultados.analisisPareto.interpretacion.bg}
                />
              </div>

              <div className="px-6 py-3 border-b" style={{ borderColor: '#e5e0d5' }}>
                <DefinitionLegend ids={DEFINITION_GROUPS.pareto} />
              </div>

              {/* Interpretación de 2 líneas */}
              <div className="p-6 border-b" style={{ borderColor: '#e5e0d5' }}>
                <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Interpretación y sugerencia de reposición</div>
                <div className="p-4 border-l-4" style={{
                  background: resultados.analisisPareto.interpretacion.bg,
                  borderColor: resultados.analisisPareto.interpretacion.color,
                }}>
                  <div className="text-sm font-bold mb-1" style={{ color: resultados.analisisPareto.interpretacion.color }}>
                    {renderServiceValue(resultados.analisisPareto?.interpretacion?.linea1)}
                  </div>
                  <div className="text-sm" style={{ color: resultados.analisisPareto.interpretacion.color }}>
                    {renderServiceValue(resultados.analisisPareto?.interpretacion?.linea2)}
                  </div>
                </div>
              </div>

              {/* Tabla de SKUs ordenados */}
              {resultados.analisisPareto.totalSkusConVentas > 0 && (
                <div className="p-6">
                  <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">SKUs ordenados por velocidad de ventas</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] border" style={{ borderColor: '#e5e0d5' }}>
                      <thead style={{ background: '#0a2540', color: '#faf8f3' }}>
                        <tr>
                          <Th align="center">Clase</Th>
                          <Th>SKU</Th><Th>Modelo</Th><Th>Marca</Th>
                          <Th align="center">Estado</Th><Th align="center">Tier</Th>
                          <Th align="right">Ventas (u)</Th>
                          <Th align="right">% Ventas</Th>
                          <Th align="right">% Acum.</Th>
                          <Th align="right">Inv. Final</Th>
                          <Th align="center">Acción Reposición</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ...resultados.analisisPareto.skusParetoA,
                          ...resultados.analisisPareto.skusParetoB,
                          ...resultados.analisisPareto.skusParetoC,
                        ].map((r, i) => {
                          const esA = r.paretoClase === 'A';
                          const paretoStyle = PARETO_CLASS_STYLES[r.paretoClase]
                            || PARETO_CLASS_STYLES.C;
                          const tierColor = TIER_COLORS[r.tier?.toUpperCase()] || TIER_COLORS.GOOD;
                          let accionRepo = '';
                          let accionColor = '#999';
                          if (r.estado === 'EOL') {
                            accionRepo = obtenerRecomendacionEOL({
                              bucket: r.bucket,
                              paretoClase: r.paretoClase,
                            });
                            accionColor = '#7f1d1d';
                          } else if (esA && r.estado === 'ACTIVO') {
                            accionRepo = 'Reposición prioritaria';
                            accionColor = '#065f46';
                          } else if (!esA && r.estado === 'ACTIVO') {
                            accionRepo = 'Stock mínimo';
                            accionColor = '#92400e';
                          } else {
                            accionRepo = 'Agregar al Maestro y decidir';
                            accionColor = '#999';
                          }
                          return (
                            <tr key={i} className="border-t" style={{ borderColor: '#e5e0d5' }}>
                              <Td align="center">
                                <span className="px-2 py-0.5 text-[10px] font-bold" style={{
                                  background: paretoStyle.badge,
                                  color: 'white',
                                }}>{renderServiceValue(r.paretoClase)}</span>
                              </Td>
                              <Td><ProductSkuCell imageUrl={r.imageUrl} productUrl={r.productUrl}>{r.sku}</ProductSkuCell></Td>
                              <Td className="text-stone-600">{r.modelo}</Td>
                              <Td>{r.marca}</Td>
                              <Td align="center">
                                <span className="px-2 py-0.5 text-[10px]" style={{
                                  background: r.estado === 'ACTIVO' ? '#d1fae5' : '#fee2e2',
                                  color: r.estado === 'ACTIVO' ? '#065f46' : '#7f1d1d',
                                }}>{renderServiceValue(r.estado)}</span>
                              </Td>
                              <Td align="center">
                                <span className="px-2 py-0.5 text-[10px] font-bold" style={{
                                  background: tierColor.bg, color: tierColor.textColor,
                                }}>{renderServiceValue(r.tier, 'GOOD')}</span>
                              </Td>
                              <Td align="right" bold>{r.ventas}</Td>
                              <Td align="right">{(r.pctVentas * 100).toFixed(0)}%</Td>
                              <Td align="right" bold style={{
                                background: paretoStyle.background,
                                color: paretoStyle.text,
                              }}>{(r.pctAcum * 100).toFixed(0)}%</Td>
                              <Td align="right" bold>{r.invFinal}</Td>
                              <Td align="center" bold style={{ color: accionColor, fontSize: '10px' }}>{accionRepo}</Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* La UI solo selecciona resultados positivos; la reposición llega calculada por dominio. */}
            <div className="bg-white border shadow-sm" style={{ borderColor: '#e5e0d5' }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: '#e5e0d5', background: '#faf8f3' }}>
                <h2 className="text-lg flex items-center gap-2" style={{ fontFamily: '"Times New Roman", serif', color: '#0a2540' }}>
                  <Package className="w-5 h-5" style={{ color: '#1e40af' }} />
                  Productos de Reposición Sugerida
                </h2>
                <div className="text-xs text-stone-500 mt-1">
                  Productos con reposición sugerida mayor que cero, según el cálculo vigente del dominio.
                </div>
              </div>
              <div className="px-6 py-3 border-b" style={{ borderColor: '#e5e0d5' }}>
                <DefinitionLegend ids={DEFINITION_GROUPS.replenishment} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead style={{ background: '#0a2540', color: '#faf8f3' }}>
                    <tr>
                      <Th>SKU</Th>
                      <Th>Descripción</Th>
                      <Th align="center">Nivel</Th>
                      <Th align="center">Inv. Proyectado</Th>
                      <Th align="center">Compra / Tránsito</Th>
                      <Th align="center">Reposición Sugerida</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {productosReposicionSugerida.length === 0 && (
                      <tr><td colSpan={6} className="p-6 text-center text-stone-500">No hay productos con reposición sugerida.</td></tr>
                    )}
                    {productosReposicionSugerida.map((record, index) => (
                      <tr key={`${record.sku}-${index}`} className="border-t hover:bg-stone-50" style={{ borderColor: '#e5e0d5' }}>
                        <Td><ProductSkuCell imageUrl={record.imageUrl} productUrl={record.productUrl}>{record.sku}</ProductSkuCell></Td>
                        <Td className="text-stone-600">{record.modelo}</Td>
                        <Td align="center">{record.tier}</Td>
                        <Td align="center">{record.invProyectado}</Td>
                        <Td align="center">{record.compra}</Td>
                        <Td align="center" bold style={{ color: '#1e40af', background: '#dbeafe' }}>{record.reposicionSugerida}</Td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {/* Totaliza la selección visible con el total de reposición provisto por dominio. */}
                    <tr className="border-t-2 font-bold" style={{ borderColor: '#0a2540', background: '#faf8f3' }}>
                      <td colSpan={3} className="p-3 text-right">TOTAL</td>
                      <td className="p-3 text-center">Total SKU incluidos: {productosReposicionSugerida.length}</td>
                      <td className="p-3 text-center">—</td>
                      <td className="p-3 text-center" style={{ color: '#1e40af' }}>Total unidades de Reposición Sugerida: {renderServiceValue(resultados.alertas.totalReposicionUnid)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* DETALLE DEL MISMO UNIVERSO DEL KPI EOL */}
            <div className="bg-white border shadow-sm" style={{ borderColor: '#e5e0d5' }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: '#e5e0d5', background: '#faf8f3' }}>
                <div>
                  <h2 className="text-lg flex items-center gap-2" style={{ fontFamily: '"Times New Roman", serif', color: '#0a2540' }}>
                    <Package className="w-5 h-5" style={{ color: '#7f1d1d' }} />
                    SKUs con EOL definido
                  </h2>
                  <div className="text-xs text-stone-500 mt-1">
                    Mismo universo del KPI: <strong>{resultados.totales.skuEOL} SKU</strong> · <strong>{resultados.totales.unidEOL} unidades</strong> · <strong>{fmtUSD(resultados.totales.valorEOL)}</strong>. La FASE EOL usa la Fecha base EOL.
                  </div>
                </div>
              </div>
              <div className="px-6 py-3 border-b" style={{ borderColor: '#e5e0d5' }}>
                <DefinitionLegend ids={DEFINITION_GROUPS.eol} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead style={{ background: '#0a2540', color: '#faf8f3' }}>
                    <tr>
                      <Th>SKU</Th><Th>Modelo</Th><Th>Marca</Th><Th>Fecha EOL</Th>
                      <Th align="center">Días EOL</Th><Th align="center">FASE EOL</Th>
                      <Th align="center">Fase desc.</Th><Th align="center">Origen</Th>
                      <Th align="right">Costo</Th><Th align="center">Desc. %</Th>
                      <Th align="right">Desc. Consumi $</Th><Th align="right">Aporte IOCA $</Th>
                      <Th align="right">Aporte Retail $</Th><Th align="center">Inv. Final</Th>
                      <Th align="right">Valor Inv.</Th><Th align="center">Porcentaje Rot.</Th>
                      <Th align="right">Desc. Total $</Th><Th>Acción EOL</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {eolDetailRows.length === 0 && (
                      <tr><td colSpan={18} className="p-6 text-center text-stone-500">No hay SKU con EOL definido en este inventario.</td></tr>
                    )}
                    {eolDetailRows.map((r, i) => {
                      const colorRot = colorPorcentajeRotacion(r.porcentajeRotacion);
                      const phaseStyle = getEolPhaseStyle(r.bucket);
                      const daysLabel = r.diasDesc === null
                        ? '—'
                        : (r.diasDesc >= 0
                          ? `${r.diasDesc} vencidos`
                          : `${Math.abs(r.diasDesc)} restantes`);
                      return (
                      <tr key={i} className="border-t hover:bg-stone-50" style={{ borderColor: '#e5e0d5' }}>
                        <Td><ProductSkuCell imageUrl={r.imageUrl} productUrl={r.productUrl}>{r.sku}</ProductSkuCell></Td>
                        <Td className="text-stone-600">{r.modelo}</Td>
                        <Td>{r.marca}</Td>
                        <Td align="center">{r.fechaStr || '—'}</Td>
                        <Td align="center">
                          <span className="px-2 py-0.5 font-bold" style={{
                            background: phaseStyle.background,
                            color: phaseStyle.color,
                          }}>{daysLabel}</span>
                        </Td>
                        <Td align="center" bold>
                          <span
                            data-eol-phase={phaseStyle.label}
                            className="px-2 py-0.5 text-[10px]"
                            style={{ background: phaseStyle.background, color: phaseStyle.color }}
                          >{phaseStyle.label}</span>
                        </Td>
                        <Td align="center">
                          {r.fase !== null ? (
                            <span className="px-2 py-0.5 font-bold" style={{
                              background: r.fase >= 3 ? '#fee2e2' : r.fase === 2 ? '#fef3c7' : r.fase === 1 ? '#dbeafe' : '#faf8f3',
                              color: r.fase >= 3 ? '#7f1d1d' : r.fase === 2 ? '#92400e' : r.fase === 1 ? '#1e40af' : '#0a2540',
                            }}>F{r.fase}</span>
                          ) : <span className="text-stone-400">—</span>}
                        </Td>
                        <Td align="center" bold>
                          <span className="px-2 py-0.5 text-[10px]" style={{
                            background: r.origen === 'CHINA' ? '#fef3c7' : '#dbeafe',
                            color: r.origen === 'CHINA' ? '#92400e' : '#1e40af',
                          }}>{renderServiceValue(r.origen)}</span>
                        </Td>
                        <Td align="right">{fmtUSD(r.costo)}</Td>
                        <Td align="center" bold>{r.descPct > 0 ? fmtPct(r.descPct) : <span className="text-stone-400 font-normal">—</span>}</Td>
                        <Td align="right" bold style={{ background: '#faf8f3', color: '#0a2540' }}>
                          {r.descUSD > 0 ? fmtUSD(r.descUSD) : <span className="text-stone-400 font-normal">—</span>}
                        </Td>
                        <Td align="right" style={{ background: '#dbeafe', color: '#1e40af' }}>
                          {r.ioaUSD > 0 ? fmtUSD(r.ioaUSD) : '—'}
                        </Td>
                        <Td align="right" style={{ background: '#d1fae5', color: '#065f46' }}>
                          {r.retailUSD > 0 ? fmtUSD(r.retailUSD) : '—'}
                        </Td>
                        <Td align="center" bold>{r.invFinal}</Td>
                        <Td align="right" bold>{fmtUSD(r.valorInv)}</Td>
                        <Td align="center" bold style={{ background: colorRot.bg, color: colorRot.fg }}>
                          {fmtPctPoints(r.porcentajeRotacion)}
                        </Td>
                        <Td align="right" bold>{fmtUSD(r.descTotal)}</Td>
                        <Td bold style={{ color: '#7f1d1d', fontSize: '10px' }}>
                          {obtenerRecomendacionEOL({
                            bucket: r.bucket,
                            paretoClase: paretoClassBySku.get(r.sku),
                          })}
                        </Td>
                      </tr>
                      );
                    })}
                  </tbody>
                  {eolDetailRows.length > 0 && (
                    <tfoot>
                      <tr style={{ background: '#0a2540', color: '#faf8f3' }}>
                        <td colSpan={13} className="px-3 py-2 text-right font-bold">TOTALES: {resultados.totales.skuEOL} SKU</td>
                        <td className="px-3 py-2 text-center font-bold">{renderServiceValue(resultados.totales.unidEOL)}</td>
                        <td className="px-3 py-2 text-right font-bold" style={{ color: '#d4af37' }}>{fmtUSD(resultados.totales.valorEOL)}</td>
                        <td className="px-3 py-2 text-center font-bold">—</td>
                        <td className="px-3 py-2 text-right font-bold" style={{ color: '#d4af37' }}>{fmtUSD(resultados.totales.descEOL)}</td>
                        <td className="px-3 py-2">—</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* SIN MAESTRO */}
            {resultados.sinMaestro.length > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-700 p-5">
                <div className="flex items-start gap-3 mb-3">
                  <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-amber-900">
                      ⚠ {resultados.sinMaestro.length} SKUs en inventario NO existen en el Maestro
                    </h3>
                    <div className="text-xs text-amber-800 mt-1">
                      Estos códigos están en el Inventario del Cliente pero no aparecen en Product Master Dataverse. Acción: actualizar Product Master con su estado correcto, precios y fecha si aplica.
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <DefinitionLegend ids={DEFINITION_GROUPS.noMaster} />
                </div>
                <div className="overflow-x-auto bg-white border" style={{ borderColor: '#fbbf24' }}>
                  <table className="w-full text-[11px]">
                    <thead className="bg-amber-100">
                      <tr>
                        <Th>SKU</Th><Th>Modelo (del inventario)</Th><Th>Tienda</Th><Th align="center">Inv. Final</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.sinMaestro.map((r, i) => (
                        <tr key={i} className="border-t" style={{ borderColor: '#fde68a' }}>
                          <Td><ProductSkuCell imageUrl={r.imageUrl} productUrl={r.productUrl}>{r.sku}</ProductSkuCell></Td>
                          <Td className="text-stone-600">{r.modelo}</Td>
                          <Td>{r.tienda}</Td>
                          <Td align="center" bold>{r.invFinal}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ACTIVOS (colapsable) */}
            {resultados.activos.length > 0 && (
              <div className="bg-white border shadow-sm" style={{ borderColor: '#e5e0d5' }}>
                <button onClick={() => setShowActivos(!showActivos)}
                  className="w-full px-6 py-4 border-b flex items-center justify-between hover:bg-stone-50"
                  style={{ borderColor: '#e5e0d5' }}>
                  <h2 className="text-lg flex items-center gap-2" style={{ fontFamily: '"Times New Roman", serif', color: '#0a2540' }}>
                    <CheckCircle2 className="w-5 h-5" style={{ color: '#065f46' }} />
                    SKUs Activos ({resultados.activos.length})
                  </h2>
                  <span className="text-xs text-stone-500">{showActivos ? 'Ocultar ▲' : 'Mostrar ▼'}</span>
                </button>
                {showActivos && (
                  <div className="overflow-x-auto">
                    <div className="px-6 py-3 text-[10px] text-stone-600 border-b" style={{ borderColor: '#e5e0d5', background: '#faf8f3' }}>
                      <strong>Porcentaje de Rotación = Ventas ÷ Inventario Inicial × 100.</strong>{' '}
                      <span style={{ color: '#065f46' }}>Verde: alta, &gt;100%</span> ·{' '}
                      <span style={{ color: '#1e40af' }}>Azul: normal, 33.33%–100%</span> ·{' '}
                      <span style={{ color: '#92400e' }}>Ámbar: lenta, 10%–&lt;33.33%</span> ·{' '}
                      <span style={{ color: '#7f1d1d' }}>Rojo: crítica, &lt;10%</span> ·{' '}
                      <span style={{ color: '#777' }}>Gris/—: Inventario Inicial = 0.</span>
                    </div>
                    <div className="px-6 py-3 border-b" style={{ borderColor: '#e5e0d5' }}>
                      <DefinitionLegend ids={DEFINITION_GROUPS.active} />
                    </div>
                    <table className="w-full text-[11px]">
                      <thead style={{ background: '#0a2540', color: '#faf8f3' }}>
                        <tr>
                          <Th>SKU</Th><Th>Modelo</Th><Th>Marca</Th><Th align="center">Origen</Th>
                          <Th align="right">Costo</Th><Th align="center">Inv. Final</Th>
                          <Th align="center">Porcentaje Rot.</Th>
                          <Th align="right">Valor Inv.</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultados.activos.map((r, i) => {
                          const colorRot = colorPorcentajeRotacion(r.porcentajeRotacion);
                          return (
                          <tr key={i} className="border-t hover:bg-stone-50" style={{ borderColor: '#e5e0d5' }}>
                            <Td><ProductSkuCell imageUrl={r.imageUrl} productUrl={r.productUrl}>{r.sku}</ProductSkuCell></Td>
                            <Td className="text-stone-600">{r.modelo}</Td>
                            <Td>{r.marca}</Td>
                            <Td align="center" bold>
                              <span className="px-2 py-0.5 text-[10px]" style={{
                                background: r.origen === 'CHINA' ? '#fef3c7' : '#dbeafe',
                                color: r.origen === 'CHINA' ? '#92400e' : '#1e40af',
                              }}>{renderServiceValue(r.origen)}</span>
                            </Td>
                            <Td align="right">{fmtUSD(r.costo)}</Td>
                            <Td align="center" bold>{r.invFinal}</Td>
                            <Td align="center" bold style={{ background: colorRot.bg, color: colorRot.fg }}>
                              {fmtPctPoints(r.porcentajeRotacion)}
                            </Td>
                            <Td align="right" bold style={{ background: '#d1fae5', color: '#065f46' }}>{fmtUSD(r.valorInv)}</Td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div className="mt-2 text-[10px] text-stone-600">
                      F4: más de 365 días, descuento consumidor {fase4DiscountLabel}, inventario mínimo reconocido 12; con menos de 12 unidades la liquidación la asume Retail.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* LÓGICA APLICADA (referencia institucional) */}
            <div className="bg-white border shadow-sm" style={{ borderColor: '#e5e0d5' }}>
              <button onClick={() => setShowLogica(!showLogica)}
                className="w-full px-6 py-4 border-b flex items-center justify-between hover:bg-stone-50"
                style={{ borderColor: '#e5e0d5', background: '#faf8f3' }}>
                <h2 className="text-lg flex items-center gap-2" style={{ fontFamily: '"Times New Roman", serif', color: '#0a2540' }}>
                  <FileText className="w-5 h-5" style={{ color: '#d4af37' }} />
                  Base de conocimiento institucional aplicada
                </h2>
                <span className="text-xs text-stone-500">{showLogica ? 'Ocultar ▲' : 'Ver Bucket EOL y Tabla de Fases ▼'}</span>
              </button>
              {showLogica && (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-bold mb-2" style={{ color: '#0a2540' }}>Bucket EOL (pre-vencimiento)</h3>
                    <table className="w-full text-[11px] border" style={{ borderColor: '#e5e0d5' }}>
                      <thead style={{ background: '#0a2540', color: '#faf8f3' }}>
                        <tr><Th>Bucket</Th><Th align="center">Días desde-hasta</Th><Th align="center">Umbral</Th></tr>
                      </thead>
                      <tbody>
                        {BUCKET_EOL.map((b, i) => (
                          <tr key={i} className="border-t" style={{ borderColor: '#e5e0d5' }}>
                            <Td bold>{b.bucket}</Td>
                            <Td align="center">{b.diasDesde}–{b.diasHasta}</Td>
                            <Td align="center" className="text-stone-600">{b.umbral}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-3 text-[10px] leading-relaxed text-stone-600">
                      <strong>EOL vencido:</strong> la fecha EOL es igual o anterior a la Fecha base EOL.{' '}
                      <strong>EOL crítico:</strong> faltan 1–27 días.{' '}
                      <strong>EOL próximo:</strong> faltan 28–83 días.{' '}
                      <strong>EOL planificado:</strong> faltan 84 días o más.{' '}
                      Cálculo: días restantes = Fecha EOL − Fecha base EOL; por ejemplo, 45 días restantes corresponde a EOL próximo.
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold mb-2" style={{ color: '#0a2540' }}>Tabla de Descuento por Fase</h3>
                    <div className="text-[10px] text-stone-500 mb-2">
                      Referencia interna para explicar el cálculo; no constituye comunicación de descuentos al consumidor.
                    </div>
                    <table className="w-full text-[11px] border" style={{ borderColor: '#e5e0d5' }}>
                      <thead style={{ background: '#0a2540', color: '#faf8f3' }}>
                        <tr><Th>Marca</Th><Th align="center">Fase</Th><Th align="center">Días</Th><Th align="center">Origen</Th><Th align="center">Desc.</Th><Th align="center">IOCA</Th><Th align="center">Retail</Th></tr>
                      </thead>
                      <tbody>
                        {phaseDiscountTable.map((f, i) => (
                          <tr key={i} className="border-t" style={{ borderColor: '#e5e0d5' }}>
                            <Td>{f.marca}</Td>
                            <Td align="center" bold>F{f.fase}</Td>
                            <Td align="center">{`≥${f.diasMin}`}</Td>
                            <Td align="center">{f.origen}</Td>
                            <Td align="center" bold>{fmtPct(f.descConsumidor)}</Td>
                            <Td align="center">{fmtPct(f.aporteIOCA)}</Td>
                            <Td align="center">{fmtPct(f.aporteRetail)}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ========================= TAB 4: INFORME EJECUTIVO ========================= */}
        {activeTab === 'informe' && !resultados && (
          <div className="bg-white border shadow-sm p-12 text-center" style={{ borderColor: '#e5e0d5' }}>
            <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: '#cbd5e1' }} />
            <div className="text-sm font-bold mb-1" style={{ color: '#0a2540' }}>Informe Ejecutivo sin datos</div>
            <div className="text-xs text-stone-500 mb-4">Primero carga el Inventario del Cliente y presiona "Calcular"; Product Master se obtiene de la fuente configurada.</div>
            <button onClick={() => setActiveTab('carga')}
              className="px-5 py-2 text-sm font-bold inline-flex items-center gap-2"
              style={{ background: '#0a2540', color: '#faf8f3' }}>
              <Upload className="w-4 h-4" /> Ir a Carga de Información
            </button>
          </div>
        )}

        {activeTab === 'informe' && resultados && (() => {
          const informe = generarInformeEjecutivo(resultados, config);
          if (!informe) return null;
          
          const prioridadColor = (p) => {
            if (p === 'CRÍTICA') return { bg: '#fee2e2', fg: '#7f1d1d', border: '#7f1d1d' };
            if (p === 'ALTA') return { bg: '#fef3c7', fg: '#92400e', border: '#92400e' };
            if (p === 'OPORTUNIDAD') return { bg: '#d1fae5', fg: '#065f46', border: '#065f46' };
            return { bg: '#dbeafe', fg: '#1e40af', border: '#1e40af' };
          };
          
          return (
            <>
              {/* CSS @media print */}
              <style>{`
                @media print {
                  @page { size: letter; margin: 1.5cm 1.8cm; }
                  body { background: white !important; }
                  /* Aislar el documento: solo el informe consultivo participa en la impresión. */
                  body * { visibility: hidden !important; }
                  .informe-pdf, .informe-pdf * { visibility: visible !important; }
                  .informe-pdf { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; }
                  .no-print { display: none !important; }
                  .informe-pdf {
                    box-shadow: none !important;
                    border: none !important;
                    background: white !important;
                    padding: 0 !important;
                  }
                  .page-break-before { page-break-before: always; }
                  .no-page-break { page-break-inside: avoid; }
                  table { page-break-inside: auto; }
                  tr { page-break-inside: avoid; page-break-after: auto; }
                  thead { display: table-header-group; }
                  h1, h2, h3 { page-break-after: avoid; }
                }
              `}</style>
              
              {/* CONTROLES — no se imprimen */}
              <div className="no-print bg-white border shadow-sm p-4 flex items-center justify-between flex-wrap gap-3" style={{ borderColor: '#e5e0d5' }}>
                <div className="text-xs text-stone-600">
                  <strong style={{ color: '#0a2540' }}>Informe Ejecutivo</strong> · Análisis consultivo del portafolio para presentar al comprador.
                  Al imprimir, selecciona <strong>"Guardar como PDF"</strong> como destino.
                </div>
                <button onClick={() => window.print()}
                  className="px-5 py-2 text-sm font-bold flex items-center gap-2 shadow-sm"
                  style={{ background: '#d4af37', color: '#0a2540' }}>
                  <Download className="w-4 h-4" /> Descargar PDF
                </button>
              </div>
              
              {/* CUERPO DEL INFORME (esto sí se imprime) */}
              <div className="informe-pdf bg-white border shadow-sm" style={{ borderColor: '#e5e0d5', padding: '40px 50px' }}>
                
                {/* PORTADA */}
                <div className="no-page-break" style={{ marginBottom: '40px', borderBottom: '4px solid #d4af37', paddingBottom: '20px' }}>
                  <div className="text-[10px] uppercase tracking-widest" style={{ color: '#d4af37' }}>
                    IOCA GROUP · SELL-THROUGH INTELLIGENCE <strong style={{ background: '#d4af37', color: '#0a2540', padding: '2px 8px' }}>V1</strong> · ANÁLISIS CONSULTIVO
                  </div>
                  <h1 style={{ fontFamily: '"Times New Roman", serif', fontSize: '28px', color: '#0a2540', marginTop: '12px', marginBottom: '8px' }}>
                    Informe Ejecutivo de Gestión de Portafolio
                  </h1>
                  <div style={{ fontFamily: '"Times New Roman", serif', fontSize: '16px', color: '#7f1d1d', fontStyle: 'italic' }}>
                    {config.nombreCliente || '(sin nombre del cliente)'} — {config.pais}
                  </div>
                  <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', fontSize: '11px', color: '#444' }}>
                    <div><strong style={{ color: '#0a2540' }}>Código cliente</strong><br />{config.codigoCliente || '—'}</div>
                    <div><strong style={{ color: '#0a2540' }}>Fecha de corte</strong><br />{config.fechaCorte}</div>
                    <div><strong style={{ color: '#0a2540' }}>Período</strong><br />{config.periodoAnalizado}{config.periodoDetalle ? ` · ${config.periodoDetalle}` : ''} ({renderServiceValue(resultados.semanasPeriodoUsadas)} sem)</div>
                    <div><strong style={{ color: '#0a2540' }}>SKUs analizados</strong><br />{renderServiceValue(resultados.totales?.totalSKUs)}</div>
                  </div>
                </div>
                
                {/* 1. RESUMEN EJECUTIVO */}
                <div className="no-page-break" style={{ marginBottom: '32px' }}>
                  <h2 style={{ fontFamily: '"Times New Roman", serif', fontSize: '20px', color: '#0a2540', borderLeft: '4px solid #d4af37', paddingLeft: '12px', marginBottom: '16px' }}>
                    1. Resumen Ejecutivo
                  </h2>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '16px' }}>
                    {[
                      ['Total SKU', resultados.totales.totalSKUs, 'Total Unidades', resultados.totales.totalUnidades],
                      ['SKU Activos', resultados.totales.skuActivos, 'Total Unidades Activas', resultados.totales.unidadesActivas],
                      ['SKU con EOL definido', resultados.totales.skuEOL, 'Total Unidades EOL', resultados.totales.unidEOL],
                      ['SKU sin ventas', resultados.totales.skuSinVentas, 'Unidades sin ventas', resultados.totales.unidadesSinVentas, 'Valor inventario sin ventas', resultados.totales.valorInventarioSinVentas],
                      ['SKU Sin Maestro', resultados.totales.sinMaestro, 'Total Unidades Sin Maestro', resultados.totales.unidadesSinMaestro],
                    ].map(([label, value, unitLabel, unitValue, moneyLabel, moneyValue]) => (
                      <div key={label} style={{ border: '1px solid #e5e0d5', padding: '8px', background: '#faf8f3' }}>
                        <div style={{ fontSize: '8px', textTransform: 'uppercase', color: '#666' }}>{label}</div>
                        <div style={{ fontSize: '17px', fontWeight: 'bold', color: '#0a2540' }}>{renderServiceValue(value)}</div>
                        <div style={{ borderTop: '1px solid #e5e0d5', marginTop: '5px', paddingTop: '5px', fontSize: '8px', color: '#666' }}>{unitLabel}</div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#0a2540' }}>{renderServiceValue(unitValue)}</div>
                        {moneyLabel && <><div style={{ borderTop: '1px solid #e5e0d5', marginTop: '5px', paddingTop: '5px', fontSize: '8px', color: '#666' }}>{moneyLabel}</div><div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0a2540' }}>{fmtUSD(moneyValue)}</div></>}
                      </div>
                    ))}
                  </div>

                  <div style={{ border: '1px solid #d4af37', padding: '12px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#0a2540', marginBottom: '8px', textTransform: 'uppercase' }}>Valorización del inventario</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                      {[
                        ['Valor Total Inventario', resultados.totales.valorTotalInventario],
                        ['Valor Activo', resultados.totales.valorActivo],
                        ['Valor EOL (todos)', resultados.totales.valorEOL],
                        ['Valor EOL Vencido', resultados.totales.valorEOLVencido],
                        ['Valor EOL Futuro', resultados.totales.valorEOLFuturo],
                        ['Valor Sin Maestro', resultados.totales.valorSinMaestro],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <div style={{ fontSize: '8px', color: '#666' }}>{label}</div>
                          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0a2540' }}>{fmtUSD(value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '16px' }}>
                    <div style={{ background: '#faf8f3', border: '1px solid #e5e0d5', padding: '14px', borderLeft: '3px solid #0a2540' }}>
                      <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#0a2540' }}>Qué está pasando</div>
                      <div style={{ fontSize: '12px', marginTop: '6px', lineHeight: '1.5' }}>
                        El portafolio analizado tiene <strong>{renderServiceValue(resultados.totales?.totalSKUs)} SKUs</strong> con un valor inmovilizado de <strong>{fmtUSD(informe.valorTotalInventario)}</strong>.
                        El <strong>{fmtPctPoints(informe.pctValorEOL)}</strong> del valor está concentrado en SKUs ya descontinuados,
                        y <strong>{informe.sinMovimiento.length} SKUs</strong> no registraron ventas en el período.
                      </div>
                    </div>
                    <div style={{ background: '#fee2e2', border: '1px solid #fee2e2', padding: '14px', borderLeft: '3px solid #7f1d1d' }}>
                      <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#7f1d1d' }}>Qué es urgente</div>
                      <div style={{ fontSize: '12px', marginTop: '6px', lineHeight: '1.5' }}>
                        <strong>{informe.enQuiebreActivo.length} SKUs Activos en quiebre</strong> generan venta perdida diaria. 
                        Reposición urgente estimada en <strong>{fmtUSD(resultados.alertas.totalReposicionValor)}</strong>. 
                        {informe.obsolescencia.length > 0 && <> Adicionalmente, <strong>{informe.obsolescencia.length} SKUs EOL Vencidos</strong> con valor de <strong>{fmtUSD(informe.obsolescenciaValor)}</strong> requieren liquidación inmediata.</>}
                      </div>
                    </div>
                    <div style={{ background: '#d1fae5', border: '1px solid #d1fae5', padding: '14px', borderLeft: '3px solid #065f46' }}>
                      <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#065f46' }}>Qué oportunidad existe</div>
                      <div style={{ fontSize: '12px', marginTop: '6px', lineHeight: '1.5' }}>
                        {resultados.analisisPareto.skusParetoA.length > 0 ? (
                          <>El portafolio tiene <strong>{resultados.analisisPareto.skusParetoA.length} SKUs Pareto A — Vitales</strong> ({resultados.analisisPareto.pctSKUsA.toFixed(0)}% del activo) que concentran {resultados.analisisPareto.pctVentasA.toFixed(0)}% de las ventas. Los <strong>Complementarios B/C</strong> contienen {resultados.analisisPareto.skusColaLarga.length} SKUs.{' '}
                          Reforzar disponibilidad y exhibición de estos SKUs puede aumentar el sell-through general.</>
                        ) : 'Se requieren más datos de ventas para identificar oportunidades de concentración.'}
                        {informe.skuHeroe && <> El SKU héroe <strong>{renderServiceValue(informe.skuHeroe.sku)}</strong> es la mejor vitrina para activar bundles y cross-sell.</>}
                      </div>
                    </div>
                    <div style={{ background: '#dbeafe', border: '1px solid #dbeafe', padding: '14px', borderLeft: '3px solid #1e40af' }}>
                      <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: '#1e40af' }}>Qué decisión debe tomar</div>
                      <div style={{ fontSize: '12px', marginTop: '6px', lineHeight: '1.5' }}>
                        Aprobar simultáneamente: <strong>(1)</strong> orden de compra urgente para SKUs Pareto A en quiebre; 
                        <strong> (2)</strong> campaña de liquidación estructurada para EOL Vencidos; 
                        <strong> (3)</strong> revisión de surtido para eliminar SKUs sin movimiento sostenido.
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 2. DIAGNÓSTICO DE ROTACIÓN */}
                <div style={{ marginBottom: '32px' }} className="page-break-before">
                  <h2 style={{ fontFamily: '"Times New Roman", serif', fontSize: '20px', color: '#0a2540', borderLeft: '4px solid #d4af37', paddingLeft: '12px', marginBottom: '16px' }}>
                    2. Diagnóstico de Rotación
                  </h2>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ background: '#0a2540', color: '#faf8f3' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Categoría operativa</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right' }}>SKUs</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Interpretación</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #e5e0d5' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 'bold' }}>Alta rotación (&gt;100%)</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', background: '#d1fae5', color: '#065f46', fontWeight: 'bold' }}>{informe.altaRotacion.length}</td>
                        <td style={{ padding: '8px 10px' }}>SKUs vendiendo más rápido que el stock inicial. Asegurar reposición continua.</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e5e0d5' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 'bold' }}>Baja rotación (10%–&lt;33.33%)</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', background: '#fef3c7', color: '#92400e', fontWeight: 'bold' }}>{informe.bajaRotacion.length}</td>
                        <td style={{ padding: '8px 10px' }}>SKUs con cobertura alta. Revisar exhibición, precio y bundles para acelerar.</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e5e0d5' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 'bold' }}>Rotación crítica (&lt;10%)</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', background: '#fee2e2', color: '#7f1d1d', fontWeight: 'bold' }}>{informe.muyBajaRotacion.length}</td>
                        <td style={{ padding: '8px 10px' }}>Inventario por décadas — candidatos a liquidación o eliminación del surtido.</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e5e0d5' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 'bold' }}>Sin movimiento (ventas = 0)</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', background: '#fee2e2', color: '#7f1d1d', fontWeight: 'bold' }}>{informe.sinMovimiento.length}</td>
                        <td style={{ padding: '8px 10px' }}>Capital atrapado: {fmtUSD(informe.sinMovValor)} ({fmtPctPoints(informe.pctValorSinMov)} del valor total).</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e5e0d5' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 'bold' }}>Sub-stock (riesgo de quiebre)</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', background: '#fef3c7', color: '#92400e', fontWeight: 'bold' }}>{informe.subinventario.length}</td>
                        <td style={{ padding: '8px 10px' }}>SKUs Activos bajo Inv. Seguridad — reposición urgente para evitar venta perdida.</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e5e0d5' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 'bold' }}>Riesgo de obsolescencia</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', background: '#fee2e2', color: '#7f1d1d', fontWeight: 'bold' }}>{informe.obsolescencia.length}</td>
                        <td style={{ padding: '8px 10px' }}>SKUs EOL Vencidos con inventario — {fmtUSD(informe.obsolescenciaValor)} en obsolescencia.</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e5e0d5' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 'bold' }}>Requieren activación comercial</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', background: '#dbeafe', color: '#1e40af', fontWeight: 'bold' }}>{informe.requierenActivacion.length}</td>
                        <td style={{ padding: '8px 10px' }}>SKUs BEST Activos con inventario y bajas ventas — exhibición o entrenamiento débil.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* NOTA — MOTOR INV. SEGURIDAD IOCA V1 */}
                <div className="no-page-break" style={{ marginBottom: '32px', background: '#faf8f3', border: '1px solid #d4af37', borderLeft: '5px solid #d4af37', padding: '18px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0a2540', marginBottom: '10px', fontFamily: '"Times New Roman", serif' }}>
                    Motor Inv. Seguridad IOCA V1 — Lógica aplicada al análisis
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '11px', background: '#0a2540', color: '#d4af37', padding: '10px', marginBottom: '10px' }}>
                    {NOTA_INV_SEGURIDAD.formula}
                  </div>
                  <div style={{ fontSize: '11px', lineHeight: '1.6', marginBottom: '10px' }}>
                    <strong style={{ color: '#7f1d1d' }}>Condiciones que aplican:</strong>
                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px' }}>
                      {NOTA_INV_SEGURIDAD.condiciones.map((c, i) => <li key={i} style={{ marginBottom: '3px' }}>{c}</li>)}
                    </ul>
                  </div>
                  <div style={{ fontSize: '11px', lineHeight: '1.6', marginBottom: '8px' }}>
                    <strong style={{ color: '#0a2540' }}>Parámetros aplicados en este análisis:</strong> Período <strong>{config.periodoAnalizado}</strong> = <strong>{renderServiceValue(resultados.semanasPeriodoUsadas)} semanas</strong> · Safety Stock: <strong>{config.safetyStockSemanas} sem</strong> · Lead Time USA: <strong>{config.leadTimeUSA} sem</strong> · Lead Time China: <strong>{config.leadTimeCHINA} sem</strong>
                  </div>
                  <div style={{ fontSize: '10px', fontStyle: 'italic', color: '#666', borderTop: '1px solid #e5e0d5', paddingTop: '8px' }}>
                    <strong>Propósito consultivo:</strong> {NOTA_INV_SEGURIDAD.propositoConsultivo}
                  </div>
                </div>

                <div className="no-page-break" style={{ marginBottom: '32px' }}>
                  <DefinitionLegend
                    ids={DEFINITION_GROUPS.report}
                    expanded
                    title="Definiciones y fórmulas del Informe Ejecutivo"
                  />
                </div>
                
                {/* 3. HALLAZGOS CLAVE */}
                <div style={{ marginBottom: '32px' }} className="page-break-before">
                  <h2 style={{ fontFamily: '"Times New Roman", serif', fontSize: '20px', color: '#0a2540', borderLeft: '4px solid #d4af37', paddingLeft: '12px', marginBottom: '16px' }}>
                    3. Hallazgos Clave
                  </h2>
                  {informe.hallazgos.slice(0, 10).map((h, i) => {
                    const c = prioridadColor(h.prioridad);
                    return (
                      <div key={i} className="no-page-break" style={{ marginBottom: '16px', border: '1px solid #e5e0d5', borderLeft: `4px solid ${c.border}`, padding: '14px', background: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '12px', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0a2540', flex: 1 }}>
                            Hallazgo #{i + 1}: {h.titulo}
                          </div>
                          <span style={{ background: c.bg, color: c.fg, padding: '3px 10px', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                            {h.prioridad}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '11px', lineHeight: '1.5' }}>
                          <div><strong style={{ color: '#7f1d1d' }}>QUÉ ENCONTRAMOS:</strong> {h.hallazgo}</div>
                          <div><strong style={{ color: '#7f1d1d' }}>POR QUÉ IMPORTA:</strong> {h.importa}</div>
                          <div><strong style={{ color: '#7f1d1d' }}>IMPACTO:</strong> {h.impacto}</div>
                          <div><strong style={{ color: '#065f46' }}>ACCIÓN RECOMENDADA:</strong> {h.accion}</div>
                        </div>
                      </div>
                    );
                  })}
                  {informe.hallazgos.length === 0 && (
                    <div style={{ padding: '20px', background: '#faf8f3', fontSize: '11px', color: '#666', textAlign: 'center' }}>
                      No se detectaron hallazgos críticos en el análisis. El portafolio está dentro de parámetros saludables.
                    </div>
                  )}
                </div>
                
                {/* 4. CAUSAS RAÍZ */}
                <div style={{ marginBottom: '32px' }} className="no-page-break">
                  <h2 style={{ fontFamily: '"Times New Roman", serif', fontSize: '20px', color: '#0a2540', borderLeft: '4px solid #d4af37', paddingLeft: '12px', marginBottom: '16px' }}>
                    4. Causas Raíz Identificadas
                  </h2>
                  <div style={{ fontSize: '11px', marginBottom: '12px', color: '#666', fontStyle: 'italic' }}>
                    Más allá del síntoma, estos son los orígenes estructurales de los problemas detectados:
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ background: '#0a2540', color: '#faf8f3' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left', width: '35%' }}>Causa raíz</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Evidencia en los datos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {informe.causasRaiz.map((c, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #e5e0d5' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#7f1d1d' }}>{c.causa}</td>
                          <td style={{ padding: '8px 10px' }}>{c.evidencia}</td>
                        </tr>
                      ))}
                      {informe.causasRaiz.length === 0 && (
                        <tr><td colSpan={2} style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Sin causas raíz críticas detectadas.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* 5. MATRIZ McKINSEY */}
                <div style={{ marginBottom: '32px' }} className="page-break-before">
                  <h2 style={{ fontFamily: '"Times New Roman", serif', fontSize: '20px', color: '#0a2540', borderLeft: '4px solid #d4af37', paddingLeft: '12px', marginBottom: '16px' }}>
                    5. Matriz de Priorización
                  </h2>
                  <div style={{ fontSize: '11px', marginBottom: '12px', color: '#666' }}>
                    Acciones organizadas por <strong>Impacto vs Esfuerzo de Ejecución</strong>:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ background: '#d1fae5', padding: '14px', borderLeft: '4px solid #065f46' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#065f46', marginBottom: '8px' }}>QUICK WINS · Alto impacto / Bajo esfuerzo</div>
                      <ul style={{ fontSize: '11px', lineHeight: '1.6', margin: 0, paddingLeft: '18px' }}>
                        <li>Reposición express de SKUs Pareto A en quiebre</li>
                        <li>Ajuste de exhibición del SKU héroe en góndola</li>
                        <li>Activación de campaña de liquidación EOL F3 con descuento 5–7%</li>
                        <li>Bundles producto héroe + accesorio complementario</li>
                      </ul>
                    </div>
                    <div style={{ background: '#dbeafe', padding: '14px', borderLeft: '4px solid #1e40af' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#1e40af', marginBottom: '8px' }}>ESTRATÉGICAS · Alto impacto / Alto esfuerzo</div>
                      <ul style={{ fontSize: '11px', lineHeight: '1.6', margin: 0, paddingLeft: '18px' }}>
                        <li>Rediseño del surtido por categoría con HQ</li>
                        <li>Implementación de Good/Better/Best en góndola</li>
                        <li>Entrenamiento de fuerza de venta en SKUs premium</li>
                        <li>Recalibración de Safety Stock por velocidad real</li>
                      </ul>
                    </div>
                    <div style={{ background: '#fef3c7', padding: '14px', borderLeft: '4px solid #92400e' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#92400e', marginBottom: '8px' }}>RELLENO · Bajo impacto / Bajo esfuerzo</div>
                      <ul style={{ fontSize: '11px', lineHeight: '1.6', margin: 0, paddingLeft: '18px' }}>
                        <li>Limpieza de SKUs sin Maestro en sistema</li>
                        <li>Validación de Origen de SKUs sin clasificación</li>
                        <li>Auditoría puntual de merma operativa</li>
                      </ul>
                    </div>
                    <div style={{ background: '#fee2e2', padding: '14px', borderLeft: '4px solid #7f1d1d' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#7f1d1d', marginBottom: '8px' }}>EVITAR · Bajo impacto / Alto esfuerzo</div>
                      <ul style={{ fontSize: '11px', lineHeight: '1.6', margin: 0, paddingLeft: '18px' }}>
                        <li>Reposición de SKUs B sin velocidad sostenida</li>
                        <li>Mantener SKUs EOL Vencidos en góndola premium</li>
                        <li>Compra adicional de SKUs sobre-inventariados</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                {/* 6. RECOMENDACIONES CONCRETAS */}
                <div style={{ marginBottom: '32px' }} className="page-break-before">
                  <h2 style={{ fontFamily: '"Times New Roman", serif', fontSize: '20px', color: '#0a2540', borderLeft: '4px solid #d4af37', paddingLeft: '12px', marginBottom: '16px' }}>
                    6. Recomendaciones Concretas para el Comprador
                  </h2>
                  
                  <div style={{ marginBottom: '20px' }} className="no-page-break">
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#065f46', marginBottom: '8px' }}>SKUs prioritarios a REPONER (orden de compra urgente)</div>
                    {informe.topReponer.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                        <thead>
                          <tr style={{ background: '#0a2540', color: '#faf8f3' }}>
                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>SKU</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Modelo</th>
                            <th style={{ padding: '6px 8px', textAlign: 'center' }}>Tier</th>
                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Ventas</th>
                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Reposición</th>
                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Valor USD</th>
                          </tr>
                        </thead>
                        <tbody>
                          {informe.topReponer.map((r, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #e5e0d5' }}>
                              <td style={{ padding: '6px 8px' }}><ProductSkuCell imageUrl={r.imageUrl} productUrl={r.productUrl} compact>{r.sku}</ProductSkuCell></td>
                              <td style={{ padding: '6px 8px', color: '#666' }}>{renderServiceValue(r.modelo)}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'center' }}>{renderServiceValue(r.tier)}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right' }}>{renderServiceValue(r.ventas)}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', color: '#065f46' }}>{renderServiceValue(r.reposicionSugerida)}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmtUSD(r.valorReposicion)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}>Sin SKUs en quiebre crítico identificados.</div>}
                  </div>
                  
                  <div style={{ marginBottom: '20px' }} className="no-page-break">
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#7f1d1d', marginBottom: '8px' }}>SKUs prioritarios a LIQUIDAR (EOL Vencidos con mayor valor)</div>
                    {informe.topLiquidar.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                        <thead>
                          <tr style={{ background: '#7f1d1d', color: '#fff' }}>
                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>SKU</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Modelo</th>
                            <th style={{ padding: '6px 8px', textAlign: 'center' }}>Fase</th>
                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Días EOL</th>
                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Inv. Final</th>
                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Valor inmovilizado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {informe.topLiquidar.map((r, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #e5e0d5' }}>
                              <td style={{ padding: '6px 8px' }}><ProductSkuCell imageUrl={r.imageUrl} productUrl={r.productUrl} compact>{r.sku}</ProductSkuCell></td>
                              <td style={{ padding: '6px 8px', color: '#666' }}>{renderServiceValue(r.modelo)}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'center' }}>{r.fase !== null ? `F${r.fase}` : '—'}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right' }}>{renderServiceValue(r.diasDesc)}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right' }}>{renderServiceValue(r.invFinal)}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', color: '#7f1d1d' }}>{fmtUSD(r.valorInv)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}>Sin SKUs EOL Vencidos con inventario.</div>}
                  </div>
                  
                  <div style={{ marginBottom: '20px' }} className="no-page-break">
                    <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#92400e', marginBottom: '8px' }}>SKUs candidatos a ELIMINAR del surtido (sin movimiento sostenido)</div>
                    {informe.topEliminar.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                        <thead>
                          <tr style={{ background: '#92400e', color: '#fff' }}>
                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>SKU</th>
                            <th style={{ padding: '6px 8px', textAlign: 'left' }}>Modelo</th>
                            <th style={{ padding: '6px 8px', textAlign: 'center' }}>Tier</th>
                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Inv. Final</th>
                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {informe.topEliminar.map((r, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #e5e0d5' }}>
                              <td style={{ padding: '6px 8px' }}><ProductSkuCell imageUrl={r.imageUrl} productUrl={r.productUrl} compact>{r.sku}</ProductSkuCell></td>
                              <td style={{ padding: '6px 8px', color: '#666' }}>{renderServiceValue(r.modelo)}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'center' }}>{renderServiceValue(r.tier)}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right' }}>{renderServiceValue(r.invFinal)}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>{fmtUSD(r.valorInv)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}>Sin candidatos críticos a eliminación.</div>}
                  </div>
                </div>
                
                {/* 7. CATEGORY DESIGN */}
                <div style={{ marginBottom: '32px' }} className="page-break-before no-page-break">
                  <h2 style={{ fontFamily: '"Times New Roman", serif', fontSize: '20px', color: '#0a2540', borderLeft: '4px solid #d4af37', paddingLeft: '12px', marginBottom: '16px' }}>
                    7. Oportunidades de Category Design
                  </h2>
                  <div style={{ fontSize: '11px', marginBottom: '12px', color: '#666', fontStyle: 'italic' }}>
                    Cómo transformar productos sueltos en ecosistemas de solución que aumenten el ticket promedio y la conexión con el consumidor.
                  </div>
                  
                  {informe.skuHeroe && (
                    <div style={{ background: '#faf8f3', border: '1px solid #d4af37', padding: '14px', marginBottom: '12px' }}>
                      <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: '12px', fontWeight: 'bold', color: '#0a2540', marginBottom: '8px' }}>
                        <span>PRODUCTO HÉROE:</span>
                        <ProductSkuCell imageUrl={informe.skuHeroe.imageUrl} productUrl={informe.skuHeroe.productUrl} compact>{informe.skuHeroe.sku}</ProductSkuCell>
                        <span>— {renderServiceValue(informe.skuHeroe.modelo)}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '11px', lineHeight: '1.5' }}>
                        <div><strong style={{ color: '#d4af37' }}>Tier / Categoría:</strong> {renderServiceValue(informe.skuHeroe.tier)} · {renderServiceValue(informe.skuHeroe.categoria)}</div>
                        <div><strong style={{ color: '#d4af37' }}>Venta:</strong> {renderServiceValue(informe.skuHeroe.ventas)} unidades · {fmtPct(informe.skuHeroe.pctVentas)} del total</div>
                        <div><strong style={{ color: '#d4af37' }}>Bundle recomendado:</strong> Combo con accesorio complementario (cable, funda o cargador) para subir ticket promedio.</div>
                        <div><strong style={{ color: '#d4af37' }}>Cross-sell natural:</strong> Productos de la misma categoría en tier inmediato superior (upgrade) o complementarios.</div>
                        <div><strong style={{ color: '#d4af37' }}>Mensaje comercial:</strong> Capitalizar el SKU héroe como "lo más vendido" para reforzar prueba social.</div>
                        <div><strong style={{ color: '#d4af37' }}>Segmento objetivo:</strong> Definir buyer persona principal y construir narrativa diferenciada en góndola.</div>
                      </div>
                    </div>
                  )}
                  
                  <div style={{ background: '#dbeafe', border: '1px solid #1e40af', padding: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px' }}>
                      OPORTUNIDAD GOOD / BETTER / BEST
                    </div>
                    <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
                      Estructurar la góndola en tres niveles claros — GOOD (entrada), BETTER (mainstream) y BEST (premium) — facilita la decisión del consumidor y permite migrar ventas hacia tiers de mayor margen. 
                      Distribución actual en ventas: <strong>GOOD {(resultados.distribucionTier.ventas.tiers.GOOD.pctUnidades * 100).toFixed(0)}%</strong>, 
                      <strong> BETTER {(resultados.distribucionTier.ventas.tiers.BETTER.pctUnidades * 100).toFixed(0)}%</strong>, 
                      <strong> BEST {(resultados.distribucionTier.ventas.tiers.BEST.pctUnidades * 100).toFixed(0)}%</strong>. 
                      Recomendación: si BEST está bajo el 25%, invertir en exhibición y entrenamiento de vendedores para migrar venta hacia premium.
                    </div>
                  </div>
                </div>
                
                {/* 8. NARRATIVA */}
                <div style={{ marginBottom: '32px' }} className="page-break-before">
                  <h2 style={{ fontFamily: '"Times New Roman", serif', fontSize: '20px', color: '#0a2540', borderLeft: '4px solid #d4af37', paddingLeft: '12px', marginBottom: '16px' }}>
                    8. Narrativa para Presentar al Comprador
                  </h2>
                  
                  <div style={{ background: '#faf8f3', border: '1px solid #e5e0d5', padding: '20px', fontFamily: '"Times New Roman", serif', fontSize: '13px', lineHeight: '1.7' }}>
                    <p style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#d4af37' }}>"Esto es lo que vemos."</strong> Su portafolio de {renderServiceValue(resultados.totales?.totalSKUs)} SKUs representa {fmtUSD(informe.valorTotalInventario)} en inventario.
                      El {fmtPctPoints(informe.pctValorEOL)} de ese valor está atrapado en SKUs descontinuados, y otro {fmtPctPoints(informe.pctValorSinMov)} en SKUs sin movimiento.
                      Simultáneamente, hay {informe.enQuiebreActivo.length} SKUs activos en sub-stock perdiendo venta cada día.
                    </p>
                    <p style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#d4af37' }}>"Esto es lo que significa."</strong> Hay un desbalance estructural: capital atrapado en productos que ya no venden y simultáneamente venta perdida en los productos que sí venden. 
                      Esto deteriora la liquidez y reduce el potencial de venta del próximo trimestre.
                    </p>
                    <p style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#d4af37' }}>"Esto es lo que está costando."</strong> El capital inmovilizado en obsolescencia ({fmtUSD(informe.obsolescenciaValor)}) más la venta perdida diaria por quiebres representa una pérdida de oportunidad significativa.
                      Cada semana adicional sin actuar acelera la depreciación del EOL y prolonga el ciclo de quiebre.
                    </p>
                    <p style={{ marginBottom: '14px' }}>
                      <strong style={{ color: '#d4af37' }}>"Esto es lo que recomendamos."</strong> Una acción de tres frentes simultáneos: 
                      <strong> (1) reposición urgente</strong> de los SKUs Pareto A en quiebre; 
                      <strong> (2) campaña de liquidación estructurada</strong> con descuentos escalonados por fase para los EOL Vencidos; y
                      <strong> (3) racionalización del surtido</strong> eliminando los SKUs sin movimiento sostenido para liberar espacio y capital.
                    </p>
                    <p>
                      <strong style={{ color: '#d4af37' }}>"Esto es lo que puede ganar."</strong> Liberar el capital atrapado, recuperar la venta hoy bloqueada por quiebres, 
                      y rediseñar la góndola con foco en los SKUs ganadores le permitirá mejorar rotación, margen y ticket promedio en el próximo ciclo comercial.
                      IOCA acompaña con el aporte definido por fase; en F4 con menos de 12 unidades la liquidación corresponde únicamente a Retail.
                    </p>
                  </div>
                </div>
                
                {/* 9. PLAN 30/60/90 */}
                <div style={{ marginBottom: '32px' }} className="page-break-before">
                  <h2 style={{ fontFamily: '"Times New Roman", serif', fontSize: '20px', color: '#0a2540', borderLeft: '4px solid #d4af37', paddingLeft: '12px', marginBottom: '16px' }}>
                    9. Plan de Acción 30 / 60 / 90 Días
                  </h2>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={{ background: '#fee2e2', border: '1px solid #7f1d1d', padding: '14px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#7f1d1d', marginBottom: '10px', borderBottom: '2px solid #7f1d1d', paddingBottom: '6px' }}>
                        Primeros 30 días — URGENTE
                      </div>
                      <ul style={{ fontSize: '11px', lineHeight: '1.6', margin: 0, paddingLeft: '18px' }}>
                        <li>Aprobar orden de compra urgente para SKUs Pareto A en quiebre</li>
                        <li>Lanzar liquidación de EOL Vencidos con fase F3 (descuento máximo)</li>
                        <li>Reubicar SKU héroe en mejor posición de góndola</li>
                        <li>Validar Origen de SKUs sin clasificación en el inventario</li>
                        <li>Auditoría rápida de merma operativa</li>
                      </ul>
                    </div>
                    <div style={{ background: '#fef3c7', border: '1px solid #92400e', padding: '14px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#92400e', marginBottom: '10px', borderBottom: '2px solid #92400e', paddingBottom: '6px' }}>
                        60 días — OPTIMIZACIÓN
                      </div>
                      <ul style={{ fontSize: '11px', lineHeight: '1.6', margin: 0, paddingLeft: '18px' }}>
                        <li>Implementar bundles del SKU héroe con complementarios</li>
                        <li>Entrenar fuerza de venta en SKUs BEST sin movimiento</li>
                        <li>Recalibrar Safety Stock por velocidad real de venta</li>
                        <li>Eliminar del surtido los SKUs sin movimiento sostenido</li>
                        <li>Activar cross-sell entre categorías complementarias</li>
                      </ul>
                    </div>
                    <div style={{ background: '#d1fae5', border: '1px solid #065f46', padding: '14px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#065f46', marginBottom: '10px', borderBottom: '2px solid #065f46', paddingBottom: '6px' }}>
                        90 días — REDISEÑO
                      </div>
                      <ul style={{ fontSize: '11px', lineHeight: '1.6', margin: 0, paddingLeft: '18px' }}>
                        <li>Rediseñar góndola con estructura Good/Better/Best clara</li>
                        <li>Refrescar categorías con alta concentración de EOL</li>
                        <li>Definir SKU héroe por categoría y plan de category captain</li>
                        <li>Negociar con HQ líneas activas de reemplazo en categorías EOL</li>
                        <li>QBR con cliente para medir avance y ajustar plan siguiente</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                {/* MENSAJE FINAL */}
                <div className="no-page-break" style={{ background: '#0a2540', color: '#faf8f3', padding: '24px', marginTop: '30px' }}>
                  <div style={{ fontFamily: '"Times New Roman", serif', fontSize: '14px', fontStyle: 'italic', lineHeight: '1.7' }}>
                    <strong style={{ color: '#d4af37' }}>Mensaje final al comprador:</strong> El portafolio tiene los ingredientes para crecer — un SKU héroe claro, categorías con potencial 
                    y SKUs Pareto A que sostienen {resultados.analisisPareto.pctVentasA.toFixed(0)}% de las ventas. Lo que falta es <em>disciplina de gestión</em>: liberar el capital atrapado,{' '}
                    proteger los productos ganadores, y rediseñar la góndola para que la venta fluya hacia los tiers de mayor margen. 
                    Las acciones son ejecutables en 30 a 90 días y su impacto se reflejará en el próximo ciclo comercial.
                  </div>
                  <div style={{ marginTop: '16px', fontSize: '11px', color: '#d4af37', textAlign: 'right' }}>
                    — Equipo IOCA Group · Análisis consultivo de portafolio
                  </div>
                </div>
                
                {/* PIE DEL INFORME */}
                <div style={{ marginTop: '24px', borderTop: '2px solid #d4af37', paddingTop: '12px', textAlign: 'center', fontSize: '9px', color: '#999' }}>
                  IOCA Sell-Through Intelligence <strong>V1</strong> · Motor Inv. Seguridad Institucional · Informe generado el {new Date().toLocaleDateString('es-GT', { day: '2-digit', month: 'long', year: 'numeric' })} · 
                  Cliente: {config.codigoCliente} — {config.nombreCliente} — {config.pais}
                </div>
              </div>
            </>
          );
        })()}

        {/* PIE */}
        <div className="text-center text-[10px] text-stone-500 pt-4 pb-8" style={{ fontFamily: '"Times New Roman", serif' }}>
          IOCA Sell-Through Intelligence <strong>V1</strong> · Motor Inv. Seguridad Institucional · Gestión consultiva de portafolio B2B
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTES
// ============================================================

const KPIUnitPair = ({
  label,
  value,
  unitLabel,
  unitValue,
  moneyLabel,
  moneyValue,
  color = '#0a2540',
  bg = '#faf8f3',
}) => (
  <div className="border p-3 text-center" style={{ borderColor: '#e5e0d5', background: bg }}>
    <div className="text-[10px] uppercase tracking-wider text-stone-500">{renderServiceValue(label)}</div>
    <div className="text-xl font-bold mt-1" style={{ color }}>{renderServiceValue(value)}</div>
    <div className="mt-2 pt-2 border-t" style={{ borderColor: '#e5e0d5' }}>
      <div className="text-[9px] uppercase tracking-wider text-stone-500">{renderServiceValue(unitLabel)}</div>
      <div className="text-sm font-bold mt-0.5" style={{ color }}>{renderServiceValue(unitValue)}</div>
    </div>
    {moneyLabel && (
      <div className="mt-2 pt-2 border-t" style={{ borderColor: '#e5e0d5' }}>
        <div className="text-[9px] uppercase tracking-wider text-stone-500">{renderServiceValue(moneyLabel)}</div>
        <div className="text-sm font-bold mt-0.5" style={{ color }}>{renderServiceValue(moneyValue)}</div>
      </div>
    )}
  </div>
);

const AlertaCard = ({ titulo, valor, sub, color, bg }) => (
  <div className="border p-3" style={{ borderColor: '#e5e0d5', background: bg }}>
    <div className="text-[10px] uppercase tracking-wider" style={{ color }}>{renderServiceValue(titulo)}</div>
    <div className="text-2xl font-bold mt-1" style={{ color, fontFamily: '"Times New Roman", serif' }}>{renderServiceValue(valor)}</div>
    {sub !== null && sub !== undefined && <div className="text-[10px] mt-1" style={{ color }}>{renderServiceValue(sub)}</div>}
  </div>
);

const TIER_COLORS = {
  GOOD:   { bg: '#94a3b8', textColor: '#fff',     label: 'GOOD' },
  BETTER: { bg: '#3b82f6', textColor: '#fff',     label: 'BETTER' },
  BEST:   { bg: '#d4af37', textColor: '#0a2540', label: 'BEST' },
  EOL:    { bg: '#7f1d1d', textColor: '#fff',     label: 'EOL' },
  'SIN CATEGORIA': { bg: '#cbd5e1', textColor: '#475569', label: 'SIN CATEGORIA' },
};

// Paleta institucional IOCA para categorías dinámicas
const PALETA_CATEGORIA = [
  { bg: '#0a2540', textColor: '#faf8f3' },  // Navy IOCA
  { bg: '#d4af37', textColor: '#0a2540' },  // Dorado IOCA
  { bg: '#7f1d1d', textColor: '#fff' },     // Burdeos
  { bg: '#065f46', textColor: '#fff' },     // Verde oscuro
  { bg: '#3b82f6', textColor: '#fff' },     // Azul
  { bg: '#92400e', textColor: '#fff' },     // Ámbar oscuro
  { bg: '#7c3aed', textColor: '#fff' },     // Púrpura
  { bg: '#94a3b8', textColor: '#fff' },     // Gris (default)
];

const getColorCategoria = (categoria, listaCategorias) => {
  if (categoria === 'SIN CATEGORIA') return { bg: '#cbd5e1', textColor: '#475569' };
  const idx = listaCategorias.indexOf(categoria);
  return idx >= 0 ? PALETA_CATEGORIA[idx % PALETA_CATEGORIA.length] : PALETA_CATEGORIA[PALETA_CATEGORIA.length - 1];
};

const DistribTierPanel = ({ titulo, subtitulo, data }) => {
  const tiers = ['GOOD', 'BETTER', 'BEST', 'EOL', 'SIN CATEGORIA']
    .filter((tier) => tier !== 'SIN CATEGORIA' || data[tier].skus > 0);
  const hayDatos = tiers.some(t => data[t].unidades > 0);

  return (
    <div>
      <div className="mb-3">
        <div className="text-sm font-bold" style={{ color: '#0a2540' }}>{renderServiceValue(titulo)}</div>
        <div className="text-xs text-stone-500 mt-0.5">{renderServiceValue(subtitulo)}</div>
      </div>

      {hayDatos ? (
        <>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-stone-500">Distribución por unidades</div>
          <div className="flex h-7 mb-3 border overflow-hidden" style={{ borderColor: '#e5e0d5' }}>
            {tiers.map(t => data[t].pctUnidades > 0 ? (
              <div key={t} style={{
                width: `${data[t].pctUnidades * 100}%`,
                background: TIER_COLORS[t].bg,
                color: TIER_COLORS[t].textColor,
              }} className="flex items-center justify-center text-[10px] font-bold">
                {data[t].pctUnidades >= 0.07 ? `${(data[t].pctUnidades * 100).toFixed(0)}%` : ''}
              </div>
            ) : null)}
          </div>

          <div className="mb-1 text-[10px] uppercase tracking-wider text-stone-500">Distribución por valor USD</div>
          <div className="flex h-7 mb-4 border overflow-hidden" style={{ borderColor: '#e5e0d5' }}>
            {tiers.map(t => data[t].pctValor > 0 ? (
              <div key={t} style={{
                width: `${data[t].pctValor * 100}%`,
                background: TIER_COLORS[t].bg,
                color: TIER_COLORS[t].textColor,
              }} className="flex items-center justify-center text-[10px] font-bold">
                {data[t].pctValor >= 0.07 ? `${(data[t].pctValor * 100).toFixed(0)}%` : ''}
              </div>
            ) : null)}
          </div>

          <table className="w-full text-[11px] border" style={{ borderColor: '#e5e0d5' }}>
            <thead style={{ background: '#0a2540', color: '#faf8f3' }}>
              <tr>
                <th className="px-2 py-1.5 text-left font-bold text-[10px] uppercase">Tier</th>
                <th className="px-2 py-1.5 text-center font-bold text-[10px] uppercase">SKUs</th>
                <th className="px-2 py-1.5 text-right font-bold text-[10px] uppercase">Unidades</th>
                <th className="px-2 py-1.5 text-right font-bold text-[10px] uppercase">% Unid.</th>
                <th className="px-2 py-1.5 text-right font-bold text-[10px] uppercase">Valor USD</th>
                <th className="px-2 py-1.5 text-right font-bold text-[10px] uppercase">% Valor</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map(t => (
                <tr key={t} className="border-t" style={{ borderColor: '#e5e0d5' }}>
                  <td className="px-2 py-1.5">
                    <span className="px-2 py-0.5 text-[10px] font-bold" style={{
                      background: TIER_COLORS[t].bg,
                      color: TIER_COLORS[t].textColor,
                    }}>{TIER_COLORS[t].label}</span>
                  </td>
                  <td className="px-2 py-1.5 text-center">{renderServiceValue(data[t]?.skus)}</td>
                  <td className="px-2 py-1.5 text-right font-bold">{renderServiceValue(data[t]?.unidades)}</td>
                  <td className="px-2 py-1.5 text-right">{(data[t].pctUnidades * 100).toFixed(0)}%</td>
                  <td className="px-2 py-1.5 text-right font-bold">{fmtUSDInline(data[t].valor)}</td>
                  <td className="px-2 py-1.5 text-right">{fmtPct(data[t].pctValor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div className="text-center py-8 text-xs text-stone-400 border" style={{ borderColor: '#e5e0d5' }}>
          Sin datos disponibles
        </div>
      )}
    </div>
  );
};

const KPIBig = ({ label, value, sub, color = '#0a2540' }) => (
  <div className="border p-4" style={{ borderColor: '#e5e0d5', background: '#faf8f3' }}>
    <div className="text-[10px] uppercase tracking-wider text-stone-500">{renderServiceValue(label)}</div>
    <div className="text-2xl font-bold mt-1" style={{ color, fontFamily: '"Times New Roman", serif' }}>{renderServiceValue(value)}</div>
    {sub !== null && sub !== undefined && <div className="text-[10px] text-stone-500 mt-1">{renderServiceValue(sub)}</div>}
  </div>
);

const DistribCategoriaPanel = ({ titulo, subtitulo, data, listaCategorias }) => {
  const hayDatos = listaCategorias.some(c => data.categorias[c] && data.categorias[c].unidades > 0);

  return (
    <div>
      <div className="mb-3">
        <div className="text-sm font-bold" style={{ color: '#0a2540' }}>{renderServiceValue(titulo)}</div>
        <div className="text-xs text-stone-500 mt-0.5">{renderServiceValue(subtitulo)}</div>
      </div>

      {hayDatos ? (
        <>
          <div className="mb-1 text-[10px] uppercase tracking-wider text-stone-500">Distribución por unidades</div>
          <div className="flex h-7 mb-3 border overflow-hidden" style={{ borderColor: '#e5e0d5' }}>
            {listaCategorias.map(c => {
              const d = data.categorias[c];
              if (!d || d.pctUnidades <= 0) return null;
              const color = getColorCategoria(c, listaCategorias);
              return (
                <div key={c} style={{
                  width: `${d.pctUnidades * 100}%`,
                  background: color.bg,
                  color: color.textColor,
                }} className="flex items-center justify-center text-[10px] font-bold">
                  {d.pctUnidades >= 0.07 ? `${(d.pctUnidades * 100).toFixed(0)}%` : ''}
                </div>
              );
            })}
          </div>

          <div className="mb-1 text-[10px] uppercase tracking-wider text-stone-500">Distribución por valor USD</div>
          <div className="flex h-7 mb-4 border overflow-hidden" style={{ borderColor: '#e5e0d5' }}>
            {listaCategorias.map(c => {
              const d = data.categorias[c];
              if (!d || d.pctValor <= 0) return null;
              const color = getColorCategoria(c, listaCategorias);
              return (
                <div key={c} style={{
                  width: `${d.pctValor * 100}%`,
                  background: color.bg,
                  color: color.textColor,
                }} className="flex items-center justify-center text-[10px] font-bold">
                  {d.pctValor >= 0.07 ? `${(d.pctValor * 100).toFixed(0)}%` : ''}
                </div>
              );
            })}
          </div>

          <table className="w-full text-[11px] border" style={{ borderColor: '#e5e0d5' }}>
            <thead style={{ background: '#0a2540', color: '#faf8f3' }}>
              <tr>
                <th className="px-2 py-1.5 text-left font-bold text-[10px] uppercase">Categoría</th>
                <th className="px-2 py-1.5 text-center font-bold text-[10px] uppercase">SKUs</th>
                <th className="px-2 py-1.5 text-right font-bold text-[10px] uppercase">Unidades</th>
                <th className="px-2 py-1.5 text-right font-bold text-[10px] uppercase">% Unid.</th>
                <th className="px-2 py-1.5 text-right font-bold text-[10px] uppercase">Valor USD</th>
                <th className="px-2 py-1.5 text-right font-bold text-[10px] uppercase">% Valor</th>
              </tr>
            </thead>
            <tbody>
              {listaCategorias.map(c => {
                const d = data.categorias[c];
                if (!d) return null;
                const color = getColorCategoria(c, listaCategorias);
                return (
                  <tr key={c} className="border-t" style={{ borderColor: '#e5e0d5' }}>
                    <td className="px-2 py-1.5">
                      <span className="px-2 py-0.5 text-[10px] font-bold" style={{
                        background: color.bg, color: color.textColor,
                      }}>{renderServiceValue(c)}</span>
                    </td>
                    <td className="px-2 py-1.5 text-center">{renderServiceValue(d?.skus)}</td>
                    <td className="px-2 py-1.5 text-right font-bold">{renderServiceValue(d?.unidades)}</td>
                    <td className="px-2 py-1.5 text-right">{(d.pctUnidades * 100).toFixed(0)}%</td>
                    <td className="px-2 py-1.5 text-right font-bold">{fmtUSDInline(d.valor)}</td>
                    <td className="px-2 py-1.5 text-right">{fmtPct(d.pctValor)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : (
        <div className="text-center py-8 text-xs text-stone-400 border" style={{ borderColor: '#e5e0d5' }}>
          Sin datos disponibles
        </div>
      )}
    </div>
  );
};

const Th = ({ children, align = 'left' }) => (
  <th className="px-3 py-2 font-bold text-[10px] uppercase tracking-wider" style={{ textAlign: align }}>{renderServiceValue(children)}</th>
);

const Td = ({ children, align = 'left', bold = false, className = '', style = {} }) => (
  <td className={`px-3 py-2 ${className}`} style={{ textAlign: align, fontWeight: bold ? 'bold' : 'normal', ...style }}>{renderServiceValue(children)}</td>
);
