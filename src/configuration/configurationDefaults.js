// =============================================================================
// Propósito: centralizar exclusivamente los defaults piloto del Configuration Center.
// Responsabilidad: declarar los valores vigentes de PAR-001, PAR-002 y PAR-003.
// Catálogo: las claves y valores corresponden a BUSINESS_PARAMETERS.md.
// Dataverse: no define entidades/campos; una fuente remota podrá reemplazar defaults.
// AI-First: mantiene un contrato pequeño, explícito y revisable sin depender de UI.
// =============================================================================

export const CONFIGURATION_DEFAULTS = Object.freeze({
  'app.version': 'V1',
  'app.name': 'IOCA Sell-Through Intelligence V1',
  'dataset.version': '1.0.0',
});
