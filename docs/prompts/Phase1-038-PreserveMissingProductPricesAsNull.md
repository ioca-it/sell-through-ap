# Phase1-038 — Preserve Missing Product Prices as Null

## Estado

**PASS — IMPLEMENTED / NOT ACTIVATED.**

## Objetivo ejecutado

Corregir exclusivamente la semántica de precios del Maestro Producto para
distinguir un precio real igual a cero de un precio no disponible, sin activar
Product Dataverse ni modificar filtros, mappings, FormattedValue, atributos
Phase1-036, Customer Master, Producto Nuevo, EOL o `fechaStr`.

## Regla implementada

```text
amount = 0          -> precio real = 0
amount = null       -> precio no disponible = null
amount = undefined  -> precio no disponible = null
sin fila USA        -> priceUSA = null
sin fila CHINA      -> priceChina = null
```

Los valores numéricos válidos se conservan. Una entrada local vacía o inválida
también se representa como `null`; un cero explícito local permanece en cero.
No existe fallback entre USA y CHINA.

## Consolidación y conflictos

- `crbbe_origen=USA` continúa alimentando `priceUSA`.
- `crbbe_origen=CHINA` continúa alimentando `priceChina`.
- `null`/ausente no participa en el set de precios y no genera conflicto falso
  con un número real.
- Cero y otro número distinto generan `PRODUCT_MASTER_CONFLICT`.
- Dos números distintos siguen generando `PRODUCT_MASTER_CONFLICT`.
- No se suma, promedia, selecciona ni sustituye un precio.

## Contrato y consumidores

Product Domain acepta exclusivamente número finito o `null` para `priceUSA` y
`priceChina`. Provider Dataverse/local, Repository y Product Master Application
Service preservan la nulabilidad. La adaptación al Maestro y Record Assembler
conservan `costoUSA`, `costoCHINA` y el costo aplicado como `null` cuando el
origen seleccionado no tiene precio.

Los cálculos dependientes —valores de inventario, ventas, reposición, merma,
tránsito, descuentos/aportes, distribuciones y totales— propagan `null`; no
omiten silenciosamente el dato ni lo convierten a cero. Cero explícito sigue
participando como precio válido. CSV/Excel dejan el valor ausente controlado y
el formatter visible existente representa `null` como `—`, nunca como `$0`.

## Archivos de código modificados

- `server/src/integrations/dataverse/productPriceLevelGateway.js`.
- `src/domain/product/product.js`.
- `src/domain/parser/masterParser.js`.
- `src/domain/parser/recordAssembler.js`.
- `src/domain/eol/eolEngine.js`.
- `src/domain/portfolio/PortfolioAnalysisService.js`.
- `src/application/sellThroughApplicationService.js`.
- `src/App.jsx`.

## Pruebas modificadas

- `server/tests/productPriceLevelGateway.node-test.js`.
- `server/tests/productApi.node-test.js`.
- `src/domain/product/__tests__/product.test.js`.
- `src/providers/dataverse/__tests__/dataverseProductProvider.test.js`.
- `src/providers/local/__tests__/localProductProvider.test.js`.
- `src/repositories/__tests__/productRepository.test.js`.
- `src/application/__tests__/productMasterService.test.js`.
- `src/application/__tests__/productMasterIntegration.test.js`.
- `src/__tests__/parserRecordCharacterization.test.js`.
- `src/utils/__tests__/formatters.test.js`.

La cobertura incluye amount cero/null/undefined, ambos orígenes ausentes o en
cero, null más valor real, conflictos 0 contra otro número y entre números,
contrato Product, Provider/Repository/Application, parser/assembler,
valorizaciones, formatter y regresión Customer dentro de la suite backend.

## Documentación

- Creado `docs/prompts/Phase1-038-PreserveMissingProductPricesAsNull.md`.
- Actualizados `BUSINESS_RULES.md`, `ARCHITECTURE_STATE.md`, `DATA_SOURCES.md`,
  `CHANGELOG.md` y `ROADMAP.md`.
- Evidencia local: `logs/Phase1-038-PreserveMissingProductPricesAsNull.log`,
  excluida de Git.

## Validaciones

- Frontend: 309/309 pruebas aprobadas en 31 archivos.
- Backend: 86/86 pruebas aprobadas, incluida regresión Customer.
- Build frontend: aprobado con Vite 5.4.21 y 1682 módulos transformados.
- Build backend: aprobado (`Backend syntax check passed.`).
- `git diff --check`: se registra al cierre en el log.
- `git status --short`: se registra al cierre en el log.

## Riesgos, pendientes y reversión

El precio ausente puede volver `null` una valorización o total que antes parecía
cero; este cambio evita publicar una cifra falsa y está limitado a magnitudes
dependientes del precio. Las unidades, clasificaciones, filtros, fórmulas no
monetarias y contratos de forma permanecen intactos.

Pendientes reales: resolver `fechaStr`, autorizar por separado la activación y
validación real de `VITE_PRODUCT_SOURCE=dataverse`, y migrar eventualmente el
backend portable de Render a Azure. La reversión consiste en retirar la
propagación nullable y sus pruebas/documentación; no existe migración de datos.

No se modificó `fechaStr`. No hubo consulta Product productiva, activación,
commit, push, deploy ni cambios en Vercel, Render, Entra o Dataverse.

Prompt ejecutado: Phase1-038 — Preserve Missing Product Prices as Null
