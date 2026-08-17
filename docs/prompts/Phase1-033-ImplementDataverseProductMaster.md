# Phase1-033 — Implement Dataverse Product Master

## Estado

**PASS — IMPLEMENTED / NOT ACTIVATED.**

## Objetivo ejecutado

Implementar Maestro Producto desde Dataverse `productpricelevel` manteniendo la
arquitectura portable y el provider local, sin activar Product Dataverse en
producción ni modificar Inventario Cliente, reglas EOL o fórmulas existentes.

## Arquitectura implementada

```text
Dataverse productpricelevel
  -> Dataverse Client / OAuth client_credentials backend
    -> Product Price Level Gateway
      -> Product Service
        -> GET /api/products/master
          -> Dataverse Product Provider frontend / Bearer MSAL
            -> Product Repository
              -> Product Master Application Service
                -> Product normalizado
                  -> Sell Through Application Service / motores existentes
```

`VITE_PRODUCT_SOURCE=local|dataverse` selecciona la ruta. `local` permanece como
default y conserva el texto/`masterParser.js`; la ruta Dataverse no está activa
en producción. Render solo aloja transitoriamente el backend portable y Azure
permanece como destino definitivo.

## Fuente, mapping y filtro

Entity Set: `productpricelevel`.

| Product | Dataverse |
| --- | --- |
| `brand` | `crbbe_nombremarca` |
| `sku` | `crbbe_sku` |
| `productName` | `crbbe_nombreproducto` |
| `category` | `crbbe_nombrecategoria` |
| `discontinuationDate` | `crbbe_validohasta` |
| `creationDate` | `createdon` |
| `level` | `crbbe_clasificacioncomercial` |
| `status` | `crbbe_etapa` |
| `imageUrl` | `crbbe_imagenproducto` |
| `productUrl` | `producturl` |
| `priceUSA` | `amount` cuando origen es `USA` |
| `priceChina` | `amount` cuando origen es `CHINA` |

Campos auxiliares internos: `crbbe_origen` y
`crbbe_companiacompradora`. Product Price Level Gateway es el único módulo
productivo que conoce estos LogicalNames.

Toda consulta aplica en `$filter`:

```text
crbbe_companiacompradora eq 'IOCA USA INC'
or crbbe_companiacompradora eq 'SAND SPORTS, CORP.'
```

El gateway repite esa allowlist defensivamente en backend. React no filtra
compañías ni construye OData.

## Contrato Product

```js
{
  sku,
  productName,
  brand,
  category,
  discontinuationDate,
  creationDate,
  level,
  status,
  imageUrl,
  productUrl,
  priceUSA,
  priceChina,
}
```

El Product normalizer convierte fechas válidas a `Date` en frontend, preserva
`null` para fechas ausentes/inválidas y usa cero compatible para precios
ausentes. La adaptación al contrato histórico conserva estado, categoría,
costos, Producto Nuevo `<90 días` y fecha de descontinuación. `level`,
`imageUrl` y `productUrl` quedan disponibles en el record detallado SKU.

## FormattedValue

No existe evidencia local que confirme si `crbbe_clasificacioncomercial` o
`crbbe_etapa` son Choice. El gateway solicita
`OData.Community.Display.V1.FormattedValue` en la misma consulta, sin metadata
por producto. La etiqueta formateada tiene prioridad; si falta, solo se usa el
valor fuente cuando ya es texto. Un valor numérico nunca se convierte ni se
publica como label.

## Consolidación y conflictos

- Las filas se agrupan por SKU.
- `USA` pivota a `priceUSA`; `CHINA` pivota a `priceChina`.
- SKU con un solo origen mantiene cero para el otro.
- `amount null|undefined` no aporta un precio.
- SKU vacío se omite.
- Valores repetidos iguales no crean conflicto.
- Valores distintos para el mismo SKU/origen/comprador generan
  `409 / PRODUCT_MASTER_CONFLICT`.
- Valores distintos entre los dos compradores también bloquean la carga porque
  no existe precedencia autorizada.
- Nunca se suman, promedian o seleccionan arbitrariamente importes.

La definición de precedencia para esos conflictos permanece pendiente
funcional y requiere autorización separada.

## Seguridad y transporte

- Product Provider frontend usa el cliente HTTP autenticado compartido con
  Customer y `getAccessToken`/MSAL existentes.
- Product API reutiliza autenticación JWT/JWKS, CORS y rate limiter.
- Product Gateway reutiliza Dataverse Client, OAuth, cache de token, timeout,
  diagnóstico y paginación.
- `GET /api/products/master` no admite parámetros; OData libre se rechaza.
- No se duplican credenciales, secretos, OAuth o cache de tokens.

## Archivos creados

- `server/src/integrations/dataverse/productPriceLevelGateway.js`.
- `server/src/modules/products/productService.js`.
- `server/src/routes/productRoutes.js`.
- `server/tests/productApi.node-test.js`.
- `server/tests/productPriceLevelGateway.node-test.js`.
- `src/application/productMasterService.js`.
- `src/application/__tests__/productMasterService.test.js`.
- `src/application/__tests__/productMasterIntegration.test.js`.
- `src/domain/product/product.js`.
- `src/domain/product/__tests__/product.test.js`.
- `src/providers/productProviderFactory.js`.
- `src/providers/__tests__/productProviderFactory.test.js`.
- `src/providers/dataverse/authenticatedApiClient.js`.
- `src/providers/dataverse/dataverseProductProvider.js`.
- `src/providers/dataverse/__tests__/dataverseProductProvider.test.js`.
- `src/providers/local/localProductProvider.js`.
- `src/providers/local/__tests__/localProductProvider.test.js`.
- `src/repositories/productRepository.js`.
- `src/repositories/__tests__/productRepository.test.js`.
- `docs/prompts/Phase1-033-ImplementDataverseProductMaster.md`.
- `logs/Phase1-033-ImplementDataverseProductMaster.log` (local, excluido de Git).

## Archivos modificados

- `.env.example`.
- `server/src/app/createApp.js`.
- `server/src/integrations/dataverse/dataverseClient.js`.
- `server/tests/dataverseClient.node-test.js`.
- `src/App.jsx`.
- `src/__tests__/parserRecordCharacterization.test.js`.
- `src/application/sellThroughApplicationService.js`.
- `src/domain/parser/recordAssembler.js`.
- `src/providers/dataverse/dataverseCustomerProvider.js`.
- `docs/knowledge/ARCHITECTURE_STATE.md`.
- `docs/knowledge/DATA_SOURCES.md`.
- `docs/knowledge/ROADMAP.md`.
- `docs/knowledge/CHANGELOG.md`.
- `docs/knowledge/BUSINESS_RULES.md`.

Los cambios preexistentes de Phase1-032 en documentación y su prompt no se
revirtieron ni se atribuyen a Phase1-033.

## Pruebas y validación

- Frontend completo: 302/302 pruebas aprobadas en 31 archivos.
- Backend completo: 67/67 pruebas aprobadas.
- Build frontend: aprobado con Vite 5.4.21 y 1682 módulos transformados.
- Build backend/syntax: aprobado.
- `git diff --check` y `git status --short`: se registran en el log al finalizar.

Cobertura nueva: mapping completo, ambos compradores y exclusión de terceros,
pivot USA/CHINA, ambos orígenes y orígenes únicos, amounts nulos, SKU inválido,
URLs/fechas, creationDate/discontinuationDate, FormattedValue/fallback, contrato
sin LogicalNames, conflictos, endpoint sin OData, paginación, provider local,
regresión de contratos y Producto Nuevo `<90 días`.

## Riesgos, pendientes y reversión

- Pendiente: revisar/autorizar `VITE_PRODUCT_SOURCE=dataverse` y validar contra
  Dataverse real. No se ejecutó consulta productiva.
- Pendiente funcional: precedencia de precios conflictivos; hoy la carga se
  bloquea de forma segura.
- Pendiente de infraestructura: migrar backend portable de Render a Azure sin
  cambiar contratos.
- Reversión: mantener `VITE_PRODUCT_SOURCE=local` (estado actual) y retirar los
  módulos Product Dataverse/entrada opcional; no existe migración de datos que
  revertir.

No hubo commit, push, deploy ni cambios en Vercel, Render, Entra o Dataverse.

Prompt ejecutado: Phase1-033 — Implement Dataverse Product Master
