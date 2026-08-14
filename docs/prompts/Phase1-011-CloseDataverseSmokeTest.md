# Phase1-011 — Close Real Dataverse Smoke Test

## Objetivo aprobado

Cerrar formalmente el smoke test real ejecutado en Phase1-010B, sin modificar
lógica funcional, backend, autenticación, Dataverse ni el arnés temporal.

## Estado de Phase1-010B

**PASS — Real Dataverse connectivity validated end-to-end.**

La ejecución real se realizó con un usuario autenticado mediante MSAL y un
access token delegado adquirido correctamente. Render aceptó el JWT y la
Customer API alcanzó Dataverse mediante su credencial backend separada.

## Evidencia funcional sanitizada

Request controlado:

```text
GET /api/customers/search?type=code&q=CL0000041
```

Resultado registrado:

```text
msalAuthentication=authenticated
accessTokenAcquisition=acquired
renderJwtValidation=accepted
dataverseRequest=attempted
httpStatus=200
customersReturned=1
diagnostic=null
```

El cliente de prueba `CL0000041` devolvió exactamente una coincidencia. Esta
evidencia conserva sólo el código controlado y la cantidad; no almacena el
payload real del cliente.

## Arquitectura validada

```text
Vercel
  → MSAL / Microsoft Entra ID
  → delegated access token
  → Render Customer API
  → JWT validation
  → backend client_credentials
  → Dataverse
  → accounts
```

La validación cubre conectividad y autenticación end-to-end para la búsqueda
Customer controlada. Render permanece como backend transitorio y Azure como
destino futuro.

## Seguridad preservada

- No se almacena el payload real del cliente.
- No se almacenan JWT, headers `Authorization`, secretos ni claims sensibles.
- El access token delegado continúa administrado por MSAL.
- Las credenciales `client_credentials` continúan exclusivamente en backend.

## Estado de fuente y pendientes reales

`VITE_CUSTOMER_SOURCE=local` permanece sin cambios; el Customer Provider
Dataverse no queda activado en la UI.

Pendientes:

- activar Customer Provider Dataverse en UI;
- completar `customerType` real;
- validar búsqueda por nombre;
- validar manejo de errores y cero resultados;
- mantener Render como backend transitorio;
- migrar posteriormente a Azure.

## Alcance del cierre

- Sólo se crea y actualiza documentación y evidencia local.
- No se modifica lógica funcional, backend, autenticación ni Dataverse.
- No se elimina el smoke-test harness.
- No se realiza commit, push ni deploy.

## Archivos del hito

- `docs/prompts/Phase1-011-CloseDataverseSmokeTest.md`.
- `docs/knowledge/ARCHITECTURE_STATE.md`.
- `docs/knowledge/DATA_SOURCES.md`.
- `docs/knowledge/ROADMAP.md`.
- `docs/knowledge/CHANGELOG.md`.
- `logs/Phase1-011-CloseDataverseSmokeTest.log`, evidencia local excluida de Git.

## Validación

```text
npm test -- --run: PASS — 258/258 pruebas en 24 archivos
npm run build: PASS — Vite 5.4.21, 1675 módulos transformados
git diff --check: PASS
git status --short: sólo el prompt nuevo y los cuatro documentos autorizados
```

## Reversión

Restaurar únicamente este prompt y las entradas Phase1-011 de los cuatro
documentos de conocimiento. No existe cambio de código, configuración, fuente,
backend, autenticación o Dataverse que revertir.
