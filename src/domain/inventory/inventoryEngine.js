// =============================================================================
// Propósito: concentrar las reglas puras del Inventory Engine caracterizadas.
// Responsabilidad: recibir números/configuración ya normalizados y devolver cálculos.
// Entradas/Salidas: no parsea fuentes; opera con valores explícitos y objetos simples.
// Reglas protegidas: defaults, fórmulas, redondeos, quiebre y reposición vigentes.
// Dependencias: ninguna; no accede a React, JSON, archivos, red ni dataService.
// Evolución: admite orquestación futura por Repository/Provider sin conocer Dataverse.
// =============================================================================

const FALLBACK_SEMANAS_PERIODO = 4.33;

// Resuelve las semanas del período y conserva el fallback institucional vigente.
export const obtenerSemanasPeriodo = (periodo, semanasPersonalizadas, semanasPorPeriodo) => {
  if (periodo === 'Personalizado') {
    const n = parseFloat(semanasPersonalizadas);
    return isNaN(n) || n <= 0 ? FALLBACK_SEMANAS_PERIODO : n;
  }
  return semanasPorPeriodo[periodo] || FALLBACK_SEMANAS_PERIODO;
};

// Conserva el valor informado o calcula el proyectado cuando falta toda la columna.
export const calcularInventarioProyectado = ({
  columnaDisponible,
  valorInformado,
  invInicial,
  compra,
  ventas,
}) => columnaDisponible ? valorInformado : (invInicial + compra - ventas);

// Calcula merma, proporción y alerta con comparación estricta contra el umbral.
export const calcularMerma = ({ invProyectado, invFinal, invInicial, umbralMermaPct }) => {
  const merma = invProyectado - invFinal;
  const mermaPct = invInicial > 0 ? merma / invInicial : 0;
  const alertaMerma = invInicial > 0 && mermaPct > umbralMermaPct;

  return { merma, mermaPct, alertaMerma };
};

// Mantiene null cuando no existen ventas para evitar una división indefinida.
export const calcularIndiceRotacion = ({ invInicial, ventas }) =>
  ventas > 0 ? invInicial / ventas : null;

// Normaliza el origen efectivo: únicamente CHINA evita el fallback USA.
export const seleccionarOrigen = (origenInv) => ({
  sinOrigenInv: !origenInv,
  origen: origenInv === 'CHINA' ? 'CHINA' : 'USA',
});

// Selecciona el costo del Maestro correspondiente al origen ya resuelto.
export const seleccionarCostoPorOrigen = ({ origen, costoUSA, costoCHINA }) =>
  origen === 'CHINA' ? costoCHINA : costoUSA;

// Aplica la fórmula IOCA o conserva el piso del cliente cuando Ventas es cero.
export const calcularInventarioSeguridadIOCA = ({
  ventas,
  semanasPeriodo,
  safetyStockSemanas,
  leadTimeUSA,
  leadTimeCHINA,
  origen,
  invSeguridadCliente,
}) => {
  const leadTimeAplicado = origen === 'CHINA' ? leadTimeCHINA : leadTimeUSA;
  let invSeguridadIOCA;
  let fuenteInvSeguridad;

  if (ventas > 0 && semanasPeriodo > 0) {
    invSeguridadIOCA = Math.ceil(
      (ventas / semanasPeriodo) * (safetyStockSemanas + leadTimeAplicado),
    );
    fuenteInvSeguridad = 'IOCA';
  } else {
    invSeguridadIOCA = invSeguridadCliente;
    fuenteInvSeguridad = 'Cliente';
  }

  return {
    invSeguridadIOCA,
    fuenteInvSeguridad,
    leadTimeAplicado,
    deltaInvSeguridad: invSeguridadIOCA - invSeguridadCliente,
  };
};

// Conserva la necesidad vigente y descuenta el inventario en tránsito. La alerta
// compara el proyectado porque representa la posición esperada al cierre.
export const calcularQuiebreYReposicion = ({
  estado,
  invSeguridadIOCA,
  invFinal,
  invProyectado = invFinal,
  compra = 0,
  existeEnMaestro = estado !== 'SIN MAESTRO',
}) => {
  const compraNormalizada = Number.isFinite(compra) ? compra : 0;
  const necesidadReposicion = Math.max(0, invSeguridadIOCA - invFinal);
  const permiteReposicion = existeEnMaestro && estado === 'ACTIVO';

  return {
    necesidadReposicion,
    reposicionSugerida: permiteReposicion
      ? Math.max(0, necesidadReposicion - compraNormalizada)
      : 0,
    alertaQuiebre: invSeguridadIOCA > 0 && invProyectado < invSeguridadIOCA,
  };
};

// Conserva el texto operativo de reposición para un activo en quiebre.
export const obtenerAccionQuiebreActivo = ({
  alertaQuiebre,
  reposicionSugerida,
  invSeguridadIOCA,
  invFinal,
}) => {
  const cantidad = reposicionSugerida ?? Math.max(0, invSeguridadIOCA - invFinal);
  return alertaQuiebre && cantidad > 0 ? `Reponer ${cantidad} u (orden de compra)` : '';
};
