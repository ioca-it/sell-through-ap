# Prompt Astrid 2026-08-11 — Cambios confirmados

## Objetivo

Aplicar exclusivamente los acuerdos confirmados de la llamada con Astrid Paschalides del 2026-08-11, sin implementar puntos pendientes ni avanzar Entra, Render, MSAL, Azure o conexiones Dataverse reales.

## Alcance funcional aprobado

- Sustituir Por Vencer por Sin ventas en Dashboard y Resumen Ejecutivo usando la lógica existente `Ventas = 0`.
- Mostrar solo Quiebres Activos y excluir EOL de alertas, tablas y conteos de bajo inventario.
- Sustituir textos Pareto por Vitales/Complementarios y usar A verde, B azul, C rojo sin cambiar su lógica.
- Totalizar la tabla de Reposición Sugerida con SKU incluidos y unidades ya calculadas.
- Valorizar tránsito por SKU y total con `Compra × costo aplicado vigente`, sin decimales visibles.
- Incorporar `creationDate` al Maestro Producto y clasificar Producto Nuevo con diferencia estrictamente menor a 90 días respecto de la fecha oficial de procesamiento.
- Contar Nuevos no presentes mediante cruce Maestro–Inventario, sin calcularles reposición.
- Extender Customer a `{ customerCode, customerName, country, customerType }`, con fallback vacío y sin asumir mapping físico.
- Explicar en UI Merma, Ventas Pareto A, Reposición y Umbral de Merma únicamente desde reglas implementadas.

## Arquitectura y fuentes

- Flujo conservado: `UI -> Application Service -> Domain Service -> Repository -> Provider -> Fuente`.
- Producto Nuevo y el cruce de ausentes pertenecen a dominio/aplicación; React solo presenta el DTO.
- Sin ventas reutiliza `productosSinRotacion`; reposición consume `reposicionSugerida`; tránsito usa `costo`, todos ya existentes.
- `creationDate` proviene por ahora del Maestro local mediante el encabezado homónimo.
- `customerType` admite vacío. El nombre lógico y mapping Dataverse real quedan pendientes.

## Parámetros y reglas preservadas

- No se agregan parámetros de negocio ni se cambian fórmulas de Inventory/EOL Engine, Pareto o Reposición.
- Se conservan los campos internos y la clasificación temporal POR VENCER.
- El formato monetario común redondea únicamente la presentación a cero decimales.

## Archivos de producción

- `src/App.jsx`
- `src/application/sellThroughApplicationService.js`
- `src/application/customerMasterService.js`
- `src/domain/customer/customer.js`
- `src/domain/parser/masterParser.js`
- `src/domain/product/newProduct.js`
- `src/domain/portfolio/PortfolioAnalysisService.js`
- `src/domain/report/ExecutiveReportService.js`

## Riesgos y controles

- Divergencia UI/dominio: los totales monetarios y de reposición se calculan en Portfolio Analysis y se prueban mediante el pipeline real.
- Inclusión accidental de EOL: se filtra ACTIVO en la frontera de alertas operativas sin modificar el Engine.
- Fechas inválidas o límite inclusivo: pruebas explícitas en 89, 90, más de 90 y valores vacíos/inválidos.
- Mapping Customer no confirmado: fallback vacío y ausencia de cambios en `server/` o gateway Dataverse.

## Puntos no implementados

- Significado/regla de Sin origen.
- Redefinición de buckets EOL o lógica de Fases EOL.
- Reposición Sugerida para productos nuevos.
- Fórmula basada en Tipo de Cliente.
- Campo físico Dataverse de `customerType`.
- Entra, Render, MSAL, Azure, Dataverse real o despliegues.

## Validación

- `npm test -- --run`
- `npm run build`
- `git diff --check`
- `git status --short`
- Backend solo si `server/` resulta afectado; este alcance no lo modifica.

## Reversión

Revertir únicamente los archivos identificados para este hito. Los cambios preexistentes de Customer/Phase1 y la infraestructura local no deben restaurarse, sobrescribirse ni incluirse en operaciones destructivas.
