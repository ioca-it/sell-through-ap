// =============================================================================
// Propósito: adaptar las fuentes locales actuales a un contrato de lectura único.
// Responsabilidad: leer textos de sesión y datos institucionales sin procesarlos.
// Contratos: readMaestro, readInventario, readParametros, readConfiguracion,
// readCatalogos y readDatosEjemplo devuelven los valores locales vigentes.
// Validación: protege tipos y formas locales mínimas sin definir esquema remoto.
// Dependencias: dataService, que encapsula src/data/datos.json.
// Fuente actual: estado entregado por la UI y configuración local embebida.
// Dataverse: este Provider podrá sustituirse por DataverseProvider mediante
// inyección en el Repository, sin cambiar Application Service ni Domain.
// AI-First: concentra y documenta el único adaptador de fuentes locales.
// =============================================================================

import { dataService } from '../../services/dataService.js';

const isObjectRecord = (value) => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
);

// Identifica en el borde local el valor que incumple el contrato esperado.
const assertString = (value, fieldName) => {
  if (typeof value !== 'string') {
    throw new Error(`LocalDataProvider: "${fieldName}" debe ser string.`);
  }
};

const assertArray = (value, fieldName) => {
  if (!Array.isArray(value)) {
    throw new Error(`LocalDataProvider: "${fieldName}" debe ser un arreglo.`);
  }
};

const assertObjectRecord = (value, fieldName) => {
  if (!isObjectRecord(value)) {
    throw new Error(`LocalDataProvider: "${fieldName}" debe ser un objeto válido.`);
  }
};

const assertNumber = (value, fieldName) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`LocalDataProvider: "${fieldName}" debe ser un número válido.`);
  }
};

// Captura el contexto local de una ejecución sin depender de React.
export const createLocalDataProvider = ({
  rawMaestro = '',
  rawInventario = '',
  config = null,
} = {}) => {
  assertString(rawMaestro, 'rawMaestro');
  assertString(rawInventario, 'rawInventario');
  if (config !== null) {
    assertObjectRecord(config, 'config');
  }

  return {
    readMaestro() {
      return rawMaestro;
    },

    readInventario() {
      return rawInventario;
    },

    readParametros() {
      const parametros = {
        bucketEOL: dataService.getBucketEOL(),
        tablaFases: dataService.getTablaFases(),
        umbralMermaPct: dataService.getUmbralMerma(),
        semanasPorPeriodo: dataService.getSemanasPorPeriodo(),
      };
      assertArray(parametros.bucketEOL, 'parametros.bucketEOL');
      assertArray(parametros.tablaFases, 'parametros.tablaFases');
      assertNumber(parametros.umbralMermaPct, 'parametros.umbralMermaPct');
      assertObjectRecord(parametros.semanasPorPeriodo, 'parametros.semanasPorPeriodo');
      return parametros;
    },

    readConfiguracion() {
      return config;
    },

    readCatalogos() {
      const catalogos = {
        paisesIOCA: dataService.getPaises(),
        periodosAnalisis: dataService.getPeriodos(),
        notaInvSeguridadIOCA: dataService.getNotaInvSeguridadIOCA(),
      };
      assertArray(catalogos.paisesIOCA, 'catalogos.paisesIOCA');
      assertArray(catalogos.periodosAnalisis, 'catalogos.periodosAnalisis');
      assertObjectRecord(
        catalogos.notaInvSeguridadIOCA,
        'catalogos.notaInvSeguridadIOCA',
      );
      return catalogos;
    },

    readDatosEjemplo() {
      const datosEjemplo = {
        maestro: dataService.getMaestroSample(),
        inventario: dataService.getInventarioSample(),
      };
      assertString(datosEjemplo.maestro, 'datosEjemplo.maestro');
      assertString(datosEjemplo.inventario, 'datosEjemplo.inventario');
      return datosEjemplo;
    },
  };
};
