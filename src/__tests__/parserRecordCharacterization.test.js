// Caracteriza parsers y ensamblaje invocando el flujo real de App sin renderizar el DOM.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const stateHarness = vi.hoisted(() => ({
  overrides: {},
  values: [],
  setters: [],
  nextIndex: 0,
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    useState: (initialValue) => {
      const index = stateHarness.nextIndex++;
      const hasOverride = Object.prototype.hasOwnProperty.call(stateHarness.overrides, index);
      const fallback = typeof initialValue === 'function' ? initialValue() : initialValue;
      stateHarness.values[index] = hasOverride ? stateHarness.overrides[index] : fallback;

      const setter = (nextValue) => {
        stateHarness.values[index] = typeof nextValue === 'function'
          ? nextValue(stateHarness.values[index])
          : nextValue;
      };
      stateHarness.setters[index] = setter;

      return [stateHarness.values[index], setter];
    },
  };
});

import App from '../App.jsx';

const SYSTEM_DATE = new Date(2026, 7, 15, 12, 0, 0);
const BASE_CONFIG = {
  codigoCliente: 'CONTROL-015',
  nombreCliente: 'Dataset controlado Prompt 015',
  pais: 'Guatemala',
  fechaCorte: '2030-01-15',
  periodoAnalizado: 'Mensual',
  periodoDetalle: 'Caracterización de parsers',
  semanasPersonalizadas: 4,
  safetyStockSemanas: 4,
  leadTimeUSA: 4,
  leadTimeCHINA: 12,
};

const textContent = (node) => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textContent).join('');
  return node.props ? textContent(node.props.children) : '';
};

const findElement = (node, predicate) => {
  if (node === null || node === undefined || typeof node === 'boolean') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElement(child, predicate);
      if (match) return match;
    }
    return null;
  }
  if (typeof node !== 'object' || !node.props) return null;
  if (predicate(node)) return node;
  return findElement(node.props.children, predicate);
};

const executeApp = ({ maestro, inventario, config = BASE_CONFIG }) => {
  stateHarness.overrides = {
    0: maestro,
    1: inventario,
    6: 'carga',
    7: config,
  };
  stateHarness.values = [];
  stateHarness.setters = [];
  stateHarness.nextIndex = 0;

  const tree = App();
  const calculateButton = findElement(
    tree,
    (node) => node.type === 'button' && textContent(node).includes('Calcular y ver dashboard'),
  );
  if (!calculateButton) throw new Error('No se encontró el handler actual de procesamiento.');

  calculateButton.props.onClick();

  return {
    resultados: stateHarness.values[2],
    error: stateHarness.values[3],
  };
};

const executeSuccessful = (maestro, inventario) => {
  const execution = executeApp({ maestro, inventario });
  expect(execution.error).toBeNull();
  expect(execution.resultados).not.toBeNull();
  return execution.resultados;
};

const basicMaestro = (rows, delimiter = '\t') => [
  ['MARCA', 'SKU', 'MODELO', 'CATEGORIA', 'ESTADO', 'USA', 'CHINA'].join(delimiter),
  ...rows.map((row) => row.join(delimiter)),
].join('\n');

const basicInventario = (rows, delimiter = '\t') => [
  ['TIENDA', 'SKU', 'TIER', 'ORIGEN', 'INV INICIAL', 'COMPRA', 'VENTAS', 'INV PROYECTADO', 'INV FINAL'].join(delimiter),
  ...rows.map((row) => row.join(delimiter)),
].join('\n');

const PRESENT_MASTER_RECORD_KEYS = [
  'accionSugerida',
  'alertaMerma',
  'alertaQuiebre',
  'bucket',
  'categoria',
  'clasificacionTemporal',
  'codigo',
  'compra',
  'costo',
  'costoCHINA',
  'costoUSA',
  'deltaInvSeguridad',
  'descPct',
  'descTotal',
  'descUSD',
  'diasDesc',
  'diasRestantes',
  'ean13',
  'estado',
  'fase',
  'fechaStr',
  'fuenteInvSeguridad',
  'indiceRotacion',
  'imageUrl',
  'invFinal',
  'invInicial',
  'invProyectado',
  'invSeguridad',
  'invSeguridadIOCA',
  'inventarioMinimoReconocido',
  'ioaPct',
  'ioaTotal',
  'ioaUSD',
  'leadTimeAplicado',
  'level',
  'liquidacionSoloRetail',
  'marca',
  'merma',
  'mermaPct',
  'modelo',
  'necesidadReposicion',
  'origen',
  'productUrl',
  'reposicionSugerida',
  'retailPct',
  'retailTotal',
  'retailUSD',
  'semanasPeriodo',
  'sinOrigenInv',
  'sku',
  'tienda',
  'tier',
  'valorInv',
  'valorReposicion',
  'valorVentas',
  'ventas',
].sort();

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(SYSTEM_DATE);
});

afterAll(() => {
  vi.useRealTimers();
});

describe('separadores y detección de encabezados', () => {
  it.each([
    ['tabulador', '\t'],
    ['coma', ','],
    ['punto y coma', ';'],
  ])('procesa Maestro e Inventario separados por %s', (_case, delimiter) => {
    const maestro = basicMaestro([
      ['marca control', 'SEP-1', 'Modelo separado', 'Audio', 'ACTIVO', '15.5', '12'],
    ], delimiter);
    const inventario = basicInventario([
      ['Tienda 1', 'SEP-1', 'good', 'usa', '10', '2', '3', '9', '8'],
    ], delimiter);

    const [record] = executeSuccessful(maestro, inventario).recs;

    expect(record).toMatchObject({
      sku: 'SEP-1',
      tienda: 'Tienda 1',
      modelo: 'Modelo separado',
      marca: 'MARCA CONTROL',
      categoria: 'AUDIO',
      costo: 15.5,
      invFinal: 8,
    });
  });

  it('normaliza mayúsculas, espacios, acentos y símbolos en ambos encabezados', () => {
    const maestro = [
      ' MÁRCA! ; S K U ; Modeló ; CATEGORÍAS ; Fecha Descontinuación ; ESTADO? ; U.S.A. ; CHÍNA ',
      'marca acentuada;HEAD-1;Modelo acentuado;audífonos;-;activo;21;18',
    ].join('\n');
    const inventario = [
      ' TÍENDA! ; S K U ; TÍER ; ORÍGEN? ; Inventário Final ($) ',
      'Sucursal acentuada;HEAD-1;better;china;7',
    ].join('\n');

    const [record] = executeSuccessful(maestro, inventario).recs;

    expect(record).toMatchObject({
      sku: 'HEAD-1',
      tienda: 'Sucursal acentuada',
      tier: 'BETTER',
      origen: 'CHINA',
      costo: 18,
      marca: 'MARCA ACENTUADA',
      categoria: 'AUDÍFONOS',
      invFinal: 7,
    });
  });

  it('prioriza columnas exactas aunque una coincidencia parcial aparezca antes', () => {
    const maestro = [
      'SKU ALTERNO\tSKU\tMODELO ALTERNO\tMODELO\tESTADO\tUSA\tCHINA',
      'SKU-EQUIVOCADO\tEXACT-1\tModelo parcial\tModelo exacto\tACTIVO\t31\t25',
    ].join('\n');
    const inventario = [
      'SKU ALTERNO\tSKU\tINV FINAL RESPALDO\tINV FINAL',
      'SKU-EQUIVOCADO\tEXACT-1\t999\t6',
    ].join('\n');

    const [record] = executeSuccessful(maestro, inventario).recs;

    expect(record).toMatchObject({
      sku: 'EXACT-1',
      modelo: 'Modelo exacto',
      invFinal: 6,
      costo: 31,
    });
  });

  it('usa coincidencias parciales cuando no existe un alias exacto', () => {
    const maestro = [
      'IDENTIFICADOR SKU CLIENTE\tDESCRIPCIÓN COMERCIAL EXTENDIDA\tESTADO VIGENTE\tEXW MIA USD',
      'PARTIAL-1\tModelo por descripción\tACTIVO\t42',
    ].join('\n');
    const inventario = [
      'IDENTIFICADOR SKU CLIENTE\tSALDO INVENTARIO FINAL ACTUAL\tCUENTA COMERCIAL\tSALES PERIODO',
      'PARTIAL-1\t5\tCuenta parcial\t2',
    ].join('\n');

    const [record] = executeSuccessful(maestro, inventario).recs;

    expect(record).toMatchObject({
      sku: 'PARTIAL-1',
      modelo: 'Modelo por descripción',
      tienda: 'Cuenta parcial',
      estado: 'ACTIVO',
      costoUSA: 42,
      ventas: 2,
      invFinal: 5,
    });
  });

  it('conserva la colisión parcial actual cuando otro encabezado contiene el alias USA', () => {
    const maestro = [
      'SKU\tSTATUS ACTUAL\tEXW MIA USD',
      'PARTIAL-COLLISION\tACTIVO\t42',
    ].join('\n');
    const inventario = 'SKU\tINV FINAL\nPARTIAL-COLLISION\t1';

    const [record] = executeSuccessful(maestro, inventario).recs;

    expect(record).toMatchObject({
      estado: 'ACTIVO',
      costoUSA: null,
      costo: null,
      valorInv: null,
    });
  });
});

describe('parser del Maestro y precedencia del cruce', () => {
  it('parsea estado EOL, fecha, mayúsculas, categoría y costos', () => {
    const maestro = [
      'MARCA\tSKU\tMODELO\tCATEGORIA\tFECHA EOL\tESTADO\tUSA\tCHINA',
      'Skullcandy\tMASTER-1\tCrusher\theadphones\t2026-1-15\tEOL\t$45.50\t38.25',
    ].join('\n');
    const inventario = 'SKU\tINV FINAL\nMASTER-1\t4';

    const [record] = executeSuccessful(maestro, inventario).recs;

    expect(record).toMatchObject({
      marca: 'SKULLCANDY',
      modelo: 'Crusher',
      categoria: 'HEADPHONES',
      estado: 'EOL',
      fechaStr: '2026-1-15',
      costoUSA: 45.5,
      costoCHINA: 38.25,
    });
    expect(record.diasDesc).toBe(198);
  });

  it('convierte DESCONTINUADO en EOL', () => {
    const maestro = 'SKU\tESTADO\tFECHA\nMASTER-2\tDescontinuado\t2026-08-01';
    const inventario = 'SKU\tINV FINAL\nMASTER-2\t0';

    const [record] = executeSuccessful(maestro, inventario).recs;

    expect(record).toMatchObject({ estado: 'EOL', fechaStr: '2026-08-01', diasDesc: 0 });
  });

  it('convierte cualquier otro estado en ACTIVO y conserva el texto de fecha sin calcularlo', () => {
    const maestro = 'SKU\tSTATUS\tFECHA\nMASTER-3\tPendiente\t2025-01-01';
    const inventario = 'SKU\tINV FINAL\nMASTER-3\t2';

    const [record] = executeSuccessful(maestro, inventario).recs;

    expect(record).toMatchObject({
      estado: 'ACTIVO',
      fechaStr: '2025-01-01',
      diasDesc: null,
      bucket: null,
      fase: null,
    });
  });

  it('aplica defaults del Maestro cuando faltan todas sus columnas opcionales', () => {
    const maestro = 'SKU\nMASTER-4';
    const inventario = 'SKU\tNOMBRE\tINV FINAL\nMASTER-4\tNombre del Inventario\t3';

    const [record] = executeSuccessful(maestro, inventario).recs;

    expect(record).toMatchObject({
      sku: 'MASTER-4',
      modelo: 'Nombre del Inventario',
      marca: '',
      categoria: '—',
      estado: 'ACTIVO',
      fechaStr: '—',
      costo: null,
      costoUSA: null,
      costoCHINA: null,
      valorInv: null,
    });
  });

  it('parsea moneda simple y conserva null para costos no numéricos', () => {
    const maestro = 'SKU\tUSA\tCHINA\nMASTER-5\t $14.50 \tabc';
    const inventario = 'SKU\tINV FINAL\nMASTER-5\t1';

    const [record] = executeSuccessful(maestro, inventario).recs;

    expect(record).toMatchObject({ costoUSA: 14.5, costoCHINA: null, costo: 14.5 });
  });

  it('conserva la última fila cuando el Maestro repite un SKU', () => {
    const maestro = basicMaestro([
      ['Marca inicial', 'DUP-M', 'Modelo inicial', 'Inicial', 'ACTIVO', '10', '8'],
      ['Marca final', 'DUP-M', 'Modelo final', 'Final', 'ACTIVO', '20', '16'],
    ]);
    const inventario = 'SKU\tINV FINAL\nDUP-M\t2';

    const [record] = executeSuccessful(maestro, inventario).recs;

    expect(record).toMatchObject({
      marca: 'MARCA FINAL',
      modelo: 'Modelo final',
      categoria: 'FINAL',
      costoUSA: 20,
      costoCHINA: 16,
    });
  });

  it('prioriza modelo, marca, estado, categoría y costos del Maestro', () => {
    const maestro = basicMaestro([
      ['Marca maestra', 'PRECEDENCE-1', 'Modelo maestro', 'Categoría maestra', 'ACTIVO', '30', '24'],
    ]);
    const inventario = [
      'SKU\tMARCA\tEOL\tNOMBRE\tORIGEN\tINV FINAL',
      'PRECEDENCE-1\tMarca inventario\tEOL\tModelo inventario\tCHINA\t2',
    ].join('\n');

    const [record] = executeSuccessful(maestro, inventario).recs;

    expect(record).toMatchObject({
      modelo: 'Modelo maestro',
      marca: 'MARCA MAESTRA',
      estado: 'ACTIVO',
      categoria: 'CATEGORÍA MAESTRA',
      origen: 'CHINA',
      costo: 24,
    });
  });

  it('usa el nombre del Inventario solo cuando el modelo del Maestro está vacío', () => {
    const maestro = [
      'SKU\tMODELO\tESTADO',
      'FALLBACK-NAME\t\tACTIVO',
    ].join('\n');
    const inventario = 'SKU\tNOMBRE\tINV FINAL\nFALLBACK-NAME\tModelo de respaldo\t1';

    const [record] = executeSuccessful(maestro, inventario).recs;

    expect(record.modelo).toBe('Modelo de respaldo');
  });
});

describe('parser del Inventario y manejo de filas', () => {
  it('reconoce alias, normaliza texto y parsea enteros con contenido adicional', () => {
    const maestro = 'SKU\nINV-1';
    const inventario = [
      'SUCURSAL\tCODIGO CLIENTE\tEAN\tSKU\tTIER\tDESCRIPCION\tORIGEN\tSAFETY STOCK\tINVENTARIO INICIAL\tRECIBIDO\tSALES\tPROYECTADO\tFINAL',
      'Sucursal 1\tC-15\t750123\tINV-1\tbetter\tNombre inventario\tchina\t12 unidades\t-7 unidades\t3 recibidas\t2 ventas\t8 proyectadas\t6 finales',
    ].join('\n');

    const [record] = executeSuccessful(maestro, inventario).recs;

    expect(record).toMatchObject({
      tienda: 'Sucursal 1',
      codigo: 'C-15',
      ean13: '750123',
      tier: 'BETTER',
      modelo: 'Nombre inventario',
      origen: 'CHINA',
      invSeguridad: 12,
      invInicial: -7,
      compra: 3,
      ventas: 2,
      invProyectado: 8,
      invFinal: 6,
    });
  });

  it('aplica defaults cuando faltan columnas opcionales del Inventario', () => {
    const maestro = 'SKU\nINV-2';
    const inventario = 'SKU\tINV FINAL\nINV-2\t7';

    const [record] = executeSuccessful(maestro, inventario).recs;

    expect(record).toMatchObject({
      tienda: 'N/A',
      codigo: '',
      ean13: '',
      tier: 'GOOD',
      invSeguridad: 0,
      invInicial: 0,
      compra: 0,
      ventas: 0,
      invFinal: 7,
    });
  });

  it('calcula el proyectado por fallback cuando falta toda la columna', () => {
    const maestro = 'SKU\nINV-3';
    const inventario = 'SKU\tINV INICIAL\tCOMPRA\tVENTAS\tINV FINAL\nINV-3\t10\t5\t3\t12';

    const [record] = executeSuccessful(maestro, inventario).recs;

    expect(record.invProyectado).toBe(12);
  });

  it('conserva cero cuando la columna proyectada existe pero la celda está vacía', () => {
    const maestro = 'SKU\nINV-4';
    const inventario = 'SKU\tINV INICIAL\tCOMPRA\tVENTAS\tINV PROYECTADO\tINV FINAL\nINV-4\t10\t5\t3\t\t12';

    const [record] = executeSuccessful(maestro, inventario).recs;

    expect(record.invProyectado).toBe(0);
  });

  it('ignora filas con SKU vacío en Maestro e Inventario', () => {
    const maestro = [
      'SKU\tMODELO',
      '\tModelo ignorado',
      'VALID-1\tModelo válido',
    ].join('\n');
    const inventario = [
      'SKU\tINV FINAL',
      '\t99',
      'VALID-1\t4',
    ].join('\n');

    const records = executeSuccessful(maestro, inventario).recs;

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ sku: 'VALID-1', modelo: 'Modelo válido', invFinal: 4 });
  });

  it('preserva cada fila cuando el Inventario repite un SKU', () => {
    const maestro = 'SKU\nDUP-I';
    const inventario = 'SKU\tTIENDA\tINV FINAL\nDUP-I\tTienda A\t2\nDUP-I\tTienda B\t5';

    const records = executeSuccessful(maestro, inventario).recs;

    expect(records).toHaveLength(2);
    expect(records.map(({ sku, tienda, invFinal }) => ({ sku, tienda, invFinal }))).toEqual([
      { sku: 'DUP-I', tienda: 'Tienda A', invFinal: 2 },
      { sku: 'DUP-I', tienda: 'Tienda B', invFinal: 5 },
    ]);
  });
});

describe('registros SIN MAESTRO y contratos finales', () => {
  it('ensambla defaults SIN MAESTRO sin inventar porcentajes ni valor de reposición', () => {
    const maestro = 'SKU\nOTRO-SKU';
    const inventario = [
      'TIENDA\tCODIGO\tEAN13\tSKU\tNOMBRE\tTIER\tORIGEN\tINV SEGURIDAD\tINV INICIAL\tCOMPRA\tVENTAS\tINV PROYECTADO\tINV FINAL',
      'Tienda X\tC-99\t750999\tNO-MASTER-1\tNombre sin maestro\tbest\tchina\t5\t10\t2\t3\t9\t4',
    ].join('\n');

    const [record] = executeSuccessful(maestro, inventario).recs;

    expect(record).toMatchObject({
      sku: 'NO-MASTER-1',
      tienda: 'Tienda X',
      codigo: 'C-99',
      ean13: '750999',
      modelo: 'Nombre sin maestro',
      marca: 'SIN MAESTRO',
      estado: 'SIN MAESTRO',
      tier: 'BEST',
      categoria: 'SIN CATEGORIA',
      fechaStr: '—',
      diasDesc: null,
      bucket: null,
      fase: null,
      origen: 'CHINA',
      sinOrigenInv: false,
      costo: 0,
      invSeguridadIOCA: 5,
      fuenteInvSeguridad: 'Cliente',
      reposicionSugerida: 0,
      valorInv: 0,
      valorVentas: 0,
    });
    expect(record).not.toHaveProperty('ioaPct');
    expect(record).not.toHaveProperty('retailPct');
    expect(record).not.toHaveProperty('valorReposicion');
  });

  it('aplica nombre, origen y acción actuales cuando faltan Maestro y datos opcionales', () => {
    const maestro = 'SKU\nOTRO-SKU';
    const inventario = 'SKU\tINV SEGURIDAD\tINV FINAL\nNO-MASTER-2\t5\t2';

    const [record] = executeSuccessful(maestro, inventario).recs;

    expect(record).toMatchObject({
      modelo: '(sin info)',
      origen: '—',
      sinOrigenInv: true,
      alertaQuiebre: true,
      reposicionSugerida: 0,
      accionSugerida: 'Agregar al Maestro y decidir',
    });
  });

  it('conserva el conjunto exacto de campos del record con Maestro', () => {
    const maestro = basicMaestro([
      ['Marca', 'SHAPE-1', 'Modelo', 'Categoría', 'ACTIVO', '25', '20'],
    ]);
    const inventario = [
      'TIENDA\tCODIGO\tEAN13\tSKU\tTIER\tORIGEN\tINV SEGURIDAD\tINV INICIAL\tCOMPRA\tVENTAS\tINV PROYECTADO\tINV FINAL',
      'Tienda\tC-1\t750001\tSHAPE-1\tGOOD\tUSA\t2\t6\t1\t2\t5\t4',
    ].join('\n');

    const [record] = executeSuccessful(maestro, inventario).recs;

    expect(Object.keys(record).sort()).toEqual(PRESENT_MASTER_RECORD_KEYS);
    expect(record).toMatchObject({
      sku: 'SHAPE-1',
      tienda: 'Tienda',
      codigo: 'C-1',
      ean13: '750001',
      modelo: 'Modelo',
      marca: 'MARCA',
      estado: 'ACTIVO',
      tier: 'GOOD',
      categoria: 'CATEGORÍA',
      origen: 'USA',
      costo: 25,
      invSeguridad: 2,
      invInicial: 6,
      compra: 1,
      ventas: 2,
      invProyectado: 5,
      invFinal: 4,
    });
  });
});

describe('validaciones y datasets límite', () => {
  it('reporta el encabezado detectado cuando el Maestro no tiene SKU', () => {
    const execution = executeApp({
      maestro: 'MARCA\tMODELO\nMarca\tModelo',
      inventario: 'SKU\tINV FINAL\nSKU-1\t1',
    });

    expect(execution.resultados).toBeNull();
    expect(execution.error).toBe("El Maestro necesita columna 'SKU'. Detecté: MARCA\tMODELO");
  });

  it('reporta el encabezado detectado cuando el Inventario no tiene SKU', () => {
    const execution = executeApp({
      maestro: 'SKU\nSKU-1',
      inventario: 'MODELO\tINV FINAL\nModelo\t1',
    });

    expect(execution.resultados).toBeNull();
    expect(execution.error).toBe("El Inventario necesita columna 'SKU'. Detecté: MODELO\tINV FINAL");
  });

  it('reporta error cuando el Inventario no tiene Inv Final o equivalente', () => {
    const execution = executeApp({
      maestro: 'SKU\nSKU-1',
      inventario: 'SKU\tVENTAS\nSKU-1\t1',
    });

    expect(execution.resultados).toBeNull();
    expect(execution.error).toBe("El Inventario necesita columna 'Inv Final' o equivalente.");
  });

  it('acepta datasets que solo contienen encabezados obligatorios y produce cero registros', () => {
    const resultados = executeSuccessful('SKU', 'SKU\tINV FINAL');

    expect(resultados.recs).toEqual([]);
    expect(resultados.totales.totalSKUs).toBe(0);
  });
});
