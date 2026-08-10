# AP01 — Revisión Dashboard

## Objetivo

Implementar exclusivamente la revisión visual y funcional AP01 del Dashboard sobre la rama local `review/ap01`, preservando reglas, fórmulas, fuentes y contratos no afectados.

## Base y restricciones

- Base protegida: tag `original-before-ap01`.
- Ejecución exclusivamente local.
- Sin despliegue a Vercel, commit, push, ramas nuevas ni dependencias nuevas.
- Repository, Provider y Configuration Center permanecen sin cambios.

## Archivos previstos

- Presentación: `src/App.jsx`.
- DTO y agregados mínimos: `src/domain/report/ExecutiveReportService.js` y `src/domain/portfolio/PortfolioAnalysisService.js`.
- Pruebas: `src/__tests__/ap01DashboardRevision.test.js` y `src/__tests__/astridJesusFunctionalRules.test.js`.
- Estado: `docs/knowledge/ARCHITECTURE_STATE.md`.
- Evidencia local: `logs/AP01-DashboardRevision.log`.

## Cambios aprobados

- Consolidar SKU, unidades y valores aplicables en Executive Summary.
- Representar `SKU EOL` y `SKU Sin Maestro` con los valores vigentes del dominio.
- Mover Merma, Ventas Pareto A y Reposición al Executive Summary; retirar Valor EOL de KPIs Ejecutivos.
- Retirar las secciones visuales independientes Valorización del Inventario y Totales.
- Mostrar cantidad de SKU y unidades en Mix Balanceado.
- Mostrar pares SKU/unidades en los indicadores del Resumen Dashboard cuando el DTO los proporciona.
- Agregar Productos de Reposición Sugerida antes de SKUs EOL, limitado a registros con `reposicionSugerida > 0`.
- Renombrar exclusivamente el título de la sección EOL a `SKUs EOL`.
- Presentar importes monetarios sin decimales, redondeados al entero más cercano mediante el formatter común, sin modificar su valor interno ni los cálculos que los producen.

## Reglas y fuentes preservadas

- EOL, Sin Maestro, Mix GOOD/BETTER/BEST/EOL, Pareto, merma y reposición conservan su lógica vigente.
- Los valores monetarios y cantidades proceden de Portfolio Analysis y Executive Report.
- La UI no recalcula reposición; únicamente selecciona registros cuyo resultado de dominio es positivo.
- Porcentajes, cantidades de SKU y unidades conservan su semántica vigente sin decimales.
- No se eliminan campos ni cálculos utilizados por informes, exportaciones u otros consumidores.

## Parámetros

AP01 no agrega ni modifica parámetros de negocio o Configuration Center.

## Riesgos y mitigación

- Riesgo de divergencia entre DTO y presentación: cubierto con pruebas de contrato y renderizado.
- Riesgo de incluir reposiciones nulas o negativas: cubierto con una prueba de filtrado positivo.
- Riesgo responsive: se reutilizan grids, contenedores `overflow-x-auto` y estilos existentes.

## Validación obligatoria

- `npm test -- --run`
- `npm run build`
- `git diff --check`
- `git status --short`

## Reversión

Revertir únicamente los cambios locales AP01 listados en este documento; la base `original-before-ap01` no se modifica.
