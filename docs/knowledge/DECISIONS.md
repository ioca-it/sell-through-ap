# Decisiones vigentes

## D-001 — Desarrollo AI-First

- Estado: aprobado.
- Fuente: `AGENTS.md`, Prompt 005 y Prompt 006.
- Decisión: la documentación es requisito previo y parte del cambio; toda IA debe revisar contexto, acuerdos y Git antes de modificar archivos.
- Consecuencia: un cambio de código sin impacto, validación y actualización documental queda incompleto.

## D-002 — Knowledge Base como consolidado oficial

- Estado: aprobado por Prompt 009.5.
- Decisión: `docs/knowledge/` consolida arquitectura, reglas, fuentes, parámetros, decisiones, roadmap y flujo AI-First.
- Consecuencia: debe mantenerse sincronizada con el código y solo puede contener información implementada o aprobada, debidamente diferenciada.

## D-003 — Arquitectura modular objetivo

- Estado: aprobada, implementación pendiente/parcial.
- Fuente: `AGENTS.md` y roadmap Foundation 1.0.
- Decisión: `UI -> Application Service -> Domain Service -> Repository -> Provider -> Fuente`.
- Consecuencia: componentes React no deben incorporar nuevo acceso directo a fuentes y la refactorización debe ser progresiva.

## D-004 — Aislamiento inicial de la configuración local

- Estado: implementado y evolucionado por Prompt 017.
- Fuente: `src/services/dataService.js` y `src/providers/local/localDataProvider.js`.
- Decisión observable: `dataService` encapsula el JSON local y solo es consumido por Local Provider; App y Application Service acceden mediante Repository.
- Consecuencia: ni el JSON ni `dataService` son dependencias directas de UI, aplicación o dominio.

## D-005 — Origen desde Inventario

- Estado: implementado.
- Fuente: `src/App.jsx` y `src/data/datos.json`.
- Decisión: el origen del SKU proviene del Inventario del Cliente; si está vacío o no es `CHINA`, se usa USA, y el vacío genera alerta.
- Consecuencia: el origen selecciona costo y lead time.

## D-006 — Inventario de Seguridad IOCA V1

- Estado: implementado.
- Decisión: con ventas, calcular cobertura mediante velocidad de venta, safety stock y lead time; sin ventas, usar el valor del cliente.
- Consecuencia: quiebres y reposición se comparan contra el valor IOCA, no contra el del cliente, salvo SKU sin maestro.

## D-007 — Reposición restringida a activos

- Estado: implementado.
- Decisión: solo los SKU `ACTIVO` reciben reposición sugerida; los EOL reciben acciones de rebalanceo, quiebre o liquidación según bucket.

## D-008 — Configuración institucional temporal

- Estado: implementado como solución temporal.
- Fuente: `docs/DATA_SOURCES.md` y `src/data/datos.json`.
- Decisión: mantener parámetros institucionales en JSON local hasta una migración aprobada.
- Consecuencia: cualquier constante modificable debe migrar progresivamente al Configuration Center, sin cambio masivo no aprobado.

## D-009 — Dataverse sin esquema asumido

- Estado: aprobado.
- Fuente: `docs/DATA_SOURCES.md`.
- Decisión: Dataverse es una fuente futura principal, pero no hay entidades, columnas ni mapeos aprobados.
- Consecuencia: los nombres incluidos en comentarios de código son ilustrativos y no autorizan una implementación.

## D-010 — Cambios incrementales y reversibles

- Estado: aprobado.
- Decisión: preservar comportamiento, validar build/diff/status y usar Git como mecanismo de reversión.
- Consecuencia: no crear commits, ramas ni push sin autorización del prompt o del usuario.

## D-011 — Separación de NEXUS

- Estado: aprobado.
- Fuente: `docs/PROJECT_CONTEXT.md`.
- Decisión: sell-through-ap no debe mezclarse con NEXUS.

## D-012 — Vitest para caracterización de utilidades

- Estado: implementado por Prompt 012.
- Decisión: usar Vitest `3.2.7` en entorno Node para congelar los contratos de las ocho utilidades extraídas, manteniendo Vite 5 sin cambios.
- Consecuencia: `npm test -- --run` forma parte de la validación obligatoria; la suite de utilidades por sí sola no acredita motores, JSX ni flujos integrados.

## D-013 — Arnés temporal para caracterizar motores en App.jsx

- Estado: implementado por Prompt 013.
- Decisión: invocar el handler real `procesar` mediante un arnés exclusivo de test que simula estado React, sin exportar, copiar o extraer reglas de producción.
- Consecuencia: los datasets y resultados esperados quedan disponibles para validar la extracción futura; el arnés depende temporalmente del orden de hooks y del botón de cálculo hasta existir un contrato de motor independiente.

## D-014 — Inventory Engine y EOL Engine como dominio puro

- Estado: implementado por Prompt 014.
- Decisión: ubicar las reglas caracterizadas en `src/domain/inventory/` y `src/domain/eol/`, con entradas explícitas y sin acceso a fuentes o UI.
- Consecuencia: `App.jsx` permanece como orquestador temporal y entrega configuración/tablas obtenidas por `dataService`; los motores quedan preparados para servicios de aplicación, Repository y Provider futuros sin asumir esquema Dataverse.
- Validación: las 40 pruebas de Prompt 013 consumen directamente los nuevos contratos y mantienen un puente del flujo real desde `App`.

## D-015 — Arnés temporal para parsers y ensamblaje

- Estado: implementado por Prompt 015.
- Decisión: caracterizar el handler real `procesar` con datasets controlados y un arnés exclusivo de test, sin exportar ni copiar parsers o fórmulas desde `App.jsx`.
- Consecuencia: 28 casos protegen separadores, detección de columnas, Maestro, Inventario, precedencias, defaults y forma de `record` antes de extraer Parser o Application Service.
- Riesgo aceptado temporalmente: el arnés depende del orden de hooks y del botón de cálculo; la coincidencia parcial por subcadena conserva posibles colisiones de encabezados.

## D-016 — Application Service y parsers como contratos separados

- Estado: implementado por Prompt 016.
- Decisión: ubicar parsing de Maestro/Inventario y ensamblaje de `record` en `src/domain/parser/`, y coordinar el procesamiento completo desde `src/application/sellThroughApplicationService.js`.
- Contrato vigente: desde Prompt 017 el servicio recibe un Repository, obtiene por él textos, configuración y parámetros, devuelve `{ resultados, error }` y no depende de React, JSX, Provider, `dataService` o una fuente física.
- Consecuencia: `App.jsx` deja de interpretar entradas, cruzar registros y construir agregaciones/Pareto; conserva estado, navegación, presentación, informe y exportaciones.
- Validación: las 117 pruebas existentes pasan sin modificar casos y mantienen múltiples recorridos puente desde el handler real de `App`.

## D-017 — Claude Code como auditor técnico independiente

- Estado: aprobado por Prompt Claude-001.
- Fuente: `docs/knowledge/CLAUDE_AUDITOR_PROFILE.md`.
- Decisión: Claude Code actúa como auditor técnico permanente de arquitectura, mantenibilidad, riesgos, documentación y preparación para Dataverse; no modifica código, no aplica refactorizaciones, no crea commits ni push salvo autorización explícita posterior. Codex sigue siendo el único implementador principal.
- Consecuencia: toda auditoría de Claude debe clasificar hallazgos como CRÍTICO, IMPORTANTE, MENOR, MEJORA OPCIONAL o CAMBIO FUNCIONAL y seguir el formato de nueve secciones definido en el perfil.

## D-018 — Repository Layer y Local Provider como frontera de fuentes

- Estado: implementado por Prompt 017.
- Decisión: `sellThroughRepository.js` es el único consumidor de Provider y expone contratos estables para Maestro, Inventario, parámetros, configuración, catálogos y datos de ejemplo. `localDataProvider.js` es el único consumidor de `dataService` y adapta las fuentes locales sin ejecutar reglas.
- Contrato: Application Service recibe únicamente Repository para acceso a datos; App obtiene configuración institucional y muestras por la misma frontera.
- Evolución: Repository admite un Provider compatible inyectado, de modo que un futuro DataverseProvider no requiera modificar Repository, Application Service o Domain.
- Consecuencia: se preserva el comportamiento síncrono y local actual; asincronía, autenticación y esquema Dataverse permanecen pendientes de aprobación.
- Validación: las 117 pruebas existentes permanecen aprobadas sin cambios funcionales.

## D-019 — Nulabilidad parcial y configuración obligatoria para procesar

- Estado: aprobado e implementado por Prompt 018.
- Decisión: `getConfiguracion()` puede devolver `null` en un Repository parcial usado solo para catálogos o datos de ejemplo. `processSellThrough(repository)` exige un objeto con `periodoAnalizado`, `semanasPersonalizadas`, `safetyStockSemanas`, `leadTimeUSA` y `leadTimeCHINA`.
- Error contractual: configuración ausente, de tipo inválido o incompleta devuelve `{ resultados: null, error }` con mensaje descriptivo y nunca debe producir un `TypeError`.
- Frontera Provider: Repository valida al construirse que existan como funciones `readMaestro`, `readInventario`, `readParametros`, `readConfiguracion`, `readCatalogos` y `readDatosEjemplo`.
- Frontera local: Local Provider valida strings de Maestro/Inventario y formas mínimas de parámetros, configuración, catálogos y ejemplos, sin definir esquema Dataverse.
- Consecuencia: los casos válidos conservan fórmulas, defaults y resultados; un Provider inválido falla en el borde con procedencia trazable.
- Validación: 34 pruebas nuevas y 151 pruebas totales aprobadas.

## D-020 — Business Parameters Catalog como fuente oficial

- Estado: aprobado por Prompt 019.
- Decisión: `docs/knowledge/BUSINESS_PARAMETERS.md` es la fuente oficial para identificar, clasificar y trazar los parámetros del futuro Configuration Center.
- Alcance: registra parámetros configurables, constantes técnicas, textos de UI, reglas fijas y valores derivados provenientes de JSON local, estado React y hardcodes, sin modificar código ni comportamiento.
- Dataverse: ninguna entidad, columna, relación, permiso o mapeo queda aprobado; cada fila mantiene `Pendiente de definición` hasta una decisión posterior.
- Consecuencia: toda implementación futura deberá partir del catálogo, mantener Repository/Provider como frontera y unificar duplicidades antes de habilitar edición, especialmente buckets EOL, gate de fases y fallback de semanas.
- Reversibilidad: Prompt 019 es documental; no cambia reglas, defaults, fuentes físicas ni dependencias.

## D-021 — Configuration Center Foundation con tres pilotos

- Estado: aprobado e implementado por Prompt 020.
- Pilotos: exclusivamente PAR-001 (`app.version`), PAR-002 (`app.name`) y PAR-003 (`dataset.version`).
- Patrón: `Repository -> configurationService -> configurationSchema -> configurationDefaults`.
- Decisión: centralizar sus defaults y metadatos en una capa síncrona independiente de React/UI; Repository valida internamente las tres claves sin modificar sus seis métodos públicos o sus retornos.
- Compatibilidad: no se modifica `App.jsx` ni `datos.json`; sus literales actuales permanecen temporalmente para preservar comportamiento mientras el nuevo servicio no se expone a UI.
- Límites: no existe edición, override, persistencia, Provider nuevo, DataverseProvider, asincronía, autenticación ni esquema Dataverse.
- Criterio de evolución: cada parámetro adicional requiere ID aprobado en `BUSINESS_PARAMETERS.md`, análisis de consumidores, default/schema explícitos, integración por Repository y regresión antes de retirar su fuente anterior.
- Reversibilidad: retirar la validación interna de Repository y eliminar los tres módulos de configuración; no hay datos persistidos que recuperar.

## D-022 — Configuration Schema como Single Source of Truth

- Estado: aprobado e implementado por Prompt 021.
- Fuente: auditoría `logs/Claude003-ConfigurationCenterAudit.log` y Prompt 021.
- Decisión: `CONFIGURATION_SCHEMA` es el único registro autorizado de IDs, keys y metadatos de configuración migrada; Repository no puede mantener enumeraciones paralelas.
- Validación: el schema debe tener IDs y keys únicos, ocho campos contractuales por definición, metadatos textuales no vacíos, `editable` booleano y defaults compatibles con el tipo declarado.
- Integración: `configurationService` valida una vez al cargar, deriva automáticamente las claves y expone a Repository solo el resultado de integridad; los defaults permanecen almacenados una vez en `configurationDefaults.js` y referenciados desde el schema.
- Compatibilidad: se conservan PAR-001/PAR-002/PAR-003, sus valores, el comportamiento síncrono y los seis métodos públicos de Repository; no se crean parámetros, overrides, UI, Provider, persistencia ni esquema Dataverse.
- Consecuencia: cualquier duplicación futura de ID/key o definición inconsistente falla de forma temprana y descriptiva, antes de construir Repository.
- Reversibilidad: retirar la validación y restablecer la comprobación previa de Repository; no existen datos persistidos que migrar o recuperar.

## D-023 — Ownership de inmutabilidad en Portfolio Analysis

- Estado: aprobado e implementado por Prompt 023.
- Fuente: auditoría `logs/Claude004-PortfolioAnalysisAudit.log` y Prompt 023.
- Decisión: `PortfolioAnalysisService` nunca congela referencias recibidas desde Application Service; clona sus estructuras externas antes de incorporarlas y congela únicamente objetos propios.
- Contrato: la consolidación y el resultado final son completamente inmutables; los objetos originales del llamador conservan su mutabilidad y no son alterados.
- Compatibilidad: se preservan forma, valores, ordenamientos, reglas, fórmulas, contrato público de `processSellThrough` y las 154 pruebas existentes.
- Consecuencia: Executive Report y Recommendation Engine podrán recibir resultados sin riesgo de que Portfolio Analysis congele referencias compartidas fuera de su salida.
- Reversibilidad: restaurar el congelador anterior y retirar los clones; no existen datos persistidos ni contratos externos que recuperar.

## D-024 — Latest Product record por SKU, origen y comprador

- Estado: aprobado e implementado localmente por Phase1-090, actualizado por
  Phase1-102; no desplegado.
- Decisión: después de los filtros Product vigentes, seleccionar
  `MAX(crbbe_validodesde)` independientemente por
  `SKU + ORIGIN + BUYER COMPANY` antes
  de detectar conflictos PRICE/atributos y consolidar por SKU.
- Empate: conservar todas las filas con el máximo exacto; valores incompatibles
  mantienen `PRODUCT_MASTER_CONFLICT` y no existe segunda precedencia.
- Origen/comprador: USA y CHINA se resuelven por separado; los compradores se
  resuelven individualmente y luego conservan la comparación cross-buyer sin
  preferencia IOCA/SAND.
- Fecha pública: `Product.creationDate` se origina exclusivamente en
  `crbbe_validodesde` y es su mayor valor entre las filas vigentes del SKU;
  ausencia o invalidez queda en `null`, sin fallback a `createdon`. Producto
  Nuevo conserva `<90 días` sobre esa fecha.
- Reversibilidad: retirar la selección temporal y restaurar `creationDate` como
  atributo conflictivo; no existe migración ni estado externo que recuperar.

## D-025 — Métricas y presentación final consolidadas

- Estado: aprobado e implementado localmente por Phase1-094; no desplegado.
- Valorización: precio cero es real y precio ausente permanece `null` por SKU;
  los agregados suman importes calculables y no mezclan ni suman segmentos
  superpuestos. `% Valor` usa exclusivamente el total válido del bloque.
- Rotación: la única métrica visible y exportable es `Porcentaje de Rotación =
  Ventas / Inventario Inicial × 100`; denominador cero produce `null`.
- EOL: `SKU con EOL definido` y `EOL vencido/descontinuado` son conceptos
  distintos. EOL conserva prioridad absoluta sobre reposición; la recomendación
  ejecutiva combina bucket y Pareto sin habilitar compra normal.
- Explicabilidad: UI, Informe, Excel y CSV derivan definiciones y fórmulas de
  `metricDefinitions.js`; los cálculos continúan en Domain/Application.
- Media segura: solo URLs absolutas `http:`/`https:` habilitan miniatura,
  lightbox o hyperlink. Excel usa hyperlinks porque SheetJS CE 0.20.3 no ofrece
  inserción pública de imágenes.
- Reversibilidad: retirar componentes/helpers y restaurar etiquetas/consumidores
  anteriores; no hay migración, persistencia o estado externo que recuperar.

## D-026 — Tier de un solo dataset, ajuste de pack posterior al Pedido Base y subconjunto EOL de descuento

- Estado: aprobado e implementado localmente por Phase1-105; no desplegado.
- Causa raíz confirmada: la divergencia previa UI 38 SKU / Excel 44 SKU con las
  mismas 442 unidades venía de que Tier Inventario excluye seis filas con
  `invFinal=0` mientras el Resumen Excel usaba `recs.length`; esas seis filas
  aportaban cero unidades, por lo que las unidades coincidían y el conteo de
  SKU no.
- Tier: los seis KPI superiores de Distribución por Tier (SKU y Unidades de
  Inventario Actual del Cliente, Ventas del Cliente y Reposición Sugerida) se
  derivan exclusivamente de `distribucionTier.{inventario,ventas,reposicion}`,
  el mismo dataset que alimenta cada bloque inferior; Excel reutiliza ese mismo
  dataset en el Resumen en vez de `totales.totalSKUs`/`totales.totalUnidades`.
- Pack: Product Master incorpora `aplicaMasterPack`, `cantidadMasterPack`,
  `aplicaInnerPack` y `cantidadInnerPack` sin usarlos en Brands. El motor
  conserva íntegra la fórmula histórica de reposición como
  `reposicionSugeridaBase` y aplica después, con precedencia absoluta Master
  válido → Inner válido → sin ajuste, `Pedido Final = CEIL(Base ÷ Pack) × Pack`;
  el resultado nunca baja del Base, nunca es `NaN`/`Infinity`/negativo y un SKU
  sin pack válido conserva el Base. `reposicionSugerida` sigue siendo el valor
  operativo; Base, tipo y cantidad de ajuste quedan expuestos para
  trazabilidad.
- EOL: la tabla "SKU Clasificados EOL que aplican regla de descuento" consume
  el subconjunto canónico `eolConDescuentoAplicable` (`estado=EOL`,
  `invFinal>0`, `descPct>0`) derivado de `eolTodos`; el KPI EOL general
  continúa usando `eolTodos` sin reducirse a este subconjunto. No se creó
  ningún porcentaje o umbral de descuento nuevo.
- Exportaciones: Excel y CSV reutilizan los datasets canónicos anteriores
  (`distribucionTier`, `eolConDescuentoAplicable`,
  `resultados.productosReposicionSugerida`) en vez de recalcular sus propios
  universos, y agregan ocho columnas de trazabilidad de pack sin romper
  columnas existentes ni incrustar imágenes.
- Configuration Center: `docs/knowledge/CONFIGURATION_CENTER.md` y
  `docs/prompts/Phase1-100-AuditExistingConfigurationParameters.md` permanecen
  sin modificar; Phase1-101 no se implementó.
- Reversibilidad: restaurar los KPI Tier a `totales.totalSKUs`/`totalUnidades`,
  retirar `ajustarReposicionPorPack` y el subconjunto `eolConDescuentoAplicable`,
  y revertir las columnas de pack en Excel/CSV; no existe migración de datos ni
  estado externo que recuperar.

## D-027 — Reconciliación Executive Dashboard/Inventario Actual y umbral mínimo EOL de descuento

- Estado: aprobado e implementado localmente por Phase1-107; no desplegado.
- Causa raíz confirmada: Phase1-105 (D-026) reconcilió el Resumen Excel y los
  seis KPI superiores de Distribución por Tier contra `distribucionTier`, pero
  `ExecutiveReportService.buildExecutiveReport` seguía derivando
  `executiveSummary.totalSKUs`/`totalUnidades`/`valorTotalInventario` de
  `totales.*` (universo completo, `44` registros); eso dejaba el bloque
  superior del Executive Dashboard mostrando `44` mientras Resumen Ejecutivo ya
  mostraba `38` (las mismas seis filas con `Inventario Final = 0` de D-026).
  Unidades (`442`) y valor (`$12.171`) coincidían por casualidad porque esas
  seis filas aportan cero unidades y cero valor.
- Inventario Actual: dataset canónico único = `distribucionTier.inventario`
  (`Inventario Final > 0`); `ExecutiveReportService` ahora deriva sus tres
  campos de ese mismo dataset en vez de `totales.*`. Executive Dashboard,
  Resumen Ejecutivo, Distribución por Tier, Informe Ejecutivo, Excel y CSV
  quedan reconciliados sobre el mismo universo, sin recalcular cada uno el
  suyo. `totales.totalSKUs`/`totalUnidades`/`valorTotalInventario` conservan su
  significado distinto (todos los registros analizados) donde ya se usaban,
  sin exhibirse junto a Inventario Actual bajo una etiqueta ambigua.
- EOL: la tabla "SKU Clasificados EOL que aplican regla de descuento" exige
  ahora `Inventario Final ≥ EOL_DISCOUNT_MIN_INVENTORY` (constante nueva en
  `eolEngine.js`, default vigente `12` unidades) además de `descPct > 0`; antes
  bastaba `Inventario Final > 0`. El KPI EOL general (`eolTodos`) no se reduce
  por este cambio; un SKU EOL bajo el umbral permanece clasificado como EOL
  pero sale de esta tabla operativa. `EOL_DISCOUNT_MIN_INVENTORY` es distinto
  del `inventarioMinimoReconocido` de Fase 4 (reparto de aportes IOCA/Retail);
  ambos valen `12` hoy por coincidencia de negocio, no por ser la misma regla.
- Parámetro futuro: `EOL_DISCOUNT_MIN_INVENTORY` queda documentado en
  `metricDefinitions.js` como parámetro de negocio con default vigente `12` y
  candidato futuro a Configuration Center; esta fase no implementa edición ni
  toca `CONFIGURATION_CENTER.md`/`Phase1-100-AuditExistingConfigurationParameters.md`.
- Exportaciones: Excel y CSV no recalculan el umbral ni el universo de
  Inventario Actual; ambos ya consumían `eolConDescuentoAplicable` y
  `distribucionTier.inventario` directamente (D-026), por lo que el cambio de
  filtro en Domain se propaga sin tocar código de exportación.
- Reversibilidad: restaurar `executiveSummary.*` a `totales.*` y el filtro de
  `eolConDescuentoAplicable` a `invFinal>0`; retirar `EOL_DISCOUNT_MIN_INVENTORY`
  y su entrada en `metricDefinitions.js`. No existe migración de datos ni
  estado externo que recuperar.

## Asuntos observados sin decisión de cambio

- La fecha de corte no controla el cálculo EOL.
- `App.jsx` todavía concentra estado, UI, informe y exportaciones, pero ya no parsing, ensamblaje o agregaciones del procesamiento.
- El acceso remoto requerirá asincronía.
- Las pruebas automatizadas cubren utilidades, Inventory/EOL, parsers,
  ensamblaje, Pareto/Distribution, DTO ejecutivo, árboles de UI y exportaciones;
  la validación visual real en navegador sigue siendo externa.

Estos puntos están documentados como hechos o riesgos; no deben corregirse sin alcance aprobado.
