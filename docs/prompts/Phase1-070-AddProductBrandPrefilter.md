# Phase1-070 — Add Product Brand Prefilter

## Estado

**PASS — PRODUCT BRAND PREFILTER IMPLEMENTED / GLOBAL PRODUCT LOAD BLOCKED /
LOCAL PARITY PRESERVED / NOT DEPLOYED / NOT ACTIVATED.**

## Objetivo ejecutado

Agregar una selección funcional de Marca en Configuración y usarla como
pre-filtro obligatorio de Product Master Dataverse antes de iniciar la
paginación. Se preservan Product, Customer, consolidación, precios, conflictos,
orden, trazas temporales, timeouts y la fuente normal `local`.

## Arquitectura final

```text
Configuración UI (selectedBrand)
  -> Product Master Application Service
    -> Product Repository
      -> Product Provider local | dataverse
        -> Product API funcional
          -> Product Service
            -> Product Price Level Gateway
              -> Dataverse Client.retrieveAll()
                -> productpricelevels
```

Customer y Brand mantienen estados independientes. React conoce únicamente
`brand`, `loadBrands()` y `loadProducts({ brand })`; no conoce Entity Set,
LogicalNames, `$filter`, `$select`, `$orderby` o `@odata.nextLink`.

## API funcional

### Lista de marcas

```http
GET /api/products/brands
```

```json
{
  "brands": [
    "ANKER",
    "SKULLCANDY"
  ]
}
```

No admite query parameters. La ruta usa el mismo JWT, CORS y rate limiter de
Product existente y conserva diagnósticos HTTP sanitizados.

### Product Master

```http
GET /api/products/master?brand=SKULLCANDY
```

Solo admite una ocurrencia de `brand`. Se rechazan parámetros desconocidos,
duplicados, `$filter`, `$select`, `$orderby`, `$top` y OData libre.

## Validación de brand

Product Service valida antes del Gateway:

- tipo `string`;
- `trim()`;
- valor no vacío;
- máximo 100 caracteres.

Ausencia, vacío, tipo inválido o longitud excesiva producen
`400 / INVALID_PRODUCT_REQUEST`. El Gateway no se llama y no existe consulta
global de fallback.

## Lista Dataverse de marcas

Product Price Level Gateway usa `retrieveAll()` porque Dataverse Client no
expone otra operación paginada de agregación verificada. La consulta utiliza:

- Entity Set `productpricelevels`;
- `$select=crbbe_nombremarca,crbbe_companiacompradora`;
- el filtro empresarial vigente de `IOCA USA INC` o
  `SAND SPORTS, CORP.`;
- sin `$apply`, `groupby`, consolidación Product, FormattedValue ni los trece
  campos del Maestro.

Si existen varias páginas, el costo queda encapsulado en backend y se siguen
los `@odata.nextLink` seguros del Dataverse Client. Después se aplica la defensa
de compañía, `trim()`, exclusión de null/vacío/espacios, deduplicación exacta y
orden alfabético determinístico. No se crean aliases ni se combinan marcas con
valores distintos.

## Product Master filtrado antes de paginar

El Gateway construye con `quoteODataString()`:

```text
(
  crbbe_companiacompradora eq 'IOCA USA INC'
  or crbbe_companiacompradora eq 'SAND SPORTS, CORP.'
)
and crbbe_nombremarca eq '<brand escapada>'
```

Ese filtro forma parte del objeto entregado a `retrieveAll()` en su primera y
única invocación Product. Por tanto, la primera página y los next links
posteriores pertenecen al dataset ya filtrado. La defensa backend posterior
descarta una fila de otra marca si el upstream incumple el predicado, pero no es
la fuente del ahorro de red.

## Fuente local equivalente

`localProductProvider` reutiliza `masterParser.js` una sola vez por operación:

- `loadBrands()` deriva la lista única, trimmed y ordenada desde Product local;
- `loadProducts({ brand })` exige marca válida y devuelve solo Product con
  coincidencia exacta normalizada;
- se conservan mappings, `fechaStr`, `0` y `null` del parser vigente.

`VITE_PRODUCT_SOURCE=local` continúa como default y no se activó Dataverse.

## UI y cambio de marca

Configuración incorpora un ComboBox responsive con búsqueda sobre el catálogo
normalizado, carga bajo demanda, una sola solicitud pendiente, loading, cero
resultados, error sanitizado, listbox y selección por mouse/teclado. Escribir no
selecciona implícitamente: el usuario debe elegir una opción.

Para fuente Dataverse, Configuración y la carga Product exigen `selectedBrand`.
Sin ella el botón de cálculo permanece deshabilitado, se muestra una indicación
clara y el handler conserva un guard que impide llamar al Product Service.

Editar o cambiar la marca elimina la selección y limpia `resultados`. Después
de seleccionar otra marca, la siguiente carga invoca exclusivamente
`loadProducts({ brand: nuevaMarca })`; no se mezclan datasets.

## Contratos preservados

- Entity Set `productpricelevels` y los trece mappings vigentes.
- `$orderby` Product sin cambios.
- `USA -> priceUSA`, `CHINA -> priceChina`.
- `amount = 0` real y ausencia/null como `null`.
- `PRODUCT_MASTER_CONFLICT` para precios y atributos.
- FormattedValue de level/status, `fechaStr`, consolidación por SKU y contrato
  Product.
- Customer Master, Inventario Cliente, autenticación, CORS y rate limiting.
- `PHASE1_066_PRODUCT_REQUEST_TRACE` y
  `PHASE1_068_PRODUCT_PAGINATION_TRACE`.
- Timeout fetch Dataverse 30 000 ms y timeout smoke frontend 35 000 ms.

El smoke temporal Phase1-042 exige ahora una marca explícita en su trigger y no
ejecuta la API si falta; no se cambió su timeout ni se ejecutó smoke real.

## Pruebas

Backend cubre endpoint autenticado de marcas, lista normalizada, filtro de
compradores, validación obligatoria, rechazo de OData, escape de comillas,
composición del filtro antes de `retrieveAll()`, ausencia de consulta global,
aislamiento por marca, mappings/precios/conflictos y regresión Customer.

Frontend cubre providers local/Dataverse, Repository/Application Service,
endpoint funcional, marca obligatoria, ComboBox visible, loading, búsqueda,
selección mouse/teclado, cero, error sanitizado, deduplicación pendiente, guard
sin marca, cambio A→B y Customer sin regresión.

Resultados finales:

- Backend: 119/119 PASS.
- Backend build: PASS.
- Frontend: 356/356 PASS en 32 archivos.
- Frontend build: PASS.
- `git diff --check`: PASS.

## Archivos

Productivos modificados:

- `server/src/integrations/dataverse/productPriceLevelGateway.js`.
- `server/src/modules/products/productService.js`.
- `server/src/routes/productRoutes.js`.
- `src/App.jsx`.
- `src/application/productMasterService.js`.
- `src/auth/productMasterSmokeTest.js`.
- `src/domain/product/product.js`.
- `src/providers/dataverse/dataverseProductProvider.js`.
- `src/providers/local/localProductProvider.js`.
- `src/repositories/productRepository.js`.

Pruebas modificadas:

- `server/tests/productApi.node-test.js`.
- `server/tests/productPriceLevelGateway.node-test.js`.
- `server/tests/productRequestTrace.node-test.js`.
- `src/__tests__/customerMasterUi.test.js`.
- `src/application/__tests__/productMasterService.test.js`.
- `src/auth/__tests__/productMasterSmokeTest.test.js`.
- `src/providers/__tests__/productProviderFactory.test.js`.
- `src/providers/dataverse/__tests__/dataverseProductProvider.test.js`.
- `src/providers/local/__tests__/localProductProvider.test.js`.
- `src/repositories/__tests__/productRepository.test.js`.

Documentación creada/modificada:

- `docs/prompts/Phase1-070-AddProductBrandPrefilter.md`.
- `docs/knowledge/ARCHITECTURE_STATE.md`.
- `docs/knowledge/DATA_SOURCES.md`.
- `docs/knowledge/BUSINESS_RULES.md`.
- `docs/knowledge/ROADMAP.md`.
- `docs/knowledge/CHANGELOG.md`.
- `logs/Phase1-070-AddProductBrandPrefilter.log` (local, excluido de Git).

## Riesgos, costo y reversión

El endpoint de marcas puede recorrer varias páginas porque no se asumió soporte
de `$apply/groupby`. Reduce payload y omite consolidación Product, pero no
implementa cache, paralelización o índices. Es el costo real pendiente de medir
si se autoriza una ejecución posterior.

La reversión elimina el selector y los contratos `loadBrands`, restaura el
endpoint Product anterior y revierte documentación/pruebas de este hito. No
requiere migración de datos porque `selectedBrand` no se persiste.

No hubo commit, push, deploy, smoke productivo, cambios de variables, Render,
Vercel, Entra o Dataverse.

Prompt ejecutado: Phase1-070 — Add Product Brand Prefilter
