# Phase1-029 — Resolve Dataverse Customer Type Global Choice Label

## Objetivo aprobado

Corregir exclusivamente el mapping de `customerType` para entregar la etiqueta
legible del Choice global asociado a `accounts.new_tipocliente`, sin publicar el
valor numérico, consultar metadata por búsqueda ni cambiar contratos o filtros.

## Estrategia implementada

Dataverse entrega los valores formateados como una anotación de la propiedad
cuando la solicitud incluye:

```text
Prefer: odata.include-annotations="OData.Community.Display.V1.FormattedValue"
```

Para `new_tipocliente`, la propiedad exacta leída por Account Customer Gateway
es:

```text
new_tipocliente@OData.Community.Display.V1.FormattedValue
```

`DataverseClient.retrieveMultiple()` acepta la opción interna y genérica
`includeAnnotations`; el cliente compone el header en la única implementación
HTTP existente. Account Customer Gateway solicita la anotación en búsqueda por
código, búsqueda por nombre y lectura exacta por código. No se consulta
`new_tipoclienteglobal` ni metadata.

## Mapping y fallback

```text
new_tipocliente@OData.Community.Display.V1.FormattedValue
  -> String(value).trim()
  -> customerType
```

Si la anotación falta, es `null` o `undefined`, `customerType` es `''`. El valor
numérico de `new_tipocliente` se ignora para el contrato y no se inventan
etiquetas. Código, nombre y país conservan su mapping anterior.

## Invariantes preservadas

- Filtro Phase1-026 exacto:
  `customertypecode eq 3 and statecode eq 0 and crbbe_estadodelcliente eq 4`.
- `$select=new_codigocliente,name,crbbe_nombrepais,new_tipocliente`.
- Búsqueda por código y nombre, lectura exacta, `$top`, `$orderby` y escape de
  comillas OData.
- Autenticación, JWT, contratos HTTP públicos, diagnóstico sanitizado
  Phase1-020, hosting portable y `VITE_CUSTOMER_SOURCE=local`.
- Phase1-022 y Phase1-024 continúan eliminados.

## Archivos

### Creados

- `docs/prompts/Phase1-029-ResolveDataverseCustomerTypeLabel.md`.
- `logs/Phase1-029-ResolveDataverseCustomerTypeLabel.log` como evidencia local
  excluida de Git.

### Modificados

- `server/src/integrations/dataverse/accountCustomerGateway.js`.
- `server/src/integrations/dataverse/dataverseClient.js`.
- `server/tests/accountCustomerGateway.node-test.js`.
- `server/tests/customerApi.node-test.js`.
- `server/tests/dataverseClient.node-test.js`.
- `docs/knowledge/ARCHITECTURE_STATE.md`.
- `docs/knowledge/DATA_SOURCES.md`.
- `docs/knowledge/ROADMAP.md`.
- `docs/knowledge/CHANGELOG.md`.

## Validación

- Backend relevante: 24/24 pruebas aprobadas.
- Backend completo: 50/50 pruebas aprobadas.
- Frontend completo: 282/282 pruebas aprobadas en 24 archivos.
- Backend build/syntax: aprobado.
- Frontend build: aprobado con Vite 5.4.21 y 1675 módulos transformados.
- `git diff --check`: aprobado.

## Riesgos y reversión

El riesgo residual es operativo: Dataverse debe aplicar la preferencia y enviar
la anotación para la cultura efectiva de la solicitud. Si no la envía, el
fallback seguro mantiene `customerType: ''`. La reversión consiste en retirar
la opción `includeAnnotations` y restaurar el mapping anterior, sin cambios de
datos, infraestructura ni contratos; restaurar el valor numérico como etiqueta
requeriría una nueva autorización funcional.

## Alcance no ejecutado

No se consultó producción, metadata ni Global Choice; no se modificaron
Dataverse, Render, Vercel, variables, autenticación, JWT, UI ni contratos
públicos. No hubo commit, push o deploy.

## Siguiente acción exacta

Solicitar revisión independiente y autorización separada antes de checkpoint o
despliegue. Cualquier validación real debe ejecutarse mediante un prompt
posterior controlado.

Prompt ejecutado: Phase1-029 — Resolve Dataverse Customer Type Global Choice Label
