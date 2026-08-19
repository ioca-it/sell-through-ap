# Phase1-098 — Align EOL Definitions With Real Runtime Semantics

## Objetivo

Alinear exclusivamente la terminología, definiciones y valores no calculables
de la sección EOL con el runtime vigente, sin modificar clasificación, fechas,
días, buckets, fases de descuento, acciones, filtros ni cálculos.

## Implementación autorizada

- `SKU clasificados EOL` sustituye a `SKU con EOL definido` en Dashboard,
  Resumen Ejecutivo, Informe y resumen Excel.
- El universo EOL continúa siendo `resultados.eolTodos`: registros clasificados
  como EOL por Product Master, con o sin Fecha EOL válida.
- Fecha EOL y Días EOL ausentes se presentan como `N/D`; Fase EOL no calculable
  se presenta como `Sin fecha EOL`.
- `metricDefinitions.js` distingue SKU EOL, Fecha EOL, Días EOL y Fase EOL, y
  alinea Recomendación EOL, Porcentaje de Rotación y Valor Inventario con las
  fórmulas, fuentes e interpretaciones vigentes.
- La leyenda EOL reutiliza esas siete definiciones compartidas en UI, Excel y
  CSV complementario.

## Contratos preservados

- `estado === 'EOL'` continúa definiendo el universo total EOL.
- Los buckets permanecen VENCIDO (`Días EOL <= 0`), CRÍTICO (1–27), PRÓXIMO
  (28–83) y PLANIFICADO (84+), sin cambiar EOL Engine ni sus umbrales.
- Recomendación EOL conserva la matriz bucket/Pareto vigente y siempre bloquea
  reposición normal.
- Porcentaje de Rotación conserva Ventas / Inventario Inicial × 100 e
  Inventario Inicial 0 como no calculable.
- Valor Inventario conserva selección por origen (`USA -> priceUSA`,
  `CHINA -> priceChina`), precio cero real y precio ausente como `null`/N/D.
- KPI, unidades, valor y tabla continúan reconciliados sobre `eolTodos`.

## Archivos y fronteras

- Presentación: `src/App.jsx`, `src/presentation/metricDefinitions.js`.
- Pruebas: `src/__tests__/ap01DashboardRevision.test.js`,
  `src/__tests__/astridJesusFunctionalRules.test.js`,
  `src/components/__tests__/DefinitionLegend.test.jsx`.
- Documentación: este prompt, `ARCHITECTURE_STATE.md`, `CHANGELOG.md` y
  `ROADMAP.md`.
- Evidencia local excluida de Git:
  `logs/Phase1-098-AlignEolDefinitionsWithRuntime.log`.

No cambian Domain, Application Service, Repository, Provider, Product Master,
Dataverse, reposición, Pareto, fuentes, backend o infraestructura. No se
actualizan `BUSINESS_RULES.md` ni `DECISIONS.md` porque no cambia ninguna regla.

## Riesgos y reversión

El riesgo se limita a regresión de copy o presentación de valores ausentes. La
reversión consiste en retirar únicamente el diff de Phase1-098; no existe
migración de datos, configuración o fuente.

## Validación

Ejecutar una sola vez al cierre: `npm test -- --run`, `npm run build`,
`git diff --check` y `git status --short`. Backend no aplica por ausencia de
cambios en `server/`. No crear commit, push, rama, deploy ni acciones externas.
