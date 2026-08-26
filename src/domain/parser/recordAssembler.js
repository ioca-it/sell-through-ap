// =============================================================================
// Propósito: ensamblar el record final consumido por dashboard y exportaciones.
// Responsabilidad: cruzar una fila normalizada con Maestro y motores de dominio.
// Entradas/Salidas: recibe datos/configuración explícitos y devuelve un objeto simple.
// Reglas protegidas: forma, defaults, precedencias, cálculos y textos caracterizados.
// Dependencias: Inventory Engine y EOL Engine; no accede a React ni a fuentes.
// Evolución: puede ser coordinado por Repository/Provider sin conocer Dataverse.
// =============================================================================

import {
  obtenerSemanasPeriodo,
  calcularInventarioProyectado,
  calcularMerma,
  calcularPorcentajeRotacion,
  seleccionarOrigen,
  seleccionarCostoPorOrigen,
  calcularInventarioSeguridadIOCA,
  calcularQuiebreYReposicion,
  ajustarReposicionPorPack,
  obtenerAccionQuiebreActivo,
} from '../inventory/inventoryEngine.js';
import {
  calcularDiasEOL,
  seleccionarBucketEOL,
  seleccionarFaseEOL,
  calcularDescuentoYAportes,
  obtenerAccionQuiebreEOL,
  clasificarTemporalmente,
} from '../eol/eolEngine.js';
import { multiplyPrice } from '../product/product.js';
import { normalizeFechaStr } from '../../utils/dateUtils.js';

// Construye el contrato vigente con o sin coincidencia en el Maestro.
export const assembleRecord = ({
  inventoryRecord,
  masterRecord,
  config,
  fechaBase,
  bucketEOL,
  tablaFases,
  umbralMermaPct,
  semanasPorPeriodo,
}) => {
  const {
    sku,
    tienda,
    codigo,
    ean13,
    nombreInv,
    tier,
    origenInv,
    invSeguridad,
    invInicial,
    compra,
    ventas,
    invProyectadoDisponible,
    invProyectadoInformado,
    invFinal,
  } = inventoryRecord;

  const invProyectado = calcularInventarioProyectado({
    columnaDisponible: invProyectadoDisponible,
    valorInformado: invProyectadoInformado,
    invInicial,
    compra,
    ventas,
  });
  const { merma, mermaPct, alertaMerma } = calcularMerma({
    invProyectado,
    invFinal,
    invInicial,
    umbralMermaPct,
  });
  const porcentajeRotacion = calcularPorcentajeRotacion({ invInicial, ventas });

  if (!masterRecord) {
    const {
      necesidadReposicion,
      alertaQuiebre: sinMaestroAlertaQuiebre,
    } = calcularQuiebreYReposicion({
      estado: 'SIN MAESTRO',
      invSeguridadIOCA: invSeguridad,
      invFinal,
      invProyectado,
      compra,
      existeEnMaestro: false,
    });

    return {
      sku, tienda, codigo, ean13, modelo: nombreInv || '(sin info)',
      marca: 'SIN MAESTRO', estado: 'SIN MAESTRO', tier,
      categoria: 'SIN CATEGORIA',
      fechaStr: '', creationDate: null, diasDesc: null, diasRestantes: null,
      clasificacionTemporal: 'SIN MAESTRO', bucket: null, fase: null,
      origen: origenInv || '—', sinOrigenInv: !origenInv,
      costo: null, costoUSA: null, costoCHINA: null,
      level: '', imageUrl: '', productUrl: '',
      aplicaMasterPack: null, cantidadMasterPack: null,
      aplicaInnerPack: null, cantidadInnerPack: null,
      descPct: 0, descUSD: null, ioaUSD: null, retailUSD: null,
      inventarioMinimoReconocido: 0, liquidacionSoloRetail: false,
      invSeguridad, invInicial, compra, ventas, invProyectado, invFinal,
      invSeguridadIOCA: invSeguridad, deltaInvSeguridad: 0, fuenteInvSeguridad: 'Cliente',
      semanasPeriodo: obtenerSemanasPeriodo(
        config.periodoAnalizado,
        config.semanasPersonalizadas,
        semanasPorPeriodo,
      ),
      leadTimeAplicado: 0,
      merma, mermaPct, alertaMerma,
      porcentajeRotacion,
      necesidadReposicion, reposicionSugeridaBase: 0,
      tipoAjustePack: 'SIN AJUSTE', cantidadPackAplicada: null,
      reposicionSugerida: 0,
      alertaQuiebre: sinMaestroAlertaQuiebre,
      accionSugerida: sinMaestroAlertaQuiebre ? 'Agregar al Maestro y decidir' : '',
      valorInv: null,
      valorVentas: null,
      valorReposicion: null,
      descTotal: null, ioaTotal: null, retailTotal: null,
    };
  }

  const { sinOrigenInv, origen } = seleccionarOrigen(origenInv);
  const costo = seleccionarCostoPorOrigen({
    origen,
    costoUSA: masterRecord.costoUSA,
    costoCHINA: masterRecord.costoCHINA,
  });
  let diasDesc = null;
  let bucket = null;
  let fase = null;
  let faseConfig = null;
  const nivel = masterRecord.estado === 'EOL'
    ? 'EOL'
    : (['GOOD', 'BETTER', 'BEST'].includes(tier) ? tier : 'GOOD');
  const { diasRestantes, clasificacionTemporal } = clasificarTemporalmente({
    estado: masterRecord.estado,
    fechaDescontinuacion: masterRecord.fecha,
    fechaProcesamiento: fechaBase,
  });

  if (masterRecord.estado === 'EOL' && masterRecord.fecha) {
    diasDesc = calcularDiasEOL({ fechaBase, fechaEOL: masterRecord.fecha });
    if (diasDesc >= 0) {
      bucket = seleccionarBucketEOL({ diasDesc, buckets: bucketEOL });
      faseConfig = seleccionarFaseEOL({
        marca: masterRecord.marca,
        origen,
        diasDesc,
        tablaFases,
      });
      if (faseConfig) {
        fase = faseConfig.fase;
      }
    } else {
      bucket = seleccionarBucketEOL({ diasDesc, buckets: bucketEOL });
    }
  }

  const {
    descPct,
    ioaPct,
    retailPct,
    descUSD,
    ioaUSD,
    retailUSD,
    descTotal,
    ioaTotal,
    retailTotal,
    inventarioMinimoReconocido,
    liquidacionSoloRetail,
  } = calcularDescuentoYAportes({ costo, faseConfig, invFinal });

  const semanasPeriodo = obtenerSemanasPeriodo(
    config.periodoAnalizado,
    config.semanasPersonalizadas,
    semanasPorPeriodo,
  );
  const {
    invSeguridadIOCA,
    fuenteInvSeguridad,
    leadTimeAplicado,
    deltaInvSeguridad,
  } = calcularInventarioSeguridadIOCA({
    ventas,
    semanasPeriodo,
    safetyStockSemanas: config.safetyStockSemanas,
    leadTimeUSA: config.leadTimeUSA,
    leadTimeCHINA: config.leadTimeCHINA,
    origen,
    invSeguridadCliente: invSeguridad,
  });
  const {
    necesidadReposicion,
    reposicionSugerida: reposicionSugeridaBase,
    alertaQuiebre,
  } = calcularQuiebreYReposicion({
    estado: masterRecord.estado,
    invSeguridadIOCA,
    invFinal,
    invProyectado,
    compra,
    existeEnMaestro: true,
  });
  const {
    tipoAjustePack,
    cantidadPackAplicada,
    pedidoSugeridoFinal: reposicionSugerida,
  } = ajustarReposicionPorPack({
    pedidoBase: reposicionSugeridaBase,
    aplicaMasterPack: masterRecord.aplicaMasterPack,
    cantidadMasterPack: masterRecord.cantidadMasterPack,
    aplicaInnerPack: masterRecord.aplicaInnerPack,
    cantidadInnerPack: masterRecord.cantidadInnerPack,
  });

  let accionSugerida = '';
  if (alertaQuiebre) {
    if (masterRecord.estado === 'ACTIVO') {
      accionSugerida = obtenerAccionQuiebreActivo({
        alertaQuiebre,
        reposicionSugerida,
        invSeguridadIOCA,
        invFinal,
      });
    } else if (masterRecord.estado === 'EOL') {
      accionSugerida = obtenerAccionQuiebreEOL({ alertaQuiebre, bucket });
    }
  }

  return {
    sku, tienda, codigo, ean13,
    modelo: masterRecord.modelo || nombreInv,
    marca: masterRecord.marca,
    estado: masterRecord.estado,
    tier: nivel,
    categoria: masterRecord.categoria || '—',
    fechaStr: normalizeFechaStr(masterRecord.fechaStr),
    creationDate: masterRecord.creationDate,
    diasDesc,
    diasRestantes,
    clasificacionTemporal,
    bucket: bucket ? bucket.bucket : null,
    fase,
    origen,
    sinOrigenInv,
    costo,
    costoUSA: masterRecord.costoUSA,
    costoCHINA: masterRecord.costoCHINA,
    level: masterRecord.level || '',
    imageUrl: masterRecord.imageUrl || '',
    productUrl: masterRecord.productUrl || '',
    aplicaMasterPack: masterRecord.aplicaMasterPack ?? null,
    cantidadMasterPack: masterRecord.cantidadMasterPack ?? null,
    aplicaInnerPack: masterRecord.aplicaInnerPack ?? null,
    cantidadInnerPack: masterRecord.cantidadInnerPack ?? null,
    descPct, descUSD,
    ioaPct, ioaUSD,
    retailPct, retailUSD,
    inventarioMinimoReconocido, liquidacionSoloRetail,
    invSeguridad, invInicial, compra, ventas, invProyectado, invFinal,
    invSeguridadIOCA, deltaInvSeguridad, fuenteInvSeguridad,
    semanasPeriodo, leadTimeAplicado,
    merma, mermaPct, alertaMerma,
    porcentajeRotacion,
    necesidadReposicion, reposicionSugeridaBase,
    tipoAjustePack, cantidadPackAplicada,
    reposicionSugerida, alertaQuiebre, accionSugerida,
    valorInv: multiplyPrice(costo, invFinal),
    valorVentas: multiplyPrice(costo, ventas),
    valorReposicion: multiplyPrice(costo, reposicionSugerida),
    descTotal,
    ioaTotal,
    retailTotal,
  };
};
