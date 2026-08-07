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

// Presenta porcentajes que el dominio ya entrega en puntos porcentuales.
export const fmtPctPoints = (v) => {
  if (v === null || v === undefined || typeof v !== 'number' || Number.isNaN(v)) return '—';
  return `${v.toFixed(0)}%`;
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

// La UI solo puede entregar a React valores escalares como texto visible. Los
// objetos de los DTO se consumen por sus campos y nunca como hijos directos.
export const toDisplayValue = (value, fallback = '—') => {
  if (value === null || value === undefined) return fallback;
  return typeof value === 'string' || typeof value === 'number' ? value : fallback;
};
