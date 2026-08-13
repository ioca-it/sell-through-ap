# Phase1-005 — MSAL Frontend Integration

## Objetivo aprobado

Integrar Microsoft Entra ID en React/Vite mediante `@azure/msal-browser`,
adquirir el token delegado de SellThrough-API desde la abstracción
`getAccessToken()` existente y exponer controles discretos de inicio/cierre de
sesión, sin activar todavía el Customer Provider Dataverse.

## Configuración frontend

```text
VITE_AUTH_TENANT_ID
VITE_AUTH_CLIENT_ID
VITE_AUTH_API_SCOPE
VITE_API_BASE_URL
VITE_CUSTOMER_SOURCE=local
```

Los IDs, el scope y la URL se resuelven únicamente desde variables Vite. El
redirect y el post-logout redirect usan el origen actual del navegador, que
corresponde a los redirect URI registrados en Entra. SellThrough-Web es un
cliente público SPA y no usa client secret.

## Arquitectura implementada

```text
AuthenticationControls
  -> authenticationService
    -> msalClient / msalConfig
      -> Microsoft Entra ID

Dataverse Customer Provider
  -> getAccessToken
    -> initialize + handleRedirectPromise
      -> cuenta activa o primera cuenta cacheada por MSAL
        -> acquireTokenSilent(scope SellThrough-API)
          -> Bearer hacia Customer API
```

Si no existe cuenta válida o MSAL devuelve un error que requiere interacción,
se ejecuta `loginRedirect()` con `VITE_AUTH_API_SCOPE`. Los tokens permanecen
administrados por MSAL en `sessionStorage`; no existe almacenamiento manual de
access tokens ni `localStorage` propio.

## Archivos de implementación

- `src/auth/msalConfig.js`: validación y composición de configuración pública.
- `src/auth/msalClient.js`: cliente único, inicialización y resolución de cuenta.
- `src/auth/authenticationService.js`: inicio, recuperación y cierre de sesión.
- `src/auth/customerApiAccessToken.js`: adquisición silenciosa y fallback interactivo.
- `src/auth/AuthenticationControls.jsx`: estado de cuenta y acciones UI.
- `src/App.jsx`: incorporación discreta de los controles en el header.
- `.env.example` y `.env.local`: configuración frontend confirmada; fuente Customer local preservada.

## Reglas y contratos preservados

- `VITE_CUSTOMER_SOURCE` permanece en `local`; no se activa tráfico Customer real.
- El Provider Dataverse conserva la inyección de `getAccessToken()` y es el único
  responsable de adjuntar `Authorization: Bearer`.
- Customer Repository, Customer Master Application Service, contrato Customer,
  backend, mappings Dataverse, reglas, fórmulas y defaults no cambian.
- No se crea ni se consume client secret para SellThrough-Web.

## Riesgos y pendientes

- Falta configurar las mismas variables públicas en Vercel y ejecutar un smoke
  test autorizado contra Entra, Render y Dataverse reales.
- La Customer API temporal debe mantener audience/scope, CORS y redirect URI
  coherentes con los registros Entra confirmados.
- Cambiar `VITE_CUSTOMER_SOURCE` a `dataverse` requiere autorización posterior.

## Pruebas y validación

- Configuración MSAL y variables requeridas.
- `acquireTokenSilent`, cuenta activa y scope delegado correcto.
- `loginRedirect` sin sesión y ante interacción requerida.
- Cierre de sesión, identidad visible y acciones de UI.
- Bearer del Provider y funcionamiento del Customer Provider local.
- `npm test -- --run`: 249/249.
- `npm run build`: aprobado con 1674 módulos transformados.
- `git diff --check`: aprobado.

## Reversión

Retirar los módulos y pruebas de `src/auth/` agregados por este hito, restaurar
la abstracción anterior de `getAccessToken()`, remover los controles del header
y eliminar `@azure/msal-browser` de dependencias. La fuente local y los
contratos Customer no requieren migración de datos para revertir.
