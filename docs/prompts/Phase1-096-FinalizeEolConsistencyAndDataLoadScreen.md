# Phase1-096 — Finalize EOL Consistency and Simplify Data Load Screen

## Objetivo

Aplicar exclusivamente los ajustes de presentación aprobados para reconciliar
el KPI y detalle EOL, retirar la entrada manual obsoleta de Product Master y
aclarar la Fecha base EOL, sin modificar Product/Dataverse ni reglas de negocio.

## Implementación autorizada

- La sección principal se denomina `SKUs con EOL definido` y consume
  `resultados.eolTodos`, el mismo universo usado por `skuEOL`, `unidEOL` y
  `valorEOL`.
- `FASE EOL` traduce los buckets vigentes a `VENCIDO`, `CRÍTICO`, `PRÓXIMO` y
  `PLANIFICADO`; el orden visual prioriza vencimiento y cercanía. No recalcula
  días, buckets, descuentos o acciones.
- Carga de Información conserva únicamente el `textarea` de Inventario del
  Cliente, ahora numerado como `1` y centrado. Product Master sigue atravesando
  Application Service, Repository y Provider; la fuente local técnica no se
  elimina.
- La leyenda de origen identifica Inventario del Cliente y Product Master
  Dataverse sin referencias a pegado manual.
- El encabezado presenta `Fecha base EOL`, mantiene `primerDiaMes()` y explica
  su uso sin confundirla con `fechaCorte`.
- `DefinitionLegend` reutiliza una definición compacta de EOL definido y las
  cuatro fases.

## Archivos y fronteras

- Presentación: `src/App.jsx`, `src/presentation/metricDefinitions.js`.
- Pruebas afectadas: `src/__tests__/ap01DashboardRevision.test.js`,
  `src/__tests__/customerMasterUi.test.js`.
- Documentación: este prompt, `ARCHITECTURE_STATE.md`, `ROADMAP.md` y
  `CHANGELOG.md`.
- Evidencia local excluida de Git:
  `logs/Phase1-096-FinalizeEolConsistencyAndDataLoadScreen.log`.

## Reglas, fuentes y riesgos preservados

No cambian `primerDiaMes`, `fechaCorte`, timezone, EOL Engine, buckets,
descuentos, recomendaciones, reposición, precios, filtros Product, selección
`MAX(createdon)`, mappings, Dataverse, providers, repositories, contratos,
timeouts, backend o infraestructura. La reversión consiste en retirar solo el
diff de Phase1-096.

## Validación

Ejecutar una sola vez al cierre: `npm test -- --run`, `npm run build`,
`git diff --check` y `git status --short`. Backend no aplica salvo aparición
inesperada de cambios en `server/`. No crear commit, push, rama o deploy.
