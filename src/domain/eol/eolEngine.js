// =============================================================================
// Propósito: concentrar las reglas puras del EOL Engine caracterizadas.
// Responsabilidad: calcular días, bucket, fase, descuentos, aportes y acciones EOL.
// Entradas/Salidas: recibe fecha/configuración explícitas y devuelve objetos simples.
// Reglas protegidas: fecha base externa, límites, porcentajes y textos vigentes.
// Dependencias: dateUtils; no accede a React, JSON, archivos, red ni dataService.
// Evolución: admite orquestación futura por Repository/Provider sin conocer Dataverse.
// =============================================================================

import { diasEntre } from '../../utils/dateUtils.js';

const FASE_4_DIAS_LIMITE = 365;
const FASE_4_DIAS_MIN = FASE_4_DIAS_LIMITE + 1;
const FASE_4_DESCUENTO_CONSUMIDOR = 0.15;

const crearFase4 = ({ marca, origen, candidatos }) => {
  const ultimaFase = [...candidatos].sort((a, b) => b.diasMin - a.diasMin)[0];
  return {
    marca: marca.toUpperCase(),
    origen: origen.toUpperCase(),
    fase: 4,
    diasMin: FASE_4_DIAS_MIN,
    descConsumidor: FASE_4_DESCUENTO_CONSUMIDOR,
    aporteIOCA: ultimaFase?.aporteIOCA ?? 0,
    aporteRetail: ultimaFase?.aporteRetail ?? 0,
    inventarioMinimoReconocido: 12,
  };
};

// Calcula los días EOL usando exclusivamente la fecha base recibida del orquestador.
export const calcularDiasEOL = ({ fechaBase, fechaEOL }) => diasEntre(fechaBase, fechaEOL);

// Clasifica el estado temporal contra la fecha de procesamiento. Estado EOL tiene
// prioridad contractual incluso cuando la fecha sea futura, vacía o inválida.
export const clasificarTemporalmente = ({
  estado,
  fechaDescontinuacion,
  fechaProcesamiento,
}) => {
  const diasRestantes = fechaDescontinuacion
    ? diasEntre(fechaDescontinuacion, fechaProcesamiento)
    : null;

  if (estado === 'EOL') {
    return { diasRestantes, clasificacionTemporal: 'VENCIDO' };
  }
  if (diasRestantes === null || diasRestantes > 31) {
    return { diasRestantes, clasificacionTemporal: 'ACTIVO' };
  }
  if (diasRestantes >= 0) {
    return { diasRestantes, clasificacionTemporal: 'POR VENCER' };
  }
  return { diasRestantes, clasificacionTemporal: 'VENCIDO' };
};

// Selecciona el bucket vigente y conserva Planificado para horizontes mayores a 360 días.
export const seleccionarBucketEOL = ({ diasDesc, buckets }) => {
  if (diasDesc === null) return null;
  if (diasDesc >= 0) return buckets[0];
  const diasHacia = Math.abs(diasDesc);
  if (diasHacia <= 27) return buckets[1];
  if (diasHacia <= 83) return buckets[2];
  if (diasHacia <= 360) return buckets[3];
  return buckets[3];
};

// Elige la mayor fase cuyo mínimo aplique para la marca, origen y días recibidos.
export const seleccionarFaseEOL = ({ marca, origen, diasDesc, tablaFases }) => {
  if (diasDesc === null || diasDesc < 90) return null;
  const candidatos = tablaFases.filter((fase) =>
    fase.marca === marca.toUpperCase() && fase.origen === origen.toUpperCase()
  );
  if (diasDesc > FASE_4_DIAS_LIMITE) {
    return crearFase4({ marca, origen, candidatos });
  }
  if (candidatos.length === 0) return null;
  const ordenados = [...candidatos].sort((a, b) => b.diasMin - a.diasMin);
  for (const fase of ordenados) {
    if (diasDesc >= fase.diasMin) return fase;
  }
  return null;
};

// Expone la tabla efectiva para consumidores de presentación. Conserva todas
// las filas configuradas y completa F4 por cada marca/origen mediante la misma
// regla autorizada que usa el cálculo, sin modificar la fuente física.
export const listarFasesEOLDisponibles = ({ tablaFases }) => {
  const grupos = new Map();
  tablaFases.forEach((fase) => {
    const marca = fase.marca.toUpperCase();
    const origen = fase.origen.toUpperCase();
    const clave = `${marca}::${origen}`;
    if (!grupos.has(clave)) grupos.set(clave, { marca, origen, fases: [] });
    grupos.get(clave).fases.push(fase);
  });

  return [...grupos.values()].flatMap(({ marca, origen, fases }) => {
    if (fases.some((fase) => fase.fase === 4)) return fases;
    return [...fases, crearFase4({ marca, origen, candidatos: fases })];
  });
};

// Calcula porcentajes, valores unitarios y totales sin alterar la tabla de fases.
export const calcularDescuentoYAportes = ({ costo, faseConfig, invFinal }) => {
  const descPct = faseConfig ? faseConfig.descConsumidor : 0;
  const inventarioMinimoReconocido = faseConfig?.inventarioMinimoReconocido ?? 0;
  const liquidacionSoloRetail = faseConfig?.fase === 4
    && invFinal < inventarioMinimoReconocido;
  const ioaPct = liquidacionSoloRetail ? 0 : (faseConfig ? faseConfig.aporteIOCA : 0);
  const retailPct = liquidacionSoloRetail ? 1 : (faseConfig ? faseConfig.aporteRetail : 0);
  const descUSD = costo * descPct;
  const ioaUSD = descUSD * ioaPct;
  const retailUSD = descUSD * retailPct;

  return {
    descPct,
    ioaPct,
    retailPct,
    descUSD,
    ioaUSD,
    retailUSD,
    descTotal: descUSD * invFinal,
    ioaTotal: ioaUSD * invFinal,
    retailTotal: retailUSD * invFinal,
    inventarioMinimoReconocido,
    liquidacionSoloRetail,
  };
};

// Conserva la acción operativa actual para cada bucket de un EOL en quiebre.
export const obtenerAccionQuiebreEOL = ({ alertaQuiebre, bucket }) => {
  if (!alertaQuiebre) return '';
  const bucketName = bucket ? bucket.bucket : 'EOL Sin Fecha';
  if (bucketName === 'EOL Planificado') {
    return 'Rebalanceo C→A — traer de otra tienda/bodega';
  }
  if (bucketName === 'EOL Próximo') {
    return 'Rebalanceo C→A o aceptar quiebre';
  }
  if (bucketName === 'EOL Crítico') {
    return 'Aceptar quiebre — liquidar lo que queda';
  }
  if (bucketName === 'EOL Vencido') {
    return 'Quiebre — dejar morir';
  }
  return 'Verificar Maestro y decidir';
};
