# Phase1-007 — Authenticated API Smoke Test

## Objetivo aprobado

Preparar una validación controlada del flujo autenticado desde SellThrough-Web
en Vercel hacia la Customer API temporal en Render, reutilizando MSAL y la
abstracción `getAccessToken()` existente, sin activar el Customer Provider
Dataverse, modificar infraestructura ni desplegar.

## Endpoint autenticado seleccionado

```text
GET https://sell-through-ap-api.onrender.com/api/customers/search?type=code
Authorization: Bearer <access-token>
Origin: https://sell-through-ap.vercel.app
```

La ausencia intencional de `q` convierte esta ruta existente en el probe mínimo
y seguro. El backend aplica CORS, rate limit y `authenticator.authenticate()`
antes de delegar en Customer Routes. Con audience, issuer, tenant, firma,
expiración y scope aceptados, `customerService.search()` rechaza el request con
`400 / INVALID_CUSTOMER_REQUEST` antes de invocar Account Customer Gateway,
Dataverse Client o el flujo API→Dataverse.

No se seleccionó `/health` porque es anónimo y no valida JWT. Tampoco se usa una
búsqueda Customer válida, porque ésta continuaría hacia Dataverse y mezclaría
dos fronteras independientes en un único resultado.

## Arnés temporal frontend

`src/auth/authenticatedApiSmokeTest.js` expone un caso de prueba controlado que:

1. procesa la sesión mediante `initializeAuthentication()`;
2. reutiliza `getAccessToken()` de `customerApiAccessToken.js`, que ejecuta
   `acquireTokenSilent` con `VITE_AUTH_API_SCOPE`;
3. envía exclusivamente `Authorization: Bearer <access-token>` a la ruta de
   control;
4. descarta el token al terminar la función y no lo imprime, devuelve ni
   persiste manualmente;
5. reporta solamente endpoint, etapas, status HTTP y código público de respuesta.

El arnés se ejecuta sólo al abrir una versión que lo contenga con
`?phase1-007-smoke=1`. `src/main.jsx` publica en consola únicamente el resultado
sanitizado. Sin ese query parameter, no realiza requests ni altera el arranque o
la UI. Su reversión consiste en eliminar el módulo, su prueba y el bloque
temporal de `src/main.jsx`.

## Interpretación por etapas

| Etapa | Evidencia independiente |
| --- | --- |
| Autenticación MSAL | `initializeAuthentication()` devuelve una cuenta activa o cacheada por MSAL. |
| Access token | `getAccessToken()` devuelve un valor no vacío después de `acquireTokenSilent`; el valor no forma parte del resultado. |
| JWT aceptado por Render | `400 / INVALID_CUSTOMER_REQUEST`, generado después de autenticación y antes de Customer Gateway. |
| JWT rechazado por Render | `401 / AUTHENTICATION_REQUIRED` o `403 / INSUFFICIENT_SCOPE`. |
| Dataverse | `not_requested` en este probe; requiere una validación posterior separada y autorizada. |

Un `200` de `/health` no valida autenticación. Un `400 / INVALID_CUSTOMER_REQUEST`
valida la frontera usuario→Render, pero no demuestra conectividad, permisos,
mapping ni datos de Dataverse.

## Resultado alcanzado

- Preparación local: implementada y cubierta por cinco pruebas dedicadas.
- Control externo de disponibilidad: `/health` respondió `200`.
- Control externo negativo: la ruta seleccionada sin Bearer respondió
  `401 / AUTHENTICATION_REQUIRED` desde Render.
- Smoke test autenticado real: pendiente. No se ejecutó deploy y el entorno CLI
  no dispone de la sesión interactiva del usuario en Vercel ni extrae tokens del
  cache MSAL.
- Acceso Dataverse: no solicitado ni declarado exitoso.

Para completar el smoke real se requiere que una versión autorizada que incluya
el arnés esté disponible en Vercel, iniciar sesión allí y abrir
`https://sell-through-ap.vercel.app/?phase1-007-smoke=1`. El resultado esperado
para esta etapa es `msalAuthentication=authenticated`,
`accessTokenAcquisition=acquired`, `renderJwtValidation=accepted`,
`httpStatus=400`, `responseCode=INVALID_CUSTOMER_REQUEST` y
`dataverseAccess=not_requested`.

## Archivos de implementación

- `src/auth/authenticatedApiSmokeTest.js`.
- `src/auth/__tests__/authenticatedApiSmokeTest.test.js`.
- `src/main.jsx`, únicamente para activación temporal por query parameter.
- `docs/prompts/Phase1-007-AuthenticatedApiSmokeTest.md`.
- `docs/knowledge/ARCHITECTURE_STATE.md`.
- `docs/knowledge/DATA_SOURCES.md`.
- `docs/knowledge/CHANGELOG.md`.
- `logs/Phase1-007-AuthenticatedApiSmokeTest.log`, evidencia local excluida de Git.

## Reglas preservadas

- `VITE_CUSTOMER_SOURCE=local` permanece sin cambios en `.env.local` y
  `.env.example`.
- No se modifica el Provider seleccionado, Customer Repository, Customer Master
  Application Service, backend, infraestructura, Entra, Render o Vercel.
- No se introduce client secret frontend ni almacenamiento manual de tokens.
- No se ejecuta una consulta Dataverse ni se modifica AP01, UI, reglas,
  fórmulas, defaults, contratos o fuentes del flujo sell-through.
- No se realiza deploy, commit, push, merge, tag o cambio de rama.

## Validación local

- `npm test -- --run`: 255/255 pruebas aprobadas en 24 archivos.
- `npm run build`: aprobado con Vite 5.4.21 y 1675 módulos transformados.
- Backend `npm test`: 41/41 pruebas aprobadas como validación adicional del contrato existente.
- Backend `npm run build`: syntax check aprobado.
- `git diff --check`: aprobado, exit code 0.
- `git status --short`: sólo muestra los siete archivos versionables de Phase1-007; el log permanece excluido de Git.

## Reversión

Eliminar `authenticatedApiSmokeTest.js`, su prueba y el bloque Phase1-007 de
`main.jsx`; revertir las entradas documentales de este hito. No existe cambio de
datos, fuente efectiva, infraestructura o backend que requiera migración.
