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
  calcularIndiceRotacion,
  seleccionarOrigen,
  seleccionarCostoPorOrigen,
  calcularInventarioSeguridadIOCA,
  calcularQuiebreYReposicion,
  obtenerAccionQuiebreActivo,
} from '../inventory/inventoryEngine.js';
import {
  calcularDiasEOL,
  seleccionarBucketEOL,
  seleccionarFaseEOL,
  calcularDescuentoYAportes,
  obtenerAccionQuiebreEOL,
} from '../eol/eolEngine.js';

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
  const indiceRotacion = calcularIndiceRotacion({ invInicial, ventas });

  if (!masterRecord) {
    const { alertaQuiebre: sinMaestroAlertaQuiebre } = calcularQuiebreYReposicion({
      estado: 'SIN MAESTRO',
      invSeguridadIOCA: invSeguridad,
      invFinal,
    });

    return {
      sku, tienda, codigo, ean13, modelo: nombreInv || '(sin info)',
      marca: 'SIN MAESTRO', estado: 'SIN MAESTRO', tier,
      categoria: 'SIN CATEGORIA',
      fechaStr: '—', diasDesc: null, bucket: null, fase: null,
      origen: origenInv || '—', sinOrigenInv: !origenInv,
      costo: 0, costoUSA: 0, costoCHINA: 0,
      descPct: 0, descUSD: 0, ioaUSD: 0, retailUSD: 0,
      invSeguridad, invInicial, compra, ventas, invProyectado, invFinal,
      invSeguridadIOCA: invSeguridad, deltaInvSeguridad: 0, fuenteInvSeguridad: 'Cliente',
      semanasPeriodo: obtenerSemanasPeriodo(
        config.periodoAnalizado,
        config.semanasPersonalizadas,
        semanasPorPeriodo,
      ),
      leadTimeAplicado: 0,
      merma, mermaPct, alertaMerma,
      indiceRotacion,
      reposicionSugerida: 0,
      alertaQuiebre: sinMaestroAlertaQuiebre,
      accionSugerida: sinMaestroAlertaQuiebre ? 'Agregar al Maestro y decidir' : '',
      valorInv: 0,
      valorVentas: 0,
      descTotal: 0, ioaTotal: 0, retailTotal: 0,
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
  const { reposicionSugerida, alertaQuiebre } = calcularQuiebreYReposicion({
    estado: masterRecord.estado,
    invSeguridadIOCA,
    invFinal,
  });

  let accionSugerida = '';
  if (alertaQuiebre) {
    if (masterRecord.estado === 'ACTIVO') {
      accionSugerida = obtenerAccionQuiebreActivo({
        alertaQuiebre,
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
    tier,
    categoria: masterRecord.categoria || 'SIN CATEGORIA',
    fechaStr: masterRecord.fechaStr || '—',
    diasDesc,
    bucket: bucket ? bucket.bucket : null,
    fase,
    origen,
    sinOrigenInv,
    costo,
    costoUSA: masterRecord.costoUSA,
    costoCHINA: masterRecord.costoCHINA,
    descPct, descUSD,
    ioaPct, ioaUSD,
    retailPct, retailUSD,
    invSeguridad, invInicial, compra, ventas, invProyectado, invFinal,
    invSeguridadIOCA, deltaInvSeguridad, fuenteInvSeguridad,
    semanasPeriodo, leadTimeAplicado,
    merma, mermaPct, alertaMerma,
    indiceRotacion,
    reposicionSugerida, alertaQuiebre, accionSugerida,
    valorInv: costo * invFinal,
    valorVentas: costo * ventas,
    valorReposicion: costo * reposicionSugerida,
    descTotal,
    ioaTotal,
    retailTotal,
  };
};
