# Phase1-073 — Instrument and Align Product Brands Loading

## Estado

**PASS — PRODUCT BRANDS TRACE ALIGNED / PRODUCT PROVIDER TEMPORARY 35 S /
BRANDS QUERY UNCHANGED / CUSTOMER ISOLATED / NOT DEPLOYED / NOT ACTIVATED.**

## Objetivo ejecutado

Resolver los tres blockers confirmados por Phase1-071 antes de desplegar el
pre-filtro Marca: observar correctamente `/api/products/brands`, propagar su
contexto hasta la paginación y evitar que el Provider Product aborte antes de
la ventana backend. Este hito no optimiza la consulta Brands.

## Tracing de Product Brands

`GET /api/products/brands` crea ahora un contexto mediante la infraestructura
existente `createProductRequestTrace()` y lo propaga explícitamente:

```text
Product API
  -> Product Service.listBrands({ productTrace })
    -> Product Price Level Gateway.loadBrands({ productTrace })
      -> Dataverse Client.retrieveAll({ productTrace })
```

Un único `traceId` correlaciona:

```text
PRODUCT_REQUEST_RECEIVED
PRODUCT_AUTH_VALIDATED
PRODUCT_SERVICE_STARTED
DATAVERSE_TOKEN_REQUEST_STARTED
DATAVERSE_TOKEN_ACQUIRED
DATAVERSE_FETCH_STARTED
DATAVERSE_FETCH_COMPLETED
PRODUCT_RESPONSE_SENT
```

Cada página emite número incremental, `fetchElapsedMs`, `recordsReturned`,
`hasNextLink` y `cumulativeRecords`. El resumen exitoso emite `totalPages`,
`totalRecords` y `totalFetchElapsedMs`. Requests distintos generan UUID
distintos.

Todos los eventos request/paginación incorporan una clasificación interna
allowlisted: `PRODUCT_MASTER` o `PRODUCT_BRANDS`. No se añade al contrato HTTP
ni al frontend. Customer no crea ni propaga el contexto, por lo que no genera
eventos Phase1-066/068.

## Seguridad

Los schemas cerrados aceptan exclusivamente `component`, `diagnosticId`,
`stage`, `elapsedMs`, `result`, `traceId`, `operation`, `pageNumber`,
`fetchElapsedMs`, `recordsReturned`, `hasNextLink`, `cumulativeRecords`,
`totalPages`, `totalRecords` y `totalFetchElapsedMs` según el tipo de evento.
No reciben ni registran marca, SKU, producto, precio, URL/nextLink/query,
filtro, Authorization/JWT/token, identidad, header, payload, IP, PII, secreto,
error crudo o stack.

## Timeout frontend Product

El default real de `DataverseProductProvider` cambia temporalmente de
**10 000 ms** a **35 000 ms** para `loadBrands()` y
`loadProducts({ brand })`. Se preservan inyección, AbortController,
`PRODUCT_REQUEST_TIMEOUT` sanitizado, respuesta válida antes del límite y
cleanup del timer.

Dataverse Customer Provider permanece en **10 000 ms**. El fetch backend
Dataverse permanece en **30 000 ms** y el smoke Product en **35 000 ms**. Los
35 s del Provider Product deben reevaluarse después de medir y optimizar
Brands/Product Master.

## Consulta Brands preservada

No se modificó la query ni el mecanismo vigente:

```text
productpricelevels
  -> filtro compradores
  -> retrieveAll()
  -> selección de marca
  -> trim
  -> deduplicación
  -> orden
```

No se añadieron cache, `$apply`, `groupby`, distinct alternativo, índices,
tabla auxiliar, cambios de page size/`$orderby` o paralelización. La
optimización real queda pendiente de una medición productiva posterior y
autorizada.

## Pruebas y validaciones

- Backend focalizado Product trace/API/Gateway: **54/54 PASS**.
- Backend completo: **121/121 PASS**.
- Backend build/syntax: **PASS**.
- Frontend focalizado Product/Customer/Local Provider: **34/34 PASS**.
- Frontend completo: **360/360 PASS en 32 archivos**.
- Frontend build: **PASS**, Vite 5.4.21, 1 683 módulos.
- `git diff --check`: **PASS**.

Las pruebas cubren flujo Brands completo, autenticación, llegada a Service,
identidad del contexto en Gateway, paginación incremental, conteos/acumulados/
totales, operación Brands/Master, correlación y separación de UUID,
sanitización estricta, ausencia Customer y regresión Product Master. Frontend
cubre default 35 s en ambas operaciones, timeout inyectable, AbortController,
error sanitizado, respuesta previa al límite, cleanup, Customer 10 s y suite
Local sin cambios.

## Archivos

Productivos modificados:

- `server/src/app/createApp.js`.
- `server/src/routes/productRoutes.js`.
- `server/src/modules/products/productService.js`.
- `server/src/integrations/dataverse/productPriceLevelGateway.js`.
- `server/src/observability/productRequestTrace.js`.
- `src/providers/dataverse/dataverseProductProvider.js`.

Pruebas modificadas:

- `server/tests/productRequestTrace.node-test.js`.
- `server/tests/productPriceLevelGateway.node-test.js`.
- `src/providers/dataverse/__tests__/dataverseProductProvider.test.js`.
- `src/providers/dataverse/__tests__/dataverseCustomerProvider.test.js`.

Documentación creada/modificada:

- `docs/prompts/Phase1-073-InstrumentAndAlignProductBrandsLoading.md`.
- `docs/knowledge/ARCHITECTURE_STATE.md`.
- `docs/knowledge/DATA_SOURCES.md`.
- `docs/knowledge/ROADMAP.md`.
- `docs/knowledge/CHANGELOG.md`.
- `logs/Phase1-073-InstrumentAndAlignProductBrandsLoading.log` (local,
  excluido de Git).

## Riesgos, reversión y siguiente acción

El costo real de `/brands` sigue desconocido y puede abarcar todas las páginas.
El timeout de 35 s no optimiza ni garantiza completar un total multi-página;
solo evita el aborto frontend anterior a la ventana backend individual y
permite capturar medición trazable.

La reversión retira Brands del clasificador de trace, deja de propagar el
contexto en `listBrands/loadBrands`, elimina `operation` y restaura el default
Product Provider de 10 000 ms. No requiere cambios de datos ni externos.

Siguiente acción exacta: tras checkpoint y deploy autorizados por separado,
ejecutar una única medición controlada de `GET /api/products/brands`, recopilar
totales/páginas/tiempos sanitizados y definir un prompt independiente para la
optimización basada en esa evidencia, manteniendo
`VITE_PRODUCT_SOURCE=local`.

No hubo commit, push, deploy, smoke productivo, activación Product Dataverse ni
cambios en Render, Vercel, Entra, Dataverse o variables externas.

Prompt ejecutado: Phase1-073 — Instrument and Align Product Brands Loading
