# Phase1-032 — Close Dataverse Customer Master Integration

## Objetivo aprobado

Cerrar formalmente Maestro Cliente como **IMPLEMENTED + PRODUCTION VALIDATED**
y sincronizar la documentación vigente, sin introducir cambios funcionales,
consultas productivas ni acciones externas.

## Evidencia productiva confirmada

- Frontend en Vercel con `VITE_CUSTOMER_SOURCE=dataverse`.
- MSAL/Microsoft Entra ID entrega a Customer API un access token delegado.
- Backend portable alojado transitoriamente en Render; valida el Bearer y
  accede a Dataverse mediante su integración autorizada separada.
- Búsqueda por código validada y búsqueda por nombre implementada.
- Una única selección sincroniza `customerCode`, `customerName`, `country` y
  `customerType`.
- Manejo de cero resultados y errores implementado.

Esta evidencia fue aportada como estado productivo confirmado; este prompt no
ejecutó consultas contra producción ni modificó Vercel, Render o Dataverse.

## Fuente, filtros y contrato

- Fuente autorizada: Entity Set `accounts`.
- Filtro obligatorio en toda consulta Customer:
  `customertypecode eq 3 and statecode eq 0 and crbbe_estadodelcliente eq 4`.
- Contrato normalizado: `{ customerCode, customerName, country, customerType }`.
- Mappings encapsulados en Account Customer Gateway:
  - `new_codigocliente` → `customerCode`.
  - `name` → `customerName`.
  - `crbbe_nombrepais` → `country`.
  - `new_tipocliente@OData.Community.Display.V1.FormattedValue` →
    `String(value).trim()` → `customerType`.
- Si la anotación FormattedValue no existe, `customerType = ''`.
- El valor numérico de `new_tipocliente` nunca se expone como `customerType`.
- El Choice global asociado es `new_tipoclienteglobal`; no se consulta por cada
  búsqueda porque FormattedValue entrega la etiqueta en la misma respuesta.

## Arquitectura y límites

```text
Vercel UI
  -> Customer Master Application Service
    -> Customer Repository
      -> Dataverse Customer Provider
        -> MSAL / Microsoft Entra ID (Bearer delegado)
        -> Render Customer API (JWT delegado validado)
          -> Customer Service
            -> Account Customer Gateway
              -> Dataverse Client (integración backend autorizada)
                -> Dataverse accounts
```

UI, Domain y Application Service trabajan solo con Customer normalizado. La UI
no conoce JWT, OData, filtros ni LogicalNames; Repository y frontend Provider no
consultan Dataverse directamente. Account Customer Gateway es el único módulo
que conoce la tabla, campos, anotación y reglas de elegibilidad físicas.

Render no forma parte de la lógica Customer: continúa como hosting transitorio
del backend portable. Azure permanece como destino definitivo y requiere un
prompt posterior que preserve variables neutrales, autenticación, filtros,
mappings, contratos y límites entre capas, sin asumir todavía un servicio Azure.

## Archivos

### Creados

- `docs/prompts/Phase1-032-CloseDataverseCustomerMasterIntegration.md`.
- `logs/Phase1-032-CloseDataverseCustomerMasterIntegration.log`, evidencia
  local excluida de Git.

### Modificados

- `docs/knowledge/ARCHITECTURE_STATE.md`.
- `docs/knowledge/DATA_SOURCES.md`.
- `docs/knowledge/ROADMAP.md`.
- `docs/knowledge/CHANGELOG.md`.

No se modificó código productivo, pruebas, configuración ni infraestructura.

## Riesgos, pendientes y reversión

- Pendiente real: migrar el Customer API portable desde Render hacia Azure
  mediante un hito independiente; no se define aquí el servicio de destino.
- El rate limiter in-memory deberá sustituirse antes de múltiples instancias o
  escala horizontal en Azure.
- El arnés de smoke temporal permanece como deuda de retiro, no como bloqueo de
  la integración productiva.
- Reversión documental: restaurar estos cinco archivos versionados. No existe
  reversión de código, datos o infraestructura porque no fueron modificados.

## Validación

- Revisión de consistencia: no quedan pendientes vigentes de activación,
  mapping `customerType`, búsqueda por nombre ni estados de cero/error para
  Maestro Cliente en los documentos actualizados.
- `git diff --check`: aprobado.
- `git status --short`: solo documentación prevista; el log no aparece por
  permanecer excluido de Git.
- Pruebas y builds no se ejecutaron porque el cambio es exclusivamente
  documental y no modifica código ni configuración.
- Sin commit, push, deploy, consulta productiva ni cambio externo.

Prompt ejecutado: Phase1-032 — Close Dataverse Customer Master Integration
