# Phase1-004 — Secure Customer API

## Objetivo aprobado

Corregir los hallazgos obligatorios de la auditoría Claude de Phase1-003 antes
de configurar credenciales reales o desplegar: autenticación propia de Customer
API, rate limiting, health check y respuesta 400 para códigos URL malformados.

## Arquitectura de autenticación

```text
React/Vite
  -> getAccessToken (abstracción; futura integración MSAL)
    -> Microsoft Entra ID
      -> Access Token JWT delegado
        -> Customer API
          -> validación JWT/JWKS
            -> Customer Service
              -> Dataverse Gateway
                -> OAuth client_credentials separado
                  -> Dataverse
```

La identidad Usuario→API usa `AUTH_*`. La integración API→Dataverse conserva
`DV_*`. `DV_CLIENT_SECRET` nunca autentica al frontend y ningún secreto/token se
registra o devuelve.

## Validación JWT

`customerApiAuthenticator.js` usa `jose` para:

- obtener/cachear JWKS remoto de Microsoft Entra ID;
- validar firma RS256;
- validar issuer del tenant, audience, expiración y claim `tid`;
- exigir el scope delegado configurado;
- responder 401 ante ausencia/token inválido o expirado;
- responder 403 cuando falta el scope.

La dependencia `jose` 6.2.4 se incorpora porque es una implementación estándar
y mantenida de JOSE/JWT/JWKS, compatible con ESM y sin dependencias transitivas.
No se implementa criptografía propia.

## Rutas y controles

- `GET /api/customers/search`: JWT obligatorio.
- `GET /api/customers/:customerCode`: JWT obligatorio.
- `GET /health`: anónimo, responde `{ "status": "ok" }`, sin Auth, Customer,
  Entra o Dataverse.
- OData arbitrario continúa bloqueado.
- Percent-encoding inválido en `customerCode` devuelve 400 controlado.
- CORS continúa por allowlist y admite la cabecera `Authorization`; no reemplaza
  autenticación.

## Rate limiting

Customer API aplica límite por IP antes de validar el JWT y, cuando existe una
identidad válida, también por `oid/sub`. Los límites provienen de
`RATE_LIMIT_WINDOW_MS` y `RATE_LIMIT_MAX_REQUESTS`; una solicitud excedida
recibe 429 y `Retry-After`.

El store in-memory es inyectable y solo se aprueba para una instancia temporal.
Antes de escala horizontal/Azure debe sustituirse por un contador distribuido.
`/health` no consume rate limit.

## Frontend

Dataverse Customer Provider recibe `getAccessToken()` por inyección y adjunta
`Authorization: Bearer <token>`. App usa una abstracción neutral actualmente no
configurada; integrar MSAL requerirá únicamente implementar adquisición de token
sin cambiar Customer Repository, Customer Master Service o UI.

## Variables nuevas

```text
AUTH_TENANT_ID
AUTH_API_CLIENT_ID
AUTH_REQUIRED_SCOPE
RATE_LIMIT_WINDOW_MS
RATE_LIMIT_MAX_REQUESTS
```

Permanecen independientes de `DV_TENANT_ID`, `DV_CLIENT_ID`,
`DV_CLIENT_SECRET` y `DV_BASE_URL`.

## Límites

No se configuran IDs, scopes, secretos o tokens reales. No se integra MSAL, no
se despliega Render/Azure/Vercel y no se modifica Maestro Producto, Inventario
Cliente, Configuration Center, motores, fórmulas o reglas AP01.

## Validación

```text
npm test -- --run
npm run build
cd server && npm test
cd server && npm run build
git diff --check
git status --short
```
