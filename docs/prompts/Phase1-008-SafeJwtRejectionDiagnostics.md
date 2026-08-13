# Phase1-008 — Safe JWT Rejection Diagnostics

## Objetivo aprobado

Diagnosticar de forma segura la etapa exacta que rechaza el JWT delegado en la
Customer API de Render después del `401 / AUTHENTICATION_REQUIRED` observado en
el smoke autenticado Phase1-007, sin modificar validación, política de seguridad,
contratos HTTP, configuración, fuentes o acceso a Dataverse.

## Implementación

`createCustomerApiAuthenticator()` conserva el orden y los errores públicos
vigentes. Agrega un logger diagnóstico opcional e inyectable que recibe únicamente
un identificador normalizado. El logger productivo escribe un prefijo fijo y ese
identificador; nunca recibe request, header Authorization, access token, error de
`jose`, payload, claims, identidad o secreto.

Los errores de verificación `jose` se clasifican sólo mediante propiedades de
control seguras (`code` y, para validación de claims, `claim=aud|iss`). Cualquier
caso no reconocido usa el fallback `JWT_VERIFICATION_REJECTED`. Un fallo del
propio logger se ignora para que el comportamiento de autenticación no dependa
de la observabilidad.

## Identificadores internos

- `JWT_MISSING_BEARER`
- `JWT_AUDIENCE_REJECTED`
- `JWT_ISSUER_REJECTED`
- `JWT_EXPIRED`
- `JWT_SIGNATURE_REJECTED`
- `JWT_VERIFICATION_REJECTED`
- `JWT_TENANT_MISMATCH`
- `JWT_SCOPE_MISSING`

Estos identificadores sólo aparecen en logs internos. Las respuestas continúan
usando `401 / AUTHENTICATION_REQUIRED` o `403 / INSUFFICIENT_SCOPE` con los mismos
mensajes públicos.

## Cobertura de seguridad

Las pruebas automatizadas demuestran que:

- Bearer ausente conserva el contrato público 401 y registra sólo
  `JWT_MISSING_BEARER`.
- Firma, expiración, issuer, audience, tenant y scope generan el identificador
  interno correspondiente sin modificar los errores públicos.
- Un token malformado usa el fallback seguro sin registrar su contenido.
- El logger productivo por defecto no incluye el token completo, el texto
  `Authorization`, el valor Bearer, `oid`, `sub`, username/email, claims completos
  ni un marcador de secret incluido deliberadamente en el token de prueba.

## Archivos del hito

- `server/src/auth/customerApiAuthenticator.js`.
- `server/tests/customerApiSecurity.node-test.js`.
- `docs/prompts/Phase1-008-SafeJwtRejectionDiagnostics.md`.
- `docs/knowledge/ARCHITECTURE_STATE.md`.
- `logs/Phase1-008-SafeJwtDiagnostics.log`, evidencia local excluida de Git.

## Validación

- Backend: 42/42 pruebas aprobadas.
- Backend build/syntax check: aprobado.
- Frontend: 255/255 pruebas aprobadas en 24 archivos.
- Frontend build: aprobado con Vite 5.4.21 y 1675 módulos transformados.
- `git diff --check`: aprobado.

## Siguiente acción exacta

Desplegar de forma autorizada esta versión del backend en Render, repetir en
Vercel el smoke `?phase1-007-smoke=1` con una sesión MSAL real y revisar los
Application Logs de Render para capturar únicamente el identificador
`[CustomerApiAuthenticator] JWT_*`. No activar `VITE_CUSTOMER_SOURCE=dataverse`
ni ejecutar una consulta Dataverse en esta reproducción.

## Reversión

Retirar el logger, la normalización y las aserciones diagnósticas agregadas por
este hito. Los errores públicos y el flujo JWT previo no requieren migración ni
cambio de configuración para restaurarse.
