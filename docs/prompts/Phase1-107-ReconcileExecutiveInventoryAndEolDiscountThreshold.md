# Phase1-107 — Reconcile Executive Inventory KPIs and Enforce EOL Discount Minimum Inventory

## Objetivo aprobado

Reconciliar el KPI "Inventario Actual" entre el bloque superior del Executive
Dashboard y Resumen Ejecutivo sobre un único dataset canónico, y exigir en la
tabla operativa EOL de descuento un inventario mínimo (`EOL_DISCOUNT_MIN_INVENTORY`,
default 12 unidades) además del descuento vigente, sin reducir el KPI EOL
general ni alterar reglas históricas no autorizadas.

## Causa raíz confirmada (44 vs 38)

Phase1-105/D-026 ya había reconciliado el Resumen Excel y los seis KPI de
Distribución por Tier contra `distribucionTier`, pero
`ExecutiveReportService.buildExecutiveReport` seguía derivando
`executiveSummary.totalSKUs`/`totalUnidades`/`valorTotalInventario` de
`totales.*` (universo completo de 44 registros, incluyendo seis con
`Inventario Final = 0`). Eso dejaba el Executive Dashboard mostrando 44
mientras Resumen Ejecutivo ya mostraba 38 registros con inventario real;
unidades (442) y valor ($12.171) coincidían por casualidad porque esas seis
filas no aportan unidades ni valor.

## Dataset canónico elegido y definición de Inventario Actual

`distribucionTier.inventario` (`Inventario Final > 0`, valorización null-safe
vía `isAvailablePrice()`) es el único dataset canónico para "Inventario
Actual": SKU, unidades y valor. `ExecutiveReportService` ahora deriva sus tres
campos de ese dataset en vez de `totales.*`. `totales.totalSKUs`/`totalUnidades`/
`valorTotalInventario` conservan su significado distinto ("todos los registros
analizados") donde ya se usaban, sin mostrarse junto a Inventario Actual bajo
una etiqueta ambigua.

## Regla EOL ≥ 12 y preservación del KPI EOL general

`eolConDescuentoAplicable` exige ahora `Inventario Final ≥ EOL_DISCOUNT_MIN_INVENTORY`
(constante exportada por `eolEngine.js`, default vigente 12 unidades) y
`descPct > 0`, en vez de solo `Inventario Final > 0`. El KPI EOL general
(`eolTodos`) no se reduce: un SKU EOL bajo el umbral permanece clasificado
como EOL pero sale de la tabla operativa "SKU Clasificados EOL que aplican
regla de descuento". `EOL_DISCOUNT_MIN_INVENTORY` es distinto del
`inventarioMinimoReconocido` de Fase 4 (reparto de aportes IOCA/Retail);
ambos valen 12 hoy por coincidencia de negocio, no por ser la misma regla.

## Parámetro futuro Configuration Center

`EOL_DISCOUNT_MIN_INVENTORY` queda documentado en `metricDefinitions.js` como
parámetro de negocio ("EOL — Inventario mínimo para aplicar descuento",
default 12, unidad "unidades") y candidato futuro a Configuration Center; esta
fase no implementa edición ni toca `docs/knowledge/CONFIGURATION_CENTER.md` ni
`docs/prompts/Phase1-100-AuditExistingConfigurationParameters.md`.

## Reconciliación UI/Excel/CSV

Executive Dashboard (renombrado "Total SKU" → "SKU en inventario"), Resumen
Ejecutivo, Distribución por Tier, Informe Ejecutivo, Excel y CSV muestran el
mismo universo e igual cifra para Inventario Actual. Excel y CSV no
requirieron cambios de código: ya consumían `eolConDescuentoAplicable` y
`distribucionTier.inventario` directamente desde Phase1-105, por lo que el
ajuste de filtro en Domain se propaga sin tocar exportaciones.

## Validación y límites

Se agregó cobertura de límites A-H del umbral EOL (11/12/13 unidades con
variaciones de descuento, inventario/descuento nulos o cero, preservación de
`eolTodos` y del KPI general) y se ajustaron fixtures preexistentes que
asumían el umbral anterior `invFinal > 0`. Backend 139/139, frontend 435/435
en 37 archivos y ambos builds PASS. No se creó commit, push, deploy ni se
modificó Dataverse, Vercel, Render, Entra, variables, timeouts, App
Registration o roles.

Prompt ejecutado: Phase1-107 — Reconcile Executive Inventory KPIs and Enforce EOL Discount Minimum Inventory
