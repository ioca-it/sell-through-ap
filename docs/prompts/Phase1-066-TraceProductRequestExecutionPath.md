# Phase1-066 — Trace Product Request Execution Path

## Estado

**PASS — TEMPORARY PRODUCT REQUEST TRACE IMPLEMENTED / SANITIZED /
PRODUCT-ONLY / NOT DEPLOYED / NOT EXECUTED IN PRODUCTION / NOT ACTIVATED.**

## Objetivo ejecutado

Agregar observabilidad temporal para reconstruir el recorrido interno de un
request autenticado `GET /api/products/master`, sin diagnosticar por
suposición la causa del timeout ni modificar comportamiento funcional,
contratos, autenticación, fuentes o ventanas temporales.

## Flujo real encontrado

```text
createApp
  -> rate limiter por IP
  -> CustomerApiAuthenticator (JWT/JWKS/scope)
  -> rate limiter por identidad
  -> handleProductRoutes
  -> ProductService.loadMaster
  -> ProductPriceLevelGateway.loadProducts
  -> DataverseClient.retrieveAll/retrievePage
  -> EntraTokenProvider.getToken
  -> fetch Dataverse
  -> consolidación Product
  -> response.end({ products })
  -> evento HTTP finish
```

El backend no contiene un módulo denominado Product Application Service. El
punto real equivalente de inicio del flujo de aplicación Product es
`ProductService.loadMaster`; allí se ubica `PRODUCT_SERVICE_STARTED`.

## Instrumentación

Cada request Product GET exacto crea un contexto efímero con `randomUUID()` y
un inicio monotónico basado en `performance.now()`. El contexto se propaga
únicamente por argumentos internos Route → Product Service → Product Gateway
→ Dataverse Client. No se persiste, no se envía al frontend y no forma parte
de ningún contrato público.

Los checkpoints implementados son:

| Stage | Punto real | Result |
| --- | --- | --- |
| `PRODUCT_REQUEST_RECEIVED` | Entrada al handler portable antes de CORS/auth | `REACHED` |
| `PRODUCT_AUTH_VALIDATED` | Retorno exitoso de `authenticator.authenticate` | `PASS` |
| `PRODUCT_SERVICE_STARTED` | Entrada a `ProductService.loadMaster` | `REACHED` |
| `DATAVERSE_TOKEN_REQUEST_STARTED` | Inmediatamente antes de `tokenProvider.getToken` | `REACHED` |
| `DATAVERSE_TOKEN_ACQUIRED` | Resolución/rechazo de `getToken` | `PASS` / `FAIL` |
| `DATAVERSE_FETCH_STARTED` | Inmediatamente antes de `fetchImpl` | `REACHED` |
| `DATAVERSE_FETCH_COMPLETED` | Resolución/rechazo de `fetchImpl` | `PASS` / `FAIL` |
| `PRODUCT_RESPONSE_SENT` | Evento `finish` de la respuesta HTTP Product | `REACHED` |

Con paginación, los checkpoints token/fetch se repiten por página bajo el
mismo `traceId`, preservando el recorrido temporal del mismo request.

## Contrato interno del evento

Los eventos `PHASE1_066_PRODUCT_REQUEST_TRACE` contienen exclusivamente:

```text
component
diagnosticId
stage
elapsedMs
result
traceId
```

`elapsedMs` se normaliza como entero no negativo. Componentes, stages y
resultados se validan contra allowlists. El logger solo recibe el evento ya
reducido y cualquier fallo de observabilidad se absorbe para no alterar el
flujo observado.

## Sanitización

El contexto no recibe el request, JWT, Authorization, claims, identidad,
headers, IP, cookies, query, URL Dataverse, payload, respuesta, error original
ni dato Product/Customer. La prueba dedicada exige las seis keys exactas y
comprueba que tokens sintéticos, identidad y detalle de red no alcancen los
eventos.

La observabilidad existente Dataverse permanece separada. En un rechazo de
fetch, `DATAVERSE_FETCH_COMPLETED/FAIL` complementa —sin reemplazar—
`DATAVERSE_NETWORK_ERROR` y su `NETWORK_*` vigente. La clasificación
`invalid_response` y los demás diagnósticos no cambian.

## Aislamiento y comportamiento preservado

- Customer Master no crea ni recibe contexto Phase1-066.
- No se instrumentan globalmente Dataverse Client ni Entra Token Provider; los
  checkpoints solo se emiten cuando Product propaga explícitamente el contexto.
- No cambian HTTP, CORS, JWT, autorización, rate limiting, paginación, retry,
  mappings, filtros, consolidación, FormattedValue, `fechaStr`, precios o
  conflictos.
- `VITE_PRODUCT_SOURCE=local` continúa como default y Product Dataverse no está
  activado como fuente normal.
- El smoke frontend permanece en 35 000 ms y el fetch Dataverse en 30 000 ms.

## Archivos

Productivos:

- `server/src/observability/productRequestTrace.js`.
- `server/src/app/createApp.js`.
- `server/src/routes/productRoutes.js`.
- `server/src/modules/products/productService.js`.
- `server/src/integrations/dataverse/productPriceLevelGateway.js`.
- `server/src/integrations/dataverse/dataverseClient.js`.

Pruebas:

- `server/tests/productRequestTrace.node-test.js`.

Documentación:

- `docs/prompts/Phase1-066-TraceProductRequestExecutionPath.md`.
- `docs/knowledge/ARCHITECTURE_STATE.md`.
- `docs/knowledge/ROADMAP.md`.
- `docs/knowledge/CHANGELOG.md`.
- `logs/Phase1-066-TraceProductRequestExecutionPath.log` (local y excluido de Git).

## Validaciones

- Focalizadas Product API/auth/Product Service/Gateway/Dataverse/Customer:
  86/86 aprobadas.
- Backend completo: 110/110 aprobadas.
- Backend syntax check: aprobado.
- Frontend completo: 32 archivos y 344/344 pruebas aprobadas.
- Build frontend: aprobado con Vite 5.4.21 y 1 683 módulos transformados.
- `git diff --check`: aprobado.
- `logs/` confirmado excluido mediante `.gitignore`.

## Temporalidad y reversión

La instrumentación es temporal y debe retirarse cuando una ejecución
autorizada identifique la etapa/categoría de causa raíz. La reversión elimina
el módulo de trace, sus argumentos internos, checkpoints, prueba dedicada y
entradas documentales Phase1-066; no requiere migración ni cambio externo.

## Siguiente acción exacta

Solicitar autorización separada para crear el checkpoint y desplegar
exclusivamente esta instrumentación temporal. No ejecutar smoke productivo ni
activar Product Dataverse como parte de esa solicitud.

No hubo commit, push, deploy, smoke productivo ni cambios en Vercel, Render,
Dataverse, Entra o variables.

Prompt ejecutado: Phase1-066 — Trace Product Request Execution Path
