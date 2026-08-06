// =============================================================================
// Propósito: centralizar el formato visible de valores numéricos de la aplicación.
// Responsabilidad: convertir importes, porcentajes e índices en textos de UI/exportación.
// Dependencias: únicamente APIs estándar de JavaScript; no depende de React ni de datos.
// Preparación para IA: mantiene helpers puros aislados para facilitar revisión y pruebas.
// Preparación para Dataverse: no conoce fuentes; formatea cualquier valor ya normalizado.
// =============================================================================

// Presenta importes en USD con el contrato visual vigente de dos decimales.
export const fmtUSD = (v) => {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Los porcentajes visibles se presentan sin decimales por acuerdo funcional.
export const fmtPct = (v) => {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return `${(v * 100).toFixed(0)}%`;
};

// Presenta índices numéricos con la precisión usada en las tablas actuales.
export const fmtIdx = (v) => {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return v.toFixed(2);
};

// Conserva el formato USD específico usado por los paneles de distribución.
export const fmtUSDInline = (v) => {
  if (v === null || v === undefined || isNaN(v)) return '—';
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
