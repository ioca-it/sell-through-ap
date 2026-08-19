# Phase1-094 — Final Presentation Audit and Consolidated UX/Data Corrections

## Objetivo

Cerrar en un solo hito las correcciones finales de exactitud matemática,
consistencia de datos, claridad ejecutiva, UX y exportaciones para la
presentación de `sell-through-ap`, sin refactor general ni cambios externos.

## Auditoría y causas demostradas

1. `sumPriceValues` y las distribuciones anulaban el total completo al encontrar
   un único precio ausente; por eso bloques con otros SKU valorizables mostraban
   un valor no disponible.
2. El motor de reposición aprobado usa dos etapas: `Necesidad` contra Inventario
   Final y luego descuenta Compra/Tránsito. Inventario Proyectado es un dato
   operativo informado o, si falta toda la columna, `Inicial + Compra - Ventas`;
   alimenta quiebre y merma, no reemplaza esa etapa adicional.
3. El KPI EOL tomaba `clasificacionTemporal=VENCIDO`, condición que el contrato
   fuerza para todo estado EOL aunque su fecha sea futura; la tabla vencida sí
   filtraba por fecha. Eran conceptos distintos con etiquetas equivalentes.
4. `productUrl` sí atraviesa Gateway, Provider, Repository, Application Service
   y datasets. Un SKU sin link corresponde a URL ausente/inválida; el Maestro
   local tampoco aporta esos campos. No se fabrica ningún enlace.
5. SheetJS CE `0.20.3` no ofrece una API pública para insertar imágenes. Se
   preservan links de producto e imagen; incrustar binarios exigiría una
   reescritura o dependencia no autorizada.
6. La métrica anterior era el recíproco `Inventario inicial / Ventas`. El cambio
   aprobado exige `Ventas / Inventario inicial × 100` y denominador cero no
   calculable.

## Implementación autorizada

- Selección de precio preservada: USA usa `priceUSA`, CHINA usa `priceChina`,
  cero es real y ausencia permanece `null`. Los agregados suman importes
  calculables sin convertir ausencias a cero; un bloque sin valor disponible
  permanece no disponible.
- Total de inventario calculado sobre records, sin sumar subconjuntos EOL
  superpuestos. Valor y `% Valor` comparten la misma base válida.
- KPI `SKU con EOL definido` separado de `EOL vencido/descontinuado`; el Informe
  y Excel distinguen valor EOL total, vencido y futuro.
- Recomendación EOL centralizada: vencido/crítico liquida; futuro A puede
  rebalancear/agotar; futuro B reduce/rebalancea selectivamente; el resto se
  liquida selectivamente. Todo EOL conserva reposición normal cero.
- `Porcentaje de Rotación` sustituye transversalmente la métrica anterior; las
  bandas se traducen a >100%, 33.33–100%, 10–<33.33% y <10%.
- Leyendas reutilizables con nombre, definición, unidad, fórmula, fuente e
  interpretación en secciones analíticas y el Informe Ejecutivo.
- `ProductSkuCell` conserva SKU en una línea, link seguro y miniatura, y añade
  lightbox accesible con cierre por X, Escape y backdrop.
- Excel incorpora hyperlinks seguros, `Ver imagen` y hoja `Definiciones y
  Fórmulas`. CSV mantiene el dataset limpio y genera un segundo CSV de
  definiciones.

## Archivos implicados

- Dominio/aplicación: `src/domain/product/product.js`,
  `src/domain/inventory/inventoryEngine.js`, `src/domain/eol/eolEngine.js`,
  `src/domain/parser/recordAssembler.js`,
  `src/domain/portfolio/PortfolioAnalysisService.js`,
  `src/domain/report/ExecutiveReportService.js`,
  `src/application/sellThroughApplicationService.js`.
- Presentación/exportación: `src/App.jsx`, `src/components/ProductSkuCell.jsx`,
  `src/components/DefinitionLegend.jsx`, `src/presentation/metricDefinitions.js`,
  `src/presentation/csvExport.js`, `src/utils/safeUrl.js`,
  `src/utils/formatters.js`.
- Pruebas específicas y documentación oficial del hito.

## Reglas y fuentes preservadas

No cambian filtros Product Dataverse, compradores, comparación de compañías,
origen/brand obligatorios, Brands groupby, latest record, pivot USA/CHINA,
mappings, Customer, autenticación, seguridad, red, providers, variables o
infraestructura. No se añade fuente, columna Dataverse, framework ni dependencia.

## Riesgos y mitigación

- Totales monetarios parciales: las filas sin precio siguen identificables como
  no disponibles y las definiciones explican que el agregado usa solo importes
  válidos.
- Imágenes remotas: errores no abortan UI o exportación; solo se aceptan URLs
  absolutas `http:`/`https:`.
- Compatibilidad CSV: definiciones se descargan aparte, sin mezclar texto con el
  dataset principal.

## Validación y reversión

Validación final única: `npm test -- --run`, `npm run build`,
`git diff --check` y `git status --short`. Backend no aplica si `server/` queda
sin cambios. La reversión consiste en retirar únicamente los archivos/diffs de
Phase1-094; no se crea commit, push, rama o deploy.
