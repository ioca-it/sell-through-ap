# Phase1-059 — Diagnose Render to Dataverse Network Failure

## Estado

**PASS — NETWORK CATCH ISOLATED / SAFE TRANSPORT CLASSIFICATION ADDED /
PHASE1-057 TRANSPORT REGRESSION DISCARDED / PRODUCTIVE CAUSE PENDING / NOT
DEPLOYED / NOT ACTIVATED.**

## Objetivo ejecutado

Determinar el origen exacto de `DATAVERSE_NETWORK_ERROR` y agregar
observabilidad mínima para separar fallos de transporte sin modificar lógica
Product, autenticación, variables, infraestructura ni datos externos.

## Punto exacto y alcance del catch anterior

El evento nacía en el catch general de `retrievePage()` dentro de
`server/src/integrations/dataverse/dataverseClient.js`. Después de resolver
`await tokenProvider.getToken()`, el código asignaba
`dataverseRequestStarted=true`; cualquier excepción posterior distinta de
`DataverseRequestError` emitía `createDataverseNetworkDiagnostic()`.

Ese catch agrupaba:

- rechazo de fetch por TypeError, DNS, TLS, socket, reset o código de red;
- aborto producido por AbortController y expiración del timer;
- error con código seguro de URL inválida si llegaba desde fetch;
- errores desconocidos lanzados por fetch;
- incorrectamente, errores de preparación posteriores al token, como
  anotaciones inválidas al construir el header `Prefer`.

No agrupaba el fallo de token: la bandera se activaba solo después de que
`getToken()` resolvía. Tampoco atrapaba una `DV_BASE_URL` inválida en el arranque
ni un Entity Set inválido, porque ambos fallaban antes de entrar en ese catch.
Por ello los dos eventos productivos históricos demuestran que el token backend
ya se había adquirido, pero no permiten elegir una causa de transporte.

## Frontera token/fetch implementada

`retrievePage()` conserva el orden:

1. adquirir token backend mediante Entra Token Provider;
2. preparar headers internos;
3. ejecutar fetch Dataverse;
4. clasificar Response HTTP o parse/shape.

Solo el catch estrecho alrededor de `fetchImpl` emite ahora
`DATAVERSE_NETWORK_ERROR`. Un fallo de token no ejecuta fetch, no genera ese
evento y conserva su normalización/auth vigente. No se modificó la adquisición,
cache, scope, credenciales ni request OAuth.

## Clasificación sanitizada

Cada rechazo de fetch se reduce a una de estas categorías:

- `NETWORK_TIMEOUT`: el timer interno disparó AbortController;
- `NETWORK_ABORTED`: AbortError/ABORT_ERR sin disparo del timer;
- `NETWORK_FETCH_FAILED`: TypeError o código de transporte allowlisted;
- `NETWORK_INVALID_URL`: código técnico `ERR_INVALID_URL`;
- `NETWORK_UNKNOWN`: rechazo sin una señal técnica conocida.

La clasificación usa únicamente tipo/clase, nombre, códigos seguros y el
estado interno del timer. El evento permite solo:

- `networkCategory`;
- `timeoutConfiguredMs`;
- `tokenAcquired`;
- `baseUrlConfigured`;
- `baseUrlProtocolValid`.

No registra message o stack originales, URL/host/query, Entity Set, filtros,
tokens, Authorization, secretos, tenant, client id, payload, Product data o
SKU. El error HTTP público continúa siendo el genérico existente.

## Configuración y timeout

`loadEnvironment()` exige `DV_BASE_URL`, la parsea con `URL`, exige HTTPS y
conserva solo su origin. El mismo valor normalizado se entrega al Entra Token
Provider para derivar scope y al Dataverse Client para construir requests. Una
configuración inválida impide el arranque, por lo que no explica dos ejecuciones
recibidas por un servicio Render Live.

El timeout Dataverse Client permanece en **10 000 ms**. En cada página crea un
AbortController; el timer comienza antes de `getToken()`, marca internamente el
timeout, aborta la señal entregada a fetch y se limpia en `finally`. No se
aumentó ni movió el timer. El Entra Token Provider mantiene otro timeout
independiente de 10 000 ms para su propio fetch OAuth.

`createCustomerApi()` construye un único Dataverse Client y lo inyecta tanto en
Product Price Level Gateway como en Account Customer Gateway. Por tanto, la
misma ventana afecta las consultas Product y Customer. Un timeout puede
explicar técnicamente ausencia de Response si el fetch no responde dentro de
la ventana, pero los eventos históricos no contienen evidencia suficiente para
confirmarlo.

## Comparación Phase1-057

La comparación local de `791c8b7^` con Phase1-057 (`791c8b7`) muestra que ese
hito añadió exclusivamente lectura derivada de Content-Type/shape después de
una respuesta y campos del evento `invalid_response`. No cambió:

- llamada a fetch;
- AbortController o timer;
- headers;
- condiciones `response.ok`;
- llamada funcional a `response.json()`;
- aceptación de `payload.value`;
- paginación.

Conclusión: Phase1-057 **NO** introdujo una regresión de transporte capaz de
explicar la transición HTTP 200 → network error. Su observabilidad
`invalid_response` permanece cubierta cuando existe un HTTP 200.

## Pruebas

La cobertura nueva demuestra:

1. fetch exitoso sin network error;
2. TypeError → `NETWORK_FETCH_FAILED`;
3. timer/AbortController → `NETWORK_TIMEOUT`;
4. AbortError no asociado al timer → `NETWORK_ABORTED`;
5. `ERR_INVALID_URL` → `NETWORK_INVALID_URL` y base URL inválida local segura;
6. rechazo desconocido → `NETWORK_UNKNOWN`;
7. token adquirido antes de fetch;
8. fallo de token sin fetch ni diagnóstico de red;
9. ausencia de URL, token, Authorization, message y stack en eventos;
10. Product API/Product Gateway sin regresión;
11. Customer API/Account Gateway sin regresión;
12. `invalid_response` Phase1-057 disponible para HTTP 200 parse/shape inválido.

Resultados:

- focalizadas Dataverse/token/config/Product/Customer: 86/86;
- backend completo: 103/103;
- backend build: `Backend syntax check passed.`;
- frontend completo: 342/342 en 32 archivos;
- frontend build: Vite 5.4.21, 1683 módulos transformados;
- `git diff --check`: aprobado;
- `git status --short`: solo archivos documentados de Phase1-059; log excluido.

## Archivos

### Creados

- `docs/prompts/Phase1-059-DiagnoseRenderDataverseNetworkFailure.md`;
- `logs/Phase1-059-DiagnoseRenderDataverseNetworkFailure.log` (local y excluido
  de Git).

### Modificados

- `server/src/integrations/dataverse/dataverseClient.js`;
- `server/tests/dataverseClient.node-test.js`;
- `server/tests/dataverseDiagnostics.node-test.js`;
- `docs/knowledge/ARCHITECTURE_STATE.md`;
- `docs/knowledge/DATA_SOURCES.md`;
- `docs/knowledge/ROADMAP.md`;
- `docs/knowledge/CHANGELOG.md`.

## Preservado

No cambian `productpricelevels`, `crbbe_urlproducto`, mappings Product, filtros
de compañía, pivot USA/CHINA, precio null/0, conflictos, FormattedValue,
`fechaStr`, contratos Product/Customer, MSAL, JWT, `VITE_PRODUCT_SOURCE`,
frontend, Render/Vercel/Entra ni Dataverse.

No hubo commit, push, deploy, smoke productivo, cambio de variables ni cambio
externo. La reversión local consiste en retirar el diff de Phase1-059; no
requiere modificar configuración o fuentes.

## Causa productiva y siguiente acción exacta

La causa productiva concreta sigue **pendiente**: la evidencia histórica solo
prueba que el token se adquirió y fetch no entregó una Response; no distingue
timeout, aborto, DNS/TLS/socket, URL o rechazo desconocido.

Después de revisión y autorización separada: crear checkpoint, desplegar
exclusivamente el backend instrumentado y, una vez Live, ejecutar una única
revalidación Product autenticada para capturar `networkCategory` y los cuatro
indicadores seguros. No ejecutar otro smoke antes de ese deploy, no cambiar
variables y mantener `VITE_PRODUCT_SOURCE=local`.

Prompt ejecutado: Phase1-059 — Diagnose Render to Dataverse Network Failure
