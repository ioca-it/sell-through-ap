# Phase1-077 — Optimize Brand Query and Validate Brand-Filtered Product Master

## Estado

**PASS — SERVER-SIDE BRAND GROUPBY IMPLEMENTED / FILTERED PRODUCT MASTER
PRESERVED / LOCALLY VALIDATED / NOT DEPLOYED / NOT MEASURED IN PRODUCTION.**

## Objetivo ejecutado

Optimizar `GET /api/products/brands` para que Dataverse produzca las marcas
únicas y confirmar, sin activar la fuente ni consultar producción, que Product
Master continúa filtrando por la marca obligatoria antes de paginar.

## Consulta Brands

La estrategia anterior solicitaba marca y compañía de todas las filas elegibles
mediante `retrieveAll()`, recorrió cinco páginas y transfirió 24.787 registros
en la medición aportada antes de normalizar y deduplicar en Node.

La nueva estrategia usa la composición oficial Dataverse:

```text
$apply=filter(<comprador permitido A> or <comprador permitido B>)
       /groupby((<campo marca autorizado>))
```

OData no dispone de `$distinct`; `$apply/groupby` devuelve los valores distintos.
El filtro de los dos compradores se ejecuta antes del `groupby`, que contiene
exclusivamente el campo de marca. No se añadieron SQL Web API ni FetchXML.

Referencia oficial: [Aggregate data by using OData — Microsoft
Learn](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query/aggregate-data).

## Dataverse Client y seguridad

`DataverseClient` añade `retrieveGrouped({ entitySet, filter, groupBy })`. La
operación construye internamente `$apply`; valida los nombres de propiedad de
`groupBy`, no acepta una expresión `$apply` del frontend y no mezcla `$select`,
`$filter`, `$orderby` o `$distinct` externos. Product Gateway conserva las
constantes autorizadas y React continúa consumiendo solo endpoints funcionales.

Brands ejecuta una única consulta agrupada y deja de usar `retrieveAll()` como
estrategia global. El backend mantiene `String()`, `trim()`, eliminación de
null/vacío, deduplicación defensiva y orden determinístico. El contrato sigue
siendo exclusivamente:

```json
{ "brands": ["ANKER", "SKULLCANDY"] }
```

No se exponen LogicalNames, OData ni payload Dataverse.

## Product Master preservado

`GET /api/products/master?brand=<marca>` mantiene `brand` obligatoria, trimmed,
máximo 100 caracteres y escapada con `quoteODataString()`. El Gateway compone
compradores + marca antes de su única llamada `retrieveAll()`. Sin marca la API
responde `400 / INVALID_PRODUCT_REQUEST` antes del Gateway y no existe fallback
global. Dos cargas consecutivas A/B ejecutan consultas separadas y consolidan
solo filas de su marca.

Mappings, `$orderby`, FormattedValue, consolidación por SKU, precios `0|null`,
conflictos, Customer y contratos permanecen intactos.

## Tracing y timeouts

`PHASE1_066_PRODUCT_REQUEST_TRACE` se preserva. Brands añade el stage seguro
`PRODUCT_AGGREGATE_QUERY_COMPLETED` con `operation=PRODUCT_BRANDS`, `elapsedMs`,
`recordsReturned` y `requestCompleted`; no registra marcas ni consulta. Brands
ya no emite `PHASE1_068_PRODUCT_PAGINATION_TRACE`, porque no usa paginación
normal. Product Master conserva Phase1-066/068 sin cambios.

Se preservan: fetch Dataverse 30.000 ms, Product Provider 35.000 ms, Product
smoke 35.000 ms y Brands smoke 35.000 ms. Reducirlos requiere primero una
medición real posterior al deploy.

## UI preservada

No se modificó React. El ComboBox Marca mantiene visibilidad, búsqueda local,
responsive/accesibilidad, loading/error/cero resultados, selección explícita e
invalidación del Product anterior al cambiar de marca. Provider Dataverse
continúa usando `/brands`; Provider local y Customer permanecen sin cambios.

## Validación

- Backend: **124/124 PASS**.
- Backend build/syntax: **PASS**.
- Frontend: **381/381 PASS en 33 archivos**.
- Frontend build: **PASS**, Vite 5.4.21 y 1.684 módulos.
- `git diff --check`: registrado en el log final del hito.

La cobertura demuestra `$apply/groupby`, filtro previo, único campo agrupado,
ausencia de `retrieveAll()` Brands, normalización/contrato, rechazo OData,
tracing sin datos, marca obligatoria/escapada, filtro antes de paginar,
aislamiento A/B, mappings, precios, conflictos y Customer. La suite frontend
vigente valida ComboBox, proveedores, limpieza A→B, fuente local, Customer y
timeouts.

## Archivos

Productivos modificados:

- `server/src/integrations/dataverse/dataverseClient.js`.
- `server/src/integrations/dataverse/productPriceLevelGateway.js`.
- `server/src/observability/productRequestTrace.js`.

Pruebas modificadas:

- `server/tests/dataverseClient.node-test.js`.
- `server/tests/productPriceLevelGateway.node-test.js`.
- `server/tests/productRequestTrace.node-test.js`.

Documentación creada/modificada:

- `docs/prompts/Phase1-077-OptimizeBrandQueryAndValidateFilteredProductMaster.md`.
- `docs/knowledge/ARCHITECTURE_STATE.md`.
- `docs/knowledge/DATA_SOURCES.md`.
- `docs/knowledge/BUSINESS_RULES.md`.
- `docs/knowledge/ROADMAP.md`.
- `docs/knowledge/CHANGELOG.md`.
- `logs/Phase1-077-OptimizeBrandQueryAndValidateFilteredProductMaster.log`
  (local, excluido de Git).

## Riesgos, reversión y siguiente acción

La optimización aún no fue medida contra Dataverse real. OData aggregate evalúa
como máximo 50.000 registros por consulta; la medición aportada de 24.787 queda
por debajo, pero el crecimiento futuro debe vigilarse. No se justifica reducir
timeouts hasta capturar una medición Brands y otra Product filtrada.

La reversión elimina `retrieveGrouped` y el checkpoint agregado, y restaura
Brands a `retrieveAll()`; no requiere migraciones ni cambios externos.

Siguiente acción exacta: revisar el diff, autorizar un checkpoint separado,
desplegar backend/frontend sin cambiar `VITE_PRODUCT_SOURCE=local`, ejecutar una
sola medición autenticada de Brands y una sola medición de Product Master con
una marca controlada, comparar elapsed/conteos y decidir la reducción de
timeouts en otro hito.

No hubo commit, push, deploy, smoke productivo, activación de Product Dataverse,
cambios de variables, Entra o Dataverse.

Prompt ejecutado: Phase1-077 — Optimize Brand Query and Validate Brand-Filtered Product Master
