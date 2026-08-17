# Phase1-040 — Normalize fechaStr Across Data Sources

## Estado

**PASS — IMPLEMENTED / NOT ACTIVATED.**

## Objetivo ejecutado

Unificar `fechaStr` en las rutas local y Dataverse, parser, adaptación Product,
Record Assembler y exportaciones con un único formato canónico:

```text
fecha válida          -> YYYY-MM-DD
fecha vacía/inválida  -> ""
```

Product Dataverse continúa sin activarse.

## Implementación

- `normalizeFechaStr` en `src/utils/dateUtils.js` es la única función de
  normalización de `fechaStr`.
- Valida fechas ISO, ISO con hora y formatos locales vigentes sin convertir
  strings mediante `Date`; así conserva el día calendario escrito y evita
  shifts por timezone.
- Master Parser, Product normalizer y Record Assembler reutilizan la función.
- El Product frontend conserva `fechaStr` como valor derivado canónico para no
  perder el día fuente al atravesar Provider y Repository.
- La salida sin Maestro, vacía o inválida usa `""`; no se crean fechas
  ficticias.
- CSV, Excel y presentación continúan consumiendo directamente el `fechaStr`
  del record, ahora canónico desde su origen.

## Contratos preservados

- `discontinuationDate` y `creationDate` mantienen `Date|null` y su semántica
  anterior.
- `parseFecha` no cambia; por tanto, no se alteran cálculos ni reglas de fechas
  fuera de la representación de `fechaStr`.
- Producto Nuevo continúa usando `creationDate` con comparación estricta
  `< 90 días`.
- EOL, filtros Product, mapping Dataverse, pivot USA/CHINA, FormattedValue,
  Customer Master y precios nullable no cambian.

## Archivos de código modificados

- `src/utils/dateUtils.js`.
- `src/domain/parser/masterParser.js`.
- `src/domain/product/product.js`.
- `src/domain/parser/recordAssembler.js`.

## Pruebas modificadas

- `src/utils/__tests__/dateUtils.test.js`.
- `src/domain/product/__tests__/product.test.js`.
- `src/providers/local/__tests__/localProductProvider.test.js`.
- `src/providers/dataverse/__tests__/dataverseProductProvider.test.js`.
- `src/application/__tests__/productMasterIntegration.test.js`.
- `src/__tests__/parserRecordCharacterization.test.js`.
- `src/__tests__/ap01DashboardRevision.test.js`.

La cobertura incluye ISO completa, fecha con hora y offset, formato local,
`null`, `undefined`, string vacío, fecha inválida, paridad local/Dataverse,
assembler, exportación Excel, Producto Nuevo y Customer Master dentro de la
suite frontend completa.

## Validaciones

- Frontend tests: 31 archivos, 325/325 pruebas aprobadas.
- Frontend build: aprobado con Vite 5.4.21 y 1682 módulos transformados.
- Backend tests/build: no ejecutados; no se modificó backend ni su contrato
  HTTP.
- `git diff --check` y `git status --short`: registrados al cierre en el log
  local.

## Riesgos, parámetros y reversión

No se agregan parámetros. El cambio visible es intencional: fechas locales no
canónicas pasan a `YYYY-MM-DD`, y ausencia/invalidez pasa a `""`. La reversión
consiste en retirar `normalizeFechaStr` de Product, parser y assembler junto con
sus pruebas y documentación; no existe migración de datos.

## Evidencia

`logs/Phase1-040-NormalizeFechaStrAcrossSources.log`, excluido de Git.

No hubo activación Product Dataverse, cambios de entorno, commit, push o
deploy.

Prompt ejecutado: Phase1-040 — Normalize fechaStr Across Data Sources
