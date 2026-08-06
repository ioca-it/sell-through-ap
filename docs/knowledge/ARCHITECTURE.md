# Arquitectura

## Estado implementado

La aplicación es una SPA React construida con Vite. El navegador procesa entradas, mantiene estado, calcula resultados y genera exportaciones sin comunicarse con un backend.

Flujo efectivo actual:

```text
index.html
  -> src/main.jsx
    -> src/App.jsx
      -> src/repositories/sellThroughRepository.js
        -> src/configuration/configurationService.js
          -> src/configuration/configurationSchema.js
            -> src/configuration/configurationDefaults.js
        -> src/providers/local/localDataProvider.js
          -> src/services/dataService.js
            -> src/data/datos.json
      -> src/application/sellThroughApplicationService.js
        -> src/repositories/sellThroughRepository.js
        -> src/domain/parser/masterParser.js
        -> src/domain/parser/inventoryParser.js
        -> src/domain/parser/recordAssembler.js
          -> src/domain/inventory/inventoryEngine.js
          -> src/domain/eol/eolEngine.js
            -> src/utils/dateUtils.js
      -> src/utils/formatters.js
      -> src/utils/dateUtils.js
      -> src/utils/headerUtils.js
```

Las entradas del usuario siguen un segundo flujo interno:

```text
Áreas de texto + estado React
  -> Local Provider creado exclusivamente por Repository
    -> Repository entregado por App.jsx al Application Service
    -> Master Parser + Inventory Parser
      -> Record Assembler
        -> Inventory Engine / EOL Engine
    -> Portfolio Analysis Service: consolidación inicial
    -> Distribution y Pareto conservados en Application Service
    -> Portfolio Analysis Service: alertas, totales y estructura final
    -> resultados en memoria
      -> dashboard / informe / CSV / Excel
```

## Responsabilidades actuales por archivo

| Archivo | Responsabilidad observable |
| --- | --- |
| `index.html` | Contenedor HTML, metadatos, favicon y carga de Tailwind por CDN. |
| `src/main.jsx` | Montaje de React en `#root` bajo `React.StrictMode`. |
| `src/App.jsx` | UI, estado React, navegación, composición del Repository, llamada al Application Service, informe y exportaciones. Ya no contiene parsing, ensamblaje, orquestación del cálculo ni acceso directo a fuentes. |
| `src/application/sellThroughApplicationService.js` | Caso de uso síncrono: obtiene entradas/configuración solo por Repository, exige las cinco claves mínimas, coordina parsers/assembler y Portfolio Analysis, y conserva exclusivamente los cálculos de Distribution y Pareto. |
| `src/domain/parser/masterParser.js` | Parser puro del Maestro: aliases, columnas, defaults, fechas, costos y último duplicado por SKU. |
| `src/domain/parser/inventoryParser.js` | Parser puro del Inventario: aliases, validaciones, defaults, enteros y conservación de filas por SKU. |
| `src/domain/parser/recordAssembler.js` | Cruce de cada fila con Maestro y ensamblaje del `record` mediante Inventory/EOL Engine. |
| `src/domain/portfolio/PortfolioAnalysisService.js` | Business Service puro que consolida records procesados y devuelve alertas, totales, snapshot y estructura final profundamente inmutables; no implementa Distribution, Pareto, Executive Report o Recommendation Engine. |
| `src/domain/inventory/inventoryEngine.js` | Reglas puras de inventario, merma, rotación, origen, costo, seguridad, quiebre y reposición. |
| `src/domain/eol/eolEngine.js` | Reglas puras de días EOL, buckets, fases, descuentos, aportes y acciones por quiebre EOL. |
| `src/utils/formatters.js` | Formato puro de importes USD, porcentajes e índices. |
| `src/utils/dateUtils.js` | Interpretación de fechas, diferencia en días y fecha base del primer día del mes. |
| `src/utils/headerUtils.js` | Normalización de encabezados para el parser de entradas. |
| `src/utils/__tests__/*.test.js` | Caracterización automatizada de los contratos públicos de los tres módulos de utilidades. |
| `src/__tests__/inventoryEolCharacterization.test.js` | 40 casos sobre motores puros, incluida una prueba puente desde el handler real de `App`. |
| `src/__tests__/parserRecordCharacterization.test.js` | 28 casos de parsers/records que atraviesan el handler de `App` y el Application Service. |
| `src/repositories/sellThroughRepository.js` | Único consumidor autorizado de un Provider; valida sus seis métodos, consume el resultado central de validación del Configuration Center y expone sin cambios contratos estables para Maestro, Inventario, parámetros, configuración, catálogos y ejemplos. |
| `src/providers/local/localDataProvider.js` | Adaptador local que valida textos y formas locales mínimas, lee el contexto de sesión y consume `dataService` para configuración institucional y ejemplos. |
| `src/configuration/configurationDefaults.js` | Centraliza exclusivamente los defaults de PAR-001, PAR-002 y PAR-003. |
| `src/configuration/configurationSchema.js` | Fuente única autorizada de IDs, claves y metadatos de los tres pilotos; valida unicidad y consistencia estructural. |
| `src/configuration/configurationService.js` | Valida el schema una vez al cargar, deriva de él las claves y expone lectura síncrona de configuración/valor/default e integridad, sin React, UI, Provider o persistencia. |
| `src/repositories/__tests__/sellThroughRepository.test.js` | 19 casos dedicados para delegación, contrato estructural del Provider, nulabilidad y configuración requerida por el caso de uso. |
| `src/providers/local/__tests__/localDataProvider.test.js` | 15 casos dedicados para las seis lecturas y validaciones de formas locales. |
| `src/services/dataService.js` | Fachada síncrona y caché local, consumida exclusivamente por `localDataProvider.js`. |
| `src/data/datos.json` | Configuración institucional temporal y muestras TSV embebidas. |
| `vite.config.js` | Build a `dist`, servidor local y límites de Vite. |

## Refactorización Fase 1 — funciones puras

Prompt 011 extrajo de `App.jsx` ocho funciones sin cambiar firmas, parámetros, cuerpos ni consumidores:

- `formatters.js`: `fmtUSD`, `fmtPct`, `fmtIdx`, `fmtUSDInline`;
- `dateUtils.js`: `parseFecha`, `diasEntre`, `primerDiaMes`;
- `headerUtils.js`: `normalizeHeader`.

Los módulos no dependen de React, estado, configuración institucional, Repository, Provider ni Dataverse. Esta separación reduce responsabilidades del componente, pero no altera el flujo funcional ni constituye todavía Application Service o Domain Service.

## Pruebas de caracterización de utilidades

Prompt 012 incorporó Vitest `3.2.7`, compatible con el Vite 5 vigente, y el script `npm test`. La suite usa el entorno Node predeterminado porque las utilidades no dependen del DOM; no requiere `jsdom` ni un archivo de configuración adicional.

La cobertura implementada consta de 49 pruebas en tres archivos:

- `formatters.test.js`: 24 casos para importes, porcentajes e índices;
- `dateUtils.test.js`: 19 casos para formatos admitidos, entradas inválidas, diferencias y fecha base mensual;
- `headerUtils.test.js`: 6 casos para mayúsculas, espacios, acentos, símbolos y números.

Estas pruebas congelan el comportamiento actual de los ocho exports extraídos. No prueban todavía motores de negocio, JSX, estado React, exportaciones ni flujos completos de usuario.

## Caracterización y extracción de Inventory Engine y EOL Engine

Prompt 013 agregó 40 pruebas que originalmente ejecutaban el handler `procesar` definido dentro de `App.jsx`. Prompt 014 extrajo 14 funciones puras y adaptó esos mismos casos para probar directamente los módulos de dominio.

La fecha del sistema se fija en `2026-08-15`, por lo que la fecha base funcional queda congelada en `2026-08-01`. Los datasets TSV controlados cubren merma, rotación, inventario de seguridad, quiebre, reposición, origen, costo, buckets, fases, descuentos y aportes.

Una prueba puente conserva el arnés de estado React para ejecutar el flujo real desde `App`; las restantes aserciones de ese archivo consumen los contratos de dominio directamente. Al cerrar Prompt 014, la suite mantenía 89 pruebas en cuatro archivos: 49 de utilidades y 40 de los motores.

## Refactorización Fase 2 — módulos de dominio

Al cerrar Prompt 014, `App.jsx` seguía como orquestador temporal: obtenía configuración mediante `dataService`, parseaba las entradas, entregaba números/tablas a los motores y ensamblaba resultados. Los módulos de dominio no importaban `dataService`, `datos.json`, React, Repository, Provider ni Dataverse.

Contratos implementados:

- Inventory Engine recibe valores ya parseados, configuración de período, safety stock, lead times y costos; devuelve métricas y decisiones simples.
- EOL Engine recibe fechas, origen/costo, buckets y tabla de fases; devuelve días, selección institucional, importes y acciones.
- La fecha base sigue siendo `primerDiaMes()` en `App`; `fechaCorte` no se entrega al EOL Engine.
- Las fuentes continúan encapsuladas en `dataService`; la extracción no modifica su contrato.

## Caracterización de parsers y ensamblaje

Prompt 015 agregó `parserRecordCharacterization.test.js` con 28 pruebas que ejecutan el handler real `procesar` desde `App` mediante un arnés exclusivo de test. No se exportaron ni copiaron parsers, fórmulas o servicios de producción.

Los datasets controlados congelan separadores, encabezados, coincidencias exactas y parciales, alias, columnas faltantes, filas sin SKU, duplicados, precedencia del Maestro, defaults, registros `SIN MAESTRO` y el conjunto de campos del registro con Maestro. La fecha del sistema permanece fija en `2026-08-15` para que el ensamblaje EOL sea determinista.

La suite completa queda en 117 pruebas distribuidas en cinco archivos: 49 de utilidades, 40 de Inventory/EOL y 28 de parsers/records. Los 28 casos nuevos atraviesan `App`, pero no renderizan DOM ni acreditan accesibilidad, interacción real de navegador, Pareto, Distribution, Executive Report o exportaciones.

## Refactorización Fase 3 — Parsers y Application Service

Prompt 016 implementó cuatro contratos sin cambiar el comportamiento caracterizado:

- `parseMaster(rawMaster)` devuelve `masterBySku` o el error contractual del Maestro;
- `parseInventory(rawInventory)` devuelve filas normalizadas o el error contractual del Inventario;
- `assembleRecord(...)` recibe Maestro, fila de Inventario, fecha, configuración y tablas explícitas, y devuelve el `record` vigente;
- `processSellThrough(...)` valida, coordina el pipeline y devuelve `{ resultados, error }` sin depender de React o JSX.

`App.jsx` conserva el estado y traduce el retorno del servicio a `setResultados`, `setError` y navegación al Dashboard. La configuración institucional se obtiene todavía con `dataService` en el borde actual y se entrega explícitamente al servicio; ninguno de los cuatro módulos nuevos importa una fuente física o asume Dataverse.

Las 117 pruebas continuaron aprobando sin modificar casos. Los 28 casos de parsers/records y el puente de Inventory/EOL siguen entrando por el handler real de `App`, por lo que también validan la integración del nuevo Application Service.

## Refactorización Fase 4 — Repository Layer y Local Provider

Prompt 017 implementó la primera frontera completa de acceso a datos sin cambiar reglas ni resultados:

- `createSellThroughRepository(...)` expone `getMaestro`, `getInventario`, `getParametros`, `getConfiguracion`, `getCatalogos` y `getDatosEjemplo`;
- `createLocalDataProvider(...)` adapta textos/configuración de sesión y los getters locales de `dataService`;
- `App.jsx` obtiene catálogos, parámetros y muestras por Repository, compone el contexto de cada ejecución y entrega ese Repository al Application Service;
- `processSellThrough(repository)` desconoce el origen y obtiene Maestro, Inventario, parámetros y configuración solo mediante el contrato recibido;
- `dataService` ya no tiene consumidores directos fuera del Local Provider.

El Repository admite un Provider compatible inyectado. Esta inversión permite sustituir el adaptador local por un futuro DataverseProvider sin modificar Repository, Application Service o Domain. La primera versión conserva contratos síncronos; no define autenticación, asincronía ni esquema Dataverse.

## Refactorización Fase 5 — contratos Repository y Provider fortalecidos

Prompt 018 aprobó y protegió esta separación contractual:

- un Repository parcial puede devolver `null` desde `getConfiguracion()` cuando solo se usa para catálogos o datos de ejemplo;
- `processSellThrough(repository)` exige `periodoAnalizado`, `semanasPersonalizadas`, `safetyStockSemanas`, `leadTimeUSA` y `leadTimeCHINA` antes de usar configuración;
- configuración ausente, de tipo inválido o incompleta devuelve `{ resultados: null, error }` con mensaje controlado;
- Repository valida al construirse que el Provider implemente como funciones sus seis métodos `read*`;
- Local Provider valida strings de entrada y las formas mínimas de parámetros, configuración, catálogos y datos de ejemplo, sin introducir un esquema Dataverse.

Se agregaron 34 pruebas dedicadas. La suite completa queda en 151 pruebas distribuidas en siete archivos, manteniendo los 117 casos anteriores.

## Refactorización Fase 6 — Configuration Center Foundation

Prompt 020 implementó la base mínima aprobada con solo PAR-001 (`app.version`), PAR-002 (`app.name`) y PAR-003 (`dataset.version`):

- `configurationDefaults.js` centraliza únicamente sus tres valores predeterminados;
- `configurationSchema.js` conserva sus metadatos según `BUSINESS_PARAMETERS.md`;
- `configurationService.js` obtiene la configuración completa, un valor por clave, el default y valida existencia;
- Repository consume el servicio para verificar internamente las tres claves al construirse;
- los seis métodos públicos, las formas devueltas por Provider y el contrato nullable de configuración permanecen sin cambios.

La foundation no crea UI, Provider, DataverseProvider, persistencia, asincronía ni esquema remoto. Para preservar comportamiento y la restricción de no modificar `App.jsx`, los literales visibles actuales y el metadato del JSON siguen siendo superficies de compatibilidad; el servicio todavía no los sustituye en UI ni altera salidas.

## Refactorización Fase 7 — Configuration Schema como Single Source of Truth

Prompt 021 elimina la lista manual de claves que Repository mantenía en paralelo. `CONFIGURATION_SCHEMA` pasa a ser el único registro autorizado para enumerar los pilotos; `configurationService` valida el catálogo una sola vez al cargar el módulo y Repository consume exclusivamente el resultado de esa validación.

La validación rechaza IDs duplicados, keys duplicadas, definiciones sin los ocho campos contractuales, metadatos textuales vacíos, `editable` no booleano, tipos no soportados y defaults incompatibles con el tipo declarado. Los valores predeterminados continúan almacenados una sola vez en `configurationDefaults.js` y son referenciados por el schema, por lo que no se crea una segunda fuente de defaults.

Se agregan tres pruebas unitarias dedicadas. La suite queda en 154 pruebas distribuidas en ocho archivos y conserva las 151 pruebas preexistentes. No se agregan parámetros, overrides, UI, Provider, persistencia, asincronía ni contratos públicos de Repository.

## Refactorización Fase 8 — Portfolio Analysis Service

Prompt 022 extrae desde Application Service la consolidación de records, clasificaciones `EOL`/`ACTIVO`/`SIN MAESTRO`, alertas, agregados EOL y reposición, métricas generales, snapshot de configuración y armado del objeto final. El nuevo Business Service recibe exclusivamente records ya ensamblados y dependencias explícitas; no conoce React, UI, Repository, Provider, `datos.json` ni fuentes físicas.

El contrato interno se divide en dos operaciones síncronas:

- `consolidateRecords(records)` conserva filtros y ordenamientos y devuelve el contexto inmutable requerido por los cálculos posteriores;
- `analyzePortfolio(...)` integra métricas generales con Distribution y Pareto ya calculados y devuelve la estructura final profundamente inmutable.

Application Service continúa validando entradas, obteniendo datos por Repository, coordinando parsers/assembler y ejecutando físicamente Distribution y Pareto entre ambas operaciones. Executive Report, exportaciones y Recommendation Engine permanecen fuera del nuevo servicio. Los 154 casos existentes continúan aprobados sin modificar reglas, fórmulas, ordenamientos, parámetros o contrato público.

### Endurecimiento de inmutabilidad — Prompt 023

El contrato de inmutabilidad se limita a estructuras propias: `PortfolioAnalysisService` clona los contenedores recibidos de Application Service antes de incorporarlos a la consolidación o al resultado final y congela únicamente los clones y nodos construidos por el servicio. Las referencias externas originales nunca se congelan ni se mutan. La salida pública conserva la misma forma y valores, pero queda completamente inmutable para sus consumidores.

## Acceso a datos implementado

`dataService` importa directamente `datos.json`, llena un caché al cargar el módulo y expone getters síncronos. Solo `localDataProvider.js` consume esos getters. `sellThroughRepository.js` es el único consumidor del Provider y el Application Service usa únicamente el Repository para obtener sus entradas.

El aislamiento aplica a buckets EOL, tabla de fases, países, períodos, umbral de merma, semanas por período, nota institucional, muestras, Maestro, Inventario y configuración de sesión. Los valores continúan siendo locales y síncronos; Repository y Provider no agregan persistencia ni integración remota.

## Arquitectura objetivo aprobada

```text
UI -> Application Service -> Domain Service -> Repository -> Provider -> Fuente
```

Principios asociados:

- una responsabilidad principal por archivo o módulo;
- separar UI, lógica de negocio, configuración y acceso a datos;
- impedir acceso directo desde componentes React a JSON, Excel, Dataverse o Business Central;
- hacer que todo acceso a fuentes pase progresivamente por Repository y Provider;
- mover constantes de negocio modificables al Configuration Center;
- preservar el comportamiento durante refactorizaciones incrementales y reversibles.

## Brechas entre estado actual y objetivo

| Capa objetivo | Estado actual |
| --- | --- |
| UI | Implementada en `App.jsx`; conserva estado, informe y exportaciones además de presentación. |
| Application Service | Implementado para el procesamiento síncrono principal; consume únicamente Repository para acceder a datos y orquesta Portfolio Analysis, Distribution y Pareto. |
| Domain Service | Implementado parcialmente para parsers, ensamblaje, Inventory Engine, EOL Engine y Portfolio Analysis mediante módulos puros. |
| Repository | Primera versión implementada con seis contratos estables y Provider inyectable. |
| Provider | Local Provider implementado; DataverseProvider no existe. |
| Fuente | JSON local, texto en estado React y configuración de sesión. |
| Configuration Center | Foundation implementada solo para PAR-001/PAR-002/PAR-003; sin UI, persistencia o migración del resto. |

La existencia de estas brechas no autoriza una refactorización fuera del alcance de un prompt futuro.

## Estado, persistencia e integraciones

- Estado: hooks `useState` y resultados derivados en memoria.
- Persistencia: ninguna.
- Red de datos: ninguna integración implementada.
- Dataverse: solo intención futura documentada.
- Business Central: mencionado únicamente como fuente que la UI no debe consultar directamente.
- Exportaciones: generadas localmente en el navegador mediante Blob, `xlsx` y `window.print()`.

## Build y ejecución

- `npm run dev`: Vite en puerto `5173`, con apertura automática del navegador.
- `npm test -- --run`: ejecuta una vez las pruebas de caracterización con Vitest.
- `npm run build`: genera `dist`, sin sourcemaps.
- `npm run preview`: previsualiza el build.
- Advertencia de tamaño de chunk configurada en `1500` kB.

## Riesgos arquitectónicos conocidos

- `App.jsx` sigue siendo un archivo amplio de 2740 líneas por UI, informe y exportaciones.
- Inventory Engine, EOL Engine, parsers y ensamblaje tienen caracterización, pero la UI renderizada, Pareto, Distribution, Executive Report y las exportaciones aún no tienen pruebas.
- Los puentes desde `App` todavía dependen del orden de hooks y del botón de cálculo, aunque el pipeline extraído puede invocarse sin React.
- La búsqueda parcial de columnas acepta subcadenas y puede asociar un alias con un encabezado no deseado; este comportamiento se conserva como riesgo de compatibilidad.
- Las reglas y umbrales están repartidos entre JSON, estado React y constantes/literales del componente.
- Repository y Local Provider conservan contratos síncronos; una fuente remota requerirá diseñar la asincronía y sus estados de UI mediante un cambio aprobado.
- Repository valida la interfaz de cualquier Provider inyectado; la validación de formas de retorno está implementada actualmente en Local Provider y deberá existir también en cada futuro Provider.
- Configuration Service contiene solo tres defaults no editables; no expone overrides y Repository únicamente valida su disponibilidad interna. Los consumidores visibles siguen pendientes de una migración funcionalmente protegida.
- Tailwind depende de un CDN en tiempo de ejecución.
- No hay script de lint ni pruebas automatizadas con un renderer DOM o navegador declaradas en `package.json`.
