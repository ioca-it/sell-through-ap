// =============================================================================
// Propósito: centralizar la normalización de encabezados recibidos por la aplicación.
// Responsabilidad: producir claves comparables sin alterar el contrato del parser actual.
// Dependencias: únicamente métodos estándar de String; no depende de React ni de datos.
// Preparación para IA: mantiene el contrato de normalización aislado y fácil de auditar.
// Preparación para Dataverse: no conoce fuentes ni columnas; normaliza cualquier encabezado.
// =============================================================================

// Normaliza encabezados para reconocer variantes de columnas en las entradas actuales.
export const normalizeHeader = (h) => h.toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
