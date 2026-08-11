# Phase1-003 — Real Customer Transport

## Objetivo aprobado

Conectar la frontera de Maestro Cliente con Dataverse mediante una API backend
segura y portable. Render es el alojamiento temporal; Azure es el objetivo y no
forma parte de esta implementación.

## Arquitectura implementada

```text
Vercel UI
  -> Customer Master Application Service
    -> Customer Repository
      -> Dataverse Customer Provider (HTTP, VITE_API_BASE_URL)
        -> Customer API portable

API Backend portable
  -> Customer Routes
    -> Customer Service
      -> Account Customer Gateway
        -> Dataverse Client
          -> Entra Token Provider
            -> Microsoft Entra ID / Dataverse
```

El frontend solo recibe el contrato público:

```js
{
  customerCode,
  customerName,
  country,
}
```

Los nombres físicos `accounts`, `new_codigocliente`, `name` y
`crbbe_nombrepais` están confinados al gateway de integración Dataverse del
backend.

## API Customer

- `GET /api/customers/search?type=code&q=<value>`
- `GET /api/customers/search?type=name&q=<value>`
- `GET /api/customers/:customerCode`

Las rutas rechazan parámetros distintos de los publicados y bloquean
explícitamente `$filter`, `$select`, `$orderby` y `$top` recibidos del cliente.
El gateway aplica select, filtro, orden y límite internamente, con escape de
comillas OData.

## Seguridad

- OAuth 2.0 `client_credentials` contra Microsoft Entra ID.
- Scope derivado del origen de `DV_BASE_URL` como `<origin>/.default`.
- Token en memoria con expiración anticipada por margen de seguridad.
- Timeout y errores normalizados en Entra y Dataverse.
- CORS por `ALLOWED_ORIGINS`; wildcard rechazado.
- Sin secretos, tokens, nombres Dataverse ni OData en frontend.
- Sin logs de credenciales o respuestas técnicas sensibles.

## Portabilidad

El backend usa Node.js y `fetch` nativos, sin SDK ni dependencia de hosting. La
única pieza de arranque es `server/src/index.js`; configuración, handler HTTP e
integraciones pueden alojarse en Render o Azure sin cambiar Domain, Repository,
Application Service o contrato frontend.

## Configuración manual pendiente

Backend:

```text
DV_TENANT_ID
DV_CLIENT_ID
DV_CLIENT_SECRET
DV_BASE_URL
ALLOWED_ORIGINS
PORT
```

Frontend:

```text
VITE_API_BASE_URL
```

También permanecen pendientes el registro/aplicación Entra, el secreto real,
los permisos de lectura sobre `accounts`, los despliegues Render/Vercel y una
prueba smoke contra Dataverse real.

## Límites preservados

No se modifica Maestro Producto, Inventario Cliente, Configuration Center,
Inventory Engine, EOL Engine, fórmulas, reglas AP01 ni contratos Customer,
Repository o Application Service existentes. No se implementa Azure ni se
realiza commit, push o despliegue.

## Validación

```text
npm test -- --run
npm run build
cd server && npm test
cd server && npm run build
git diff --check
git status --short
```
