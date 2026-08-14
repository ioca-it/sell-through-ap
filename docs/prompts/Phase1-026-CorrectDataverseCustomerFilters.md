# Phase1-026 — Correct Dataverse Customer Filters and Remove Temporary Diagnostics

## Objetivo aprobado

Corregir definitivamente los filtros del Maestro Cliente mediante metadata real
confirmada en Dataverse y retirar por completo los diagnósticos temporales
Phase1-022 y Phase1-024, sin cambiar contratos, autenticación, variables,
hosting ni fuente efectiva de UI.

## Evidencia productiva confirmada

| Regla | LogicalName | SchemaName | Tipo | Valor | Evidencia |
| --- | --- | --- | --- | ---: | --- |
| Clasificación de cliente | `customertypecode` | `CustomerTypeCode` | Picklist | 3 | Cliente |
| Estado de cliente | `crbbe_estadodelcliente` | `crbbe_EstadoDelCliente` | Picklist | 4 | Cliente |
| Estado activo | `statecode` | — | State | 0 | Probe `statecode eq 0` PASS |

Phase1-022 también confirmó `new_tipocliente` como campo seleccionable. Este
campo mantiene exclusivamente su responsabilidad contractual y no sustituye
ninguno de los criterios de elegibilidad.

## Filtro definitivo

```text
customertypecode eq 3
and statecode eq 0
and crbbe_estadodelcliente eq 4
```

Account Customer Gateway combina mediante AND el predicado específico con ese
filtro en las tres operaciones:

- búsqueda por `customerCode` con `contains(new_codigocliente, ...)`;
- búsqueda por `customerName` con `contains(name, ...)`;
- lectura exacta por `customerCode` con `new_codigocliente eq ...`.

Los valores continúan pasando por `quoteODataString()` y conservan el escape de
comillas simples. Las búsquedas mantienen su orden y `$top=20`; la lectura
exacta mantiene orden por `name` y `$top=1`.

## Select y mapping preservados

```text
$select = new_codigocliente,name,crbbe_nombrepais,new_tipocliente
new_tipocliente -> customerType
```

`new_tipocliente` con `null` o `undefined` se normaliza a `''`. No se incorporan
`customertypecodename`, `crbbe_estadodelclientename` ni `new_tipoclientename`
como filtros, campos del mapping o sustitutos del contrato aprobado.

## Diagnósticos temporales retirados

Phase1-022 fue retirado completamente:

- eliminado `accountCustomerQueryDiagnostic.js`;
- eliminados el import, trigger, probes, estado one-shot y logger del gateway;
- eliminado `probeRetrieveMultiple()` de Dataverse Client;
- eliminadas sus pruebas exclusivas y de integración temporal.

Phase1-024 fue retirado completamente:

- eliminado `accountCustomerMetadataDiagnostic.js`;
- eliminados el import, trigger, consulta de metadata y estado one-shot;
- eliminados `retrieveEntityAttributeMetadata()` y
  `retrieveRequiredOptionMetadata()` de Dataverse Client;
- eliminadas sus pruebas exclusivas y de integración temporal.

No quedan referencias runtime a `PHASE1_022_CUSTOMER_QUERY_PROBE` ni
`PHASE1_024_ACCOUNT_ATTRIBUTE_METADATA`.

## Observabilidad preservada

Phase1-020 permanece en `dataverseDiagnostics.js` y `dataverseClient.js`. Los
siete identificadores sanitizados, incluido
`DATAVERSE_INVALID_FIELD_OR_FILTER`, siguen disponibles para Application Logs
sin exponer payloads, queries, credenciales, tokens, PII ni mensajes upstream.
El error público continúa normalizado como `DATAVERSE_REQUEST_FAILED` / HTTP
502 cuando corresponde.

## Cobertura y validación

- Account Customer Gateway exige el filtro exacto en búsqueda por código,
  búsqueda por nombre y lectura exacta por código.
- Una regresión dedicada impide usar `customertype` o
  `crbbe_estadocliente` como nombres lógicos de comparación.
- El mapping y los fallbacks de `customerType` permanecen cubiertos.
- Backend relevante: 13/13 pruebas aprobadas.
- Backend completo: 48/48 pruebas aprobadas.
- Frontend completo: 282/282 pruebas aprobadas en 24 archivos.
- Backend build/syntax: aprobado.
- Frontend build: aprobado con Vite 5.4.21 y 1675 módulos transformados.
- `git diff --check`: aprobado.
- Evidencia local excluida:
  `logs/Phase1-026-CorrectDataverseCustomerFilters.log`.

## Archivos del hito

### Creados

- `docs/prompts/Phase1-026-CorrectDataverseCustomerFilters.md`.

### Modificados

- `server/src/integrations/dataverse/accountCustomerGateway.js`.
- `server/src/integrations/dataverse/dataverseClient.js`.
- `server/tests/accountCustomerGateway.node-test.js`.
- `server/tests/dataverseClient.node-test.js`.
- `docs/knowledge/ARCHITECTURE_STATE.md`.
- `docs/knowledge/DATA_SOURCES.md`.
- `docs/knowledge/ROADMAP.md`.
- `docs/knowledge/CHANGELOG.md`.

### Eliminados

- `server/src/integrations/dataverse/accountCustomerQueryDiagnostic.js`.
- `server/src/integrations/dataverse/accountCustomerMetadataDiagnostic.js`.
- `server/tests/accountCustomerQueryDiagnostic.node-test.js`.
- `server/tests/accountCustomerMetadataDiagnostic.node-test.js`.

## Riesgos y reversión

El filtro reduce resultados a las tres reglas de elegibilidad ya aprobadas y
ahora usa los nombres confirmados del entorno. Una reversión de los dos nombres
restauraría campos conocidos como inválidos, por lo que solo debe ejecutarse
con nueva evidencia y autorización explícita. La retirada diagnóstica es
reversible restaurando únicamente los cuatro módulos/tests eliminados y sus
hooks, sin migraciones de datos ni cambios externos.

## Alcance no ejecutado

No se realizaron consultas adicionales contra producción ni cambios en
Dataverse. No se modificaron contratos HTTP públicos, contrato Customer, MSAL,
JWT, Entra, Render, Vercel, variables de entorno ni
`VITE_CUSTOMER_SOURCE`. No hubo commit, push ni deploy.

## Siguiente acción exacta

Solicitar autorización independiente para crear el checkpoint Git de
Phase1-026.

Prompt ejecutado: Phase1-026 — Correct Dataverse Customer Filters and Remove
Temporary Diagnostics
