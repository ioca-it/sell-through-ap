# Phase1-042 — Prepare Real Dataverse Product Master Smoke Test

## Estado

**PASS — SMOKE PREPARED / NOT EXECUTED / NOT ACTIVATED.**

## Objetivo ejecutado

Preparar un arnés temporal y controlado para validar posteriormente el recorrido
Vercel → MSAL/Entra → token delegado → Render Product API → autenticación
backend → Dataverse → `productpricelevel` → Product Gateway → resumen
sanitizado, sin activar Product Dataverse como fuente normal ni ejecutar ahora
la consulta real.

## Auditoría del contrato Product API

Se reutiliza el endpoint existente:

```text
GET /api/products/master
Authorization: Bearer <token delegado administrado por MSAL>
```

El contrato ya es suficiente y seguro para el smoke-test: no admite parámetros,
rechaza OData/query strings, exige JWT/rate limiter y delega la lectura completa
al Product Service y Product Price Level Gateway. No se creó ni amplió ningún
endpoint público.

## Trigger temporal y aislamiento

```text
?phase1-042-product-smoke=1
```

`src/main.jsx` invoca un launcher que retorna sin efectos cuando el trigger no
está presente. Solo con valor exacto `1` inicializa la autenticación para el
smoke-test, exige una cuenta MSAL válida, adquiere el token mediante
`getAccessToken()` y ejecuta un único GET al Product API configurado por
`VITE_API_BASE_URL`.

El arnés no usa Product Provider Factory, no cambia ni lee
`VITE_PRODUCT_SOURCE`, no persiste respuesta/token y no modifica datos. La
navegación normal y el smoke-test Customer conservan sus rutas independientes.

## Flujo preparado

```text
Vercel + trigger explícito
  -> initializeAuthentication / sesión MSAL
    -> getAccessToken / acquireTokenSilent
      -> GET Render `/api/products/master` con Bearer delegado
        -> JWT Authenticator / Rate Limiter
          -> Product Service
            -> Product Price Level Gateway
              -> Dataverse Client GET/read-only
                -> `productpricelevel`
                  -> resumen sanitizado en consola
```

Product Price Level Gateway conserva sin cambios el filtro backend exclusivo
para `IOCA USA INC` y `SAND SPORTS, CORP.`, mapping, pivot USA/CHINA,
FormattedValue, precios `0|null`, conflicto `PRODUCT_MASTER_CONFLICT` y contrato
Product. `fechaStr` sigue derivándose únicamente en el frontend normal mediante
`normalizeFechaStr`; el smoke-test no modifica esa ruta.

## Resultado sanitizado esperado

```js
{
  httpStatus,
  productsReturned,
  renderJwtValidation,
  dataverseRequest,
  diagnostic,
  hasPriceUSA,
  hasPriceChina,
  hasNullPrice,
  hasFormattedLevel,
  hasFormattedStatus,
}
```

Los booleanos Formatted indican presencia de una etiqueta textual legible/no
numérica en el contrato devuelto; el gateway continúa siendo responsable de
priorizar FormattedValue y bloquear la publicación de códigos Choice numéricos.
Un `priceUSA` o `priceChina` numérico, incluido cero, activa su booleano; un
precio exactamente `null` activa `hasNullPrice`. Cero productos devuelve
`productsReturned: 0` y booleanos `false`.

Se excluyen expresamente SKU, nombres, marcas, categorías, fechas, precios,
URLs, tokens/JWT, claims, headers `Authorization`, Product/Dataverse payload,
LogicalNames, query strings, PII, secretos y errores originales.

## Diagnósticos controlados

| Condición | Diagnóstico |
| --- | --- |
| Sin sesión | `SESSION_REQUIRED` sin adquirir token ni llamar API |
| Fallo de token | `ACCESS_TOKEN_ACQUISITION_FAILED` o `ACCESS_TOKEN_NOT_ACQUIRED` |
| 401 | `AUTHENTICATION_REJECTED` |
| 403 | `AUTHORIZATION_REJECTED` |
| 409 | `PRODUCT_MASTER_CONFLICT` |
| 429 | `RATE_LIMITED` |
| 5xx | `DATAVERSE_REQUEST_FAILED` |
| Red | `NETWORK_REQUEST_FAILED` |
| Timeout | `REQUEST_TIMEOUT` |
| HTTP 200 malformado | `INVALID_RESPONSE` |

Los bodies de error no se leen. El resultado nunca conserva el payload Product
y el launcher atrapa fallos inesperados con un mensaje estático sin detalles.

## Archivos creados

- `src/auth/productMasterSmokeTest.js`.
- `src/auth/__tests__/productMasterSmokeTest.test.js`.
- `docs/prompts/Phase1-042-PrepareRealDataverseProductSmokeTest.md`.
- `logs/Phase1-042-PrepareRealDataverseProductSmokeTest.log` (local y excluido de Git).

## Archivos modificados

- `src/main.jsx`.
- `docs/knowledge/ARCHITECTURE_STATE.md`.
- `docs/knowledge/DATA_SOURCES.md`.
- `docs/knowledge/ROADMAP.md`.
- `docs/knowledge/CHANGELOG.md`.

`BUSINESS_RULES.md` no cambia porque el hito no altera reglas funcionales,
mapping, filtros, precios, conflictos, FormattedValue o `fechaStr`.

## Cobertura

Las pruebas nuevas cubren trigger ausente/presente, navegación normal sin
efectos, sesión ausente, token delegado, GET Product autenticado sin query,
resumen sanitizado, cero productos, 401, 403, 409, 429, 5xx, red, timeout,
respuesta inválida y ausencia de Product payload/token/URLs en el resultado.
La suite completa conserva el smoke-test Customer, Product Provider/Gateway y
el flujo normal de aplicación.

## Riesgos y reversión

La ejecución real puede descubrir permisos, configuración JWT, volumen,
timeout, conflicto o datos incompletos del entorno. Este hito solo prepara la
observación sanitaria; no define precedencias ni corrige datos.

Reversión: eliminar `productMasterSmokeTest.js`, su prueba y la llamada aislada
en `main.jsx`, y retirar las entradas Phase1-042 de documentación. No existe
cambio de configuración, migración o dato que revertir.

## Validaciones

- Frontend tests: 32 archivos, 342/342 pruebas aprobadas.
- Backend tests: 86/86 pruebas aprobadas.
- Frontend build: aprobado con Vite 5.4.21 y 1683 módulos transformados.
- Backend build: aprobado (`Backend syntax check passed.`).
- `git diff --check`: aprobado sin errores.
- `git status --short`: se registra al cierre en el log local.

## Siguiente acción exacta

Con autorización separada, desplegar esta versión en Vercel sin cambiar
`VITE_PRODUCT_SOURCE=local`, iniciar sesión MSAL y abrir una sola vez
`https://sell-through-ap.vercel.app/?phase1-042-product-smoke=1`. Revisar
únicamente el objeto `Phase1-042 Real Dataverse Product Master Smoke Test` de
la consola; no activar todavía la fuente global.

No hubo ejecución del trigger, consulta Dataverse productiva, cambio de
Vercel/Render/Entra/Dataverse, commit, push o deploy.

Prompt ejecutado: Phase1-042 — Prepare Real Dataverse Product Master Smoke Test
