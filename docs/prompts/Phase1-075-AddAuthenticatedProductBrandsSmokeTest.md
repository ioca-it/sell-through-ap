# Phase1-075 — Add Authenticated Product Brands Smoke Test

## Estado

**PASS — TEMPORARY AUTHENTICATED PRODUCT BRANDS SMOKE IMPLEMENTED / SANITIZED /
FRONTEND-ONLY / NOT DEPLOYED / NOT EXECUTED / PRODUCT SOURCE UNCHANGED.**

## Objetivo ejecutado

Se agregó un arnés temporal y aislado para medir una única llamada autenticada
a `GET /api/products/brands` contra el backend portable y Dataverse real una
vez que exista autorización separada. El arnés no pasa por Product Provider
Factory y no activa Product Dataverse como fuente normal.

## Trigger y flujo

El launcher se inicia exclusivamente cuando el query contiene el valor exacto:

```text
?phase1-075-brands-smoke=1
```

Sin ese valor retorna antes de inicializar MSAL, adquirir token o ejecutar
`fetch`. El flujo preparado es:

```text
Vercel
  -> initializeAuthentication / sesión MSAL existente
    -> getAccessToken / token delegado
      -> GET Render /api/products/brands
        -> JWT Authenticator / Rate Limiter
          -> Product Service
            -> Product Price Level Gateway
              -> Dataverse Client -> productpricelevels
                -> resumen sanitizado en consola
```

El frontend usa `VITE_API_BASE_URL` únicamente para construir el endpoint
funcional y reutiliza `initializeAuthentication()` y `getAccessToken()`; no
duplica ni interpreta JWT, claims o cuentas. Envía `Authorization: Bearer`
exclusivamente al request y nunca lo publica.

## Timeout y cleanup

El timeout temporal del smoke es **35 000 ms**. Se crea un
`AbortController`, se pasa su señal al único `fetch`, se aborta al vencer y el
timer se limpia siempre. `REQUEST_TIMEOUT` no conserva detalles del error.

No se modificaron el timeout Product Provider de 35 000 ms, el fetch backend
Dataverse de 30 000 ms ni el Customer Provider de 10 000 ms.

## Resultado allowlisted

El objeto de consola se construye explícitamente con cinco campos:

```text
httpStatus
renderJwtValidation
dataverseRequest
diagnostic
brandsReturned
```

Para HTTP 200 con `brands` array, `brandsReturned` cuenta únicamente elementos
string y `brands=[]` produce `0`. El array y sus valores no forman parte del
resultado. JSON inválido o shape sin array produce `INVALID_RESPONSE`.

Los demás diagnósticos reutilizan la taxonomía segura del smoke Product:
`SESSION_REQUIRED`, `MSAL_AUTHENTICATION_FAILED`,
`ACCESS_TOKEN_ACQUISITION_FAILED`, `ACCESS_TOKEN_NOT_ACQUIRED`,
`AUTHENTICATION_REJECTED`, `AUTHORIZATION_REJECTED`, `RATE_LIMITED`,
`DATAVERSE_REQUEST_FAILED`, `NETWORK_REQUEST_FAILED`, `REQUEST_TIMEOUT`,
`INVALID_RESPONSE`, `UNEXPECTED_RESPONSE` y
`SMOKE_CONFIGURATION_INVALID` según corresponda.

No se registran marcas, Product data, SKU, precios, URL, token, Authorization,
claims, headers, payload backend, next link, query OData, cuenta MSAL, correo,
`oid/sub` o PII. El launcher usa `console.info`; `console.log` no recibe datos.

## Tracing esperado

Una ejecución futura autorizada debe provocar la instrumentación backend ya
vigente sin devolverla al frontend:

```text
PHASE1_066_PRODUCT_REQUEST_TRACE operation=PRODUCT_BRANDS
PHASE1_068_PRODUCT_PAGINATION_TRACE operation=PRODUCT_BRANDS
```

La evidencia posterior debe capturar desde Render `pageNumber`,
`recordsReturned`, `hasNextLink`, `cumulativeRecords`, `totalPages`,
`totalRecords` y `totalFetchElapsedMs`. Phase1-075 no cambia esos eventos ni
los envía al navegador.

## Alcance preservado

- `VITE_PRODUCT_SOURCE` continúa en `local` y no se modificó ninguna variable.
- Product Provider Factory y el flujo Product normal no participan del smoke.
- Product Master smoke Phase1-042 y Customer smoke Phase1-010B no cambiaron.
- Backend, endpoint, contracts, query, tracing, paginación, filtros, mappings y
  timeouts no cambiaron.
- No se añadió cache, `$apply/groupby`, optimización ni acceso directo a OData.

El arnés es temporal y debe retirarse después de completar el diagnóstico
autorizado. La reversión consiste en eliminar su módulo/prueba y la llamada
aislada de `main.jsx`; no requiere cambios backend, de datos o externos.

## Pruebas y validaciones

- Smokes focalizados Product Brands/Product Master/Customer: **49/49 PASS** en
  3 archivos; el nuevo arnés aporta 21 casos.
- Frontend completo: **381/381 PASS** en 33 archivos.
- Build frontend: **PASS**, Vite 5.4.21, 1 684 módulos transformados.
- Backend: no ejecutado porque ningún archivo backend fue afectado.
- `git diff --check`: **PASS**.

Las pruebas cubren trigger exacto/ausente, aislamiento entre smokes, sesión,
token delegado, GET y Authorization, 35 s, AbortController/cleanup, conteo y
array vacío, 401/403/429/5xx, red, timeout, JSON/shape inválidos y allowlist de
consola sin contenido sensible. La suite completa valida la regresión de
Product normal y Customer.

## Archivos

Creados:

- `src/auth/productBrandsSmokeTest.js`.
- `src/auth/__tests__/productBrandsSmokeTest.test.js`.
- `docs/prompts/Phase1-075-AddAuthenticatedProductBrandsSmokeTest.md`.
- `logs/Phase1-075-AddAuthenticatedProductBrandsSmokeTest.log` (local y
  excluido de Git).

Modificados:

- `src/main.jsx`.
- `docs/knowledge/ARCHITECTURE_STATE.md`.
- `docs/knowledge/ROADMAP.md`.
- `docs/knowledge/CHANGELOG.md`.

## Siguiente acción exacta

Solicitar autorización separada para checkpoint/deploy. Solo después de que el
cambio esté Live, ejecutar una única vez
`?phase1-075-brands-smoke=1`, capturar la evidencia sanitizada frontend y los
eventos backend de request/paginación, y retirar el arnés mediante otro cambio
autorizado al concluir el diagnóstico.

No hubo commit, push, deploy, smoke productivo, activación Product Dataverse ni
cambios en Render, Vercel, Entra, Dataverse o variables externas.

Prompt ejecutado: Phase1-075 — Add Authenticated Product Brands Smoke Test
