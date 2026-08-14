# Phase1-010B — Real Dataverse Customer Smoke Test

## Objetivo aprobado

Extender de forma mínima el arnés autenticado existente para ejecutar una única
búsqueda Customer controlada contra la Customer API desplegada en Render y, una
vez aceptado el JWT, comprobar la frontera API→Dataverse sin activar el Customer
Provider real de la UI.

## Request controlado

```text
GET https://sell-through-ap-api.onrender.com/api/customers/search?type=code&q=CL0000041
Authorization: Bearer <access-token administrado por MSAL>
```

El arnés se activa exclusivamente con `?phase1-010b-smoke=1`. Reutiliza
`initializeAuthentication()` y `getAccessToken()`, envía el Bearer sólo a la
Customer API configurada y no modifica `VITE_CUSTOMER_SOURCE=local` ni el flujo
normal de Maestro Cliente.

## Resultado sanitizado

El objeto publicado por consola contiene únicamente:

- endpoint controlado;
- estado de autenticación MSAL;
- estado de adquisición del access token;
- estado de validación JWT en Render;
- estado de intento de request Dataverse;
- status HTTP;
- cantidad de Customers devueltos;
- diagnóstico estático normalizado, cuando corresponde.

Una respuesta `200` se reduce a `customers.length`; ningún objeto Customer se
conserva en el resultado. Para `401`, `403`, `429` o `5xx` no se lee el body y se
publica sólo un identificador normalizado. Los fallos de red, MSAL o adquisición
de token tampoco exponen el error original.

## Criterio de éxito

```text
msalAuthentication=authenticated
accessTokenAcquisition=acquired
renderJwtValidation=accepted
dataverseRequest=attempted
httpStatus=200
customersReturned>=1
diagnostic=null
```

Este resultado valida el transporte controlado hasta Maestro Cliente en
Dataverse. No activa el Provider Dataverse de la UI ni amplía entidades,
mappings, reglas o fuentes del procesamiento sell-through.

## Archivos del hito

- `src/auth/authenticatedApiSmokeTest.js`.
- `src/auth/__tests__/authenticatedApiSmokeTest.test.js`.
- `src/main.jsx`.
- `docs/prompts/Phase1-010B-RealDataverseCustomerSmokeTest.md`.
- `docs/knowledge/ARCHITECTURE_STATE.md`.
- `docs/knowledge/DATA_SOURCES.md`.
- `logs/Phase1-010B-RealDataverseCustomerSmokeTest.log`, evidencia local excluida de Git.

## Seguridad preservada

- El access token permanece administrado por MSAL y nunca forma parte del resultado.
- No se persisten manualmente access tokens ni respuestas Customer.
- Consola y log no incluyen payloads Customer, claims, headers o secretos.
- `VITE_CUSTOMER_SOURCE` permanece en `local`.
- La ejecución normal de la UI no dispara el request controlado.

## Validación

- `npm test -- --run`: 258/258 pruebas aprobadas en 24 archivos.
- `npm run build`: aprobado con Vite 5.4.21 y 1675 módulos transformados.
- `git diff --check`: aprobado.
- `git status --short`: limitado a los archivos versionables de Phase1-010B;
  el log permanece excluido por `.gitignore`.

## Siguiente acción exacta

Desplegar de forma autorizada en Vercel una versión que contenga este arnés,
iniciar sesión con MSAL y abrir
`https://sell-through-ap.vercel.app/?phase1-010b-smoke=1`. Revisar únicamente el
objeto sanitizado `Phase1-010B Real Dataverse Customer Smoke Test` en consola.
No cambiar `VITE_CUSTOMER_SOURCE=local`.

## Reversión

Restaurar el endpoint y trigger temporales anteriores del arnés, sus pruebas y
el bloque descriptivo de `main.jsx`. No existe migración de datos, configuración
de fuente o cambio backend que revertir.
