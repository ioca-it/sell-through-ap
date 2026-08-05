// =============================================================================
// IOCA Sell-Through Intelligence — Data Service
// =============================================================================
// Responsabilidad: Aislar el origen de los datos institucionales (Bucket EOL,
// Tabla de Fases, Países, Períodos, Umbrales) del resto de la aplicación.
//
// Estado actual: lee desde src/data/datos.json (archivo local embebido).
//
// FUTURO — Migración a Dataverse:
//   - Reemplazar la inicialización del caché por llamadas a Dataverse Web API
//   - Mantener la misma API pública (getBucketEOL, getTablaFases, etc.)
//   - El resto de la aplicación NO requiere cambios al migrar
// =============================================================================

import datos from '../data/datos.json';

// -----------------------------------------------------------------------------
// Caché interno
// -----------------------------------------------------------------------------
// En esta versión el caché se llena al cargar el módulo desde datos.json.
// Cuando se conecte a Dataverse, este bloque se reemplazará por:
//   const _cache = await fetchFromDataverse('iocaConfigSet');
// y la API pública se hará asíncrona.
// -----------------------------------------------------------------------------
const _cache = {
  bucketEOL: datos.bucketEOL,
  tablaFases: datos.tablaFases,
  paisesIOCA: datos.paisesIOCA,
  periodosAnalisis: datos.periodosAnalisis,
  umbralMermaPct: datos.umbralMermaPct,
  semanasPorPeriodo: datos.semanasPorPeriodo,
  notaInvSeguridadIOCA: datos.notaInvSeguridadIOCA,
  maestroSample: datos.maestroSample,
  inventarioSample: datos.inventarioSample,
};

// -----------------------------------------------------------------------------
// API pública del servicio de datos
// -----------------------------------------------------------------------------
export const dataService = {
  /**
   * Devuelve los buckets EOL pre-vencimiento (Vencido, Crítico, Próximo, Planificado).
   * Cada bucket define rangos en días, estrategia comercial y descuento base.
   */
  getBucketEOL() {
    return _cache.bucketEOL;
  },

  /**
   * Devuelve la tabla de descuento por fase post-EOL (F0, F1, F2, F3) por
   * marca y origen (USA o CHINA). Define los porcentajes de descuento al
   * consumidor y los aportes IOCA / Retail.
   */
  getTablaFases() {
    return _cache.tablaFases;
  },

  /**
   * Devuelve la lista de países donde opera IOCA Group para el selector
   * del tab de Configuración.
   */
  getPaises() {
    return _cache.paisesIOCA;
  },

  /**
   * Devuelve la lista de períodos de análisis estándar (Semanal, Mensual,
   * Trimestral, etc.) para el selector del tab de Configuración.
   */
  getPeriodos() {
    return _cache.periodosAnalisis;
  },

  /**
   * Devuelve el umbral de merma operativa (porcentaje del Inv. Inicial).
   * Por encima de este valor se dispara la alerta de merma en el dashboard.
   */
  getUmbralMerma() {
    return _cache.umbralMermaPct;
  },

  /**
   * Devuelve la tabla estándar IOCA de conversión de período a semanas.
   * Utilizada por el motor de Inv. Seguridad IOCA V1.
   *   Semanal=1 · Quincenal=2 · Mensual=4.33 · Bimestral=8.67
   *   Trimestral=13 · Semestral=26 · Anual=52
   * Período "Personalizado" solicita el valor al usuario en Configuración.
   */
  getSemanasPorPeriodo() {
    return _cache.semanasPorPeriodo;
  },

  /**
   * Devuelve la nota institucional del motor Inv. Seguridad IOCA V1 —
   * fórmula, condiciones que aplican y propósito consultivo.
   * Se muestra en Dashboard, Informe Ejecutivo PDF y Excel exportado.
   */
  getNotaInvSeguridadIOCA() {
    return _cache.notaInvSeguridadIOCA;
  },

  /**
   * Devuelve el contenido TSV del Maestro de Productos de ejemplo
   * (para el botón "Cargar ejemplo" del tab de Carga de Información).
   */
  getMaestroSample() {
    return _cache.maestroSample;
  },

  /**
   * Devuelve el contenido TSV del Inventario del Cliente de ejemplo
   * (para el botón "Cargar ejemplo" del tab de Carga de Información).
   */
  getInventarioSample() {
    return _cache.inventarioSample;
  },

  // ---------------------------------------------------------------------------
  // FUTURO: Punto de extensión para conexión a Dataverse
  // ---------------------------------------------------------------------------
  // async loadFromDataverse(config) {
  //   // 1. Autenticarse contra Dataverse (MSAL / token de Azure AD)
  //   // 2. Llamar a las tablas: ioca_bucket_eol, ioca_tabla_fases, ioca_paises, ioca_periodos
  //   // 3. Rellenar el caché preservando la misma estructura
  //   //
  //   // _cache.bucketEOL    = await fetchEntity('ioca_bucket_eol');
  //   // _cache.tablaFases   = await fetchEntity('ioca_tabla_fases');
  //   // _cache.paisesIOCA   = await fetchEntity('ioca_paises');
  //   // _cache.periodosAnalisis = await fetchEntity('ioca_periodos');
  //   // _cache.umbralMermaPct = await fetchConfig('umbralMermaPct');
  // },
};

export default dataService;
