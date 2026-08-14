# Phase1-020 — Diagnose Dataverse Customer 502 Safely

## Objetivo aprobado

Diagnosticar temporalmente el fallo upstream que la Customer API expone como
HTTP 502 después de Phase1-015/016, sin cambiar filtros, `$select`, mapping,
contratos públicos, autenticación, variables de entorno ni despliegue.
Dataverse continúa como única fuente autorizada para esta consulta.

## Causa técnica del 502

`DataverseClient.retrieveMultiple()` convertía toda respuesta HTTP `!ok` de
Dataverse en `DataverseRequestError`, descartando status y metadata OData. Ese
error define de forma fija `code = DATAVERSE_REQUEST_FAILED` y
`statusCode = 502`. Account Customer Gateway y Customer Service lo propagan sin
transformarlo; el catch de `createApp` conserva el status/código y reemplaza el
mensaje 5xx por `No fue posible procesar la solicitud.`. Por eso el cliente
público recibe el contrato sanitizado 502, pero antes de este hito Render no
podía distinguir la causa upstream.

```text
Dataverse HTTP/OData !ok
  -> DataverseRequestError(DATAVERSE_REQUEST_FAILED, 502)
    -> Account Customer Gateway
      -> Customer Service
        -> createApp catch
          -> HTTP 502 sanitizado
```

## Diagnóstico temporal implementado

`dataverseDiagnostics.js` tiene una única responsabilidad: inspeccionar status
HTTP y los campos estructurados `error.code`/`error.message` solo para derivar
una categoría, y construir un evento allowlisted. El contenido original no se
entrega al logger. `dataverseClient.js` emite ese evento en errores HTTP,
respuestas 2xx inválidas y fallos de transporte; la emisión nunca altera el
error normalizado si el logger falla.

| Identificador | Clasificación interna |
| --- | --- |
| `DATAVERSE_BAD_REQUEST` | HTTP 400 sin señal segura de campo/filtro inválido |
| `DATAVERSE_INVALID_FIELD_OR_FILTER` | HTTP 400 cuya metadata OData indica campo, propiedad, query o filtro inválido |
| `DATAVERSE_UNAUTHORIZED` | HTTP 401 de Dataverse |
| `DATAVERSE_FORBIDDEN` | HTTP 403 de Dataverse |
| `DATAVERSE_RATE_LIMITED` | HTTP 429 de Dataverse |
| `DATAVERSE_UPSTREAM_ERROR` | Otros status upstream o respuesta Dataverse inválida |
| `DATAVERSE_NETWORK_ERROR` | Fetch/timeout/transporte después de iniciar el request Dataverse |

El evento JSON de Application Logs contiene exclusivamente:

- `component` fijo;
- `diagnosticId` allowlisted;
- `operation` fija;
- `failureType` derivado;
- `upstreamStatus`, solo cuando existe como entero;
- `structuredErrorMetadata`, solo como booleano.

## Información deliberadamente excluida

No se registra el error original ni ninguno de estos datos:

- access token, Authorization header, client secret, JWT o cookies;
- payload completo o parcial de Dataverse;
- `error.code` o `error.message` OData originales;
- datos personales, nombre o país del cliente;
- `customerCode` o texto buscado;
- URL completa, path con parámetros, query string, `$filter` o `$select`;
- stack trace en producción;
- campo lógico señalado por Dataverse.

## Contratos y reglas preservados

La respuesta HTTP pública sigue siendo exactamente:

```json
{
  "error": {
    "code": "DATAVERSE_REQUEST_FAILED",
    "message": "No fue posible procesar la solicitud."
  }
}
```

con status 502 para `DataverseRequestError`. Los identificadores Phase1-020 son
solo internos y no se serializan hacia el cliente.

Account Customer Gateway no fue modificado. Sus consultas conservan:

```text
customertype eq 3 and statecode eq 0 and crbbe_estadocliente eq 4
```

y el `$select`/mapping Phase1-016:

```text
new_codigocliente,name,crbbe_nombrepais,new_tipocliente
new_tipocliente -> customerType
```

## Archivos del hito

- Creado: `server/src/integrations/dataverse/dataverseDiagnostics.js`.
- Modificado: `server/src/integrations/dataverse/dataverseClient.js`.
- Creado: `server/tests/dataverseDiagnostics.node-test.js`.
- Modificado: `server/tests/customerApi.node-test.js`.
- Modificado: `docs/knowledge/ARCHITECTURE_STATE.md`.
- Creado: `docs/prompts/Phase1-020-DiagnoseDataverseCustomer502.md`.
- Evidencia local excluida: `logs/Phase1-020-DiagnoseDataverseCustomer502.log`.

## Pruebas y validación

- Pruebas backend relevantes: 20/20 aprobadas.
- Suite backend completa: 46/46 aprobadas.
- Suite frontend completa: 282/282 aprobadas en 24/24 archivos.
- Backend build/syntax check: aprobado.
- Frontend build: aprobado con Vite 5.4.21 y 1675 módulos transformados.
- `git diff --check`: aprobado.

La cobertura específica demuestra los siete identificadores, clasificación por
metadata OData, ausencia de secretos/PII/query/error/stack en eventos, contrato
público 502 exacto y preservación de filtros/mapping mediante las pruebas de
Account Customer Gateway.

## Riesgos y reversión

El diagnóstico lee el error OData solo en memoria para clasificarlo y no lo
persiste. Al ser temporal, su reversión consiste en retirar la llamada de
diagnóstico del cliente, eliminar el módulo y su prueba específica y restaurar
esta documentación. No requiere migración, cambio de fuente ni configuración
externa.

## Siguiente acción exacta

Después de autorización explícita para versionar y desplegar este hito solo en
Render, iniciar sesión con MSAL y abrir exactamente una vez
`https://sell-through-ap.vercel.app/?phase1-010b-smoke=1`. Esa acción emite una
sola búsqueda controlada del código ya aprobado. Inmediatamente después,
revisar Render Application Logs y conservar únicamente el evento JSON cuyo
`diagnosticId` corresponda al 502. No cambiar `VITE_CUSTOMER_SOURCE=local` ni
configuración, autenticación, filtros o mapping.

## Alcance no ejecutado

No se realizó commit, push, deploy ni cambio externo. No se modificaron Vercel,
Render, variables de entorno, JWT/MSAL, Entra, query funcional, mappings o
contratos públicos.

Prompt ejecutado: Phase1-020 — Diagnose Dataverse Customer 502 Safely
