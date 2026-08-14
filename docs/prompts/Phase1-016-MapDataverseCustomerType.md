# Phase1-016 — Map Dataverse Customer Type

## Objetivo aprobado

Completar el contrato Customer real desde el Entity Set `accounts` mediante el
mapping autorizado `new_tipocliente` → `customerType`, limitado al gateway
Dataverse y sin modificar UI, autenticación, hosting ni reglas funcionales.

## Mapping implementado

| Columna Dataverse | Contrato Customer |
| --- | --- |
| `new_codigocliente` | `customerCode` |
| `name` | `customerName` |
| `crbbe_nombrepais` | `country` |
| `new_tipocliente` | `customerType` |

`new_tipocliente` se conoce únicamente dentro de Account Customer Gateway. La
salida normalizada no contiene nombres lógicos Dataverse.

## Select y consultas

El `$select` común queda compuesto por:

```text
new_codigocliente,name,crbbe_nombrepais,new_tipocliente
```

Se aplica sin duplicación a búsqueda por código, búsqueda por nombre y lectura
exacta por `customerCode`. Se preservan los órdenes y límites vigentes.

## Normalización

Un `new_tipocliente` con valor se convierte a string y se recorta siguiendo la
normalización existente de Customer. Si llega `null` o `undefined`,
`customerType` queda como `''`; no se genera error ni se inventa otro valor.

## Filtros preservados

Las tres consultas mantienen el filtro base de Phase1-015:

```text
customertype eq 3 and statecode eq 0 and crbbe_estadocliente eq 4
```

`customertype` sigue siendo solamente criterio de elegibilidad y no reemplaza
ni determina el valor contractual de `customerType`.

## Alcance arquitectónico

El cambio productivo se limita a
`server/src/integrations/dataverse/accountCustomerGateway.js`. No se modifican
`App.jsx`, Customer UI, frontend, MSAL, Entra, Render, autenticación, deploy ni
reglas funcionales.

## Pruebas y validación

- `$select` contiene `new_tipocliente` en código, nombre y lectura exacta.
- `new_tipocliente` se mapea a `customerType` sin exponer el nombre físico.
- `null` y `undefined` se normalizan a `''`.
- El contrato público conserva solo nombres normalizados.
- Las tres consultas y filtros Phase1-015 permanecen cubiertos.
- Pruebas dirigidas: 13/13 aprobadas.
- Backend: 43/43 pruebas aprobadas.
- Frontend: 282/282 pruebas aprobadas en 24 archivos.
- Backend build: syntax check aprobado.
- Frontend build: Vite 5.4.21, 1675 módulos transformados.

## Riesgos y reversión

El valor real depende de la calidad de `new_tipocliente`; el gateway tolera su
ausencia sin alterar los demás campos. La reversión consiste en retirar el
campo del mapping y del `$select` y restaurar las expectativas de pruebas, sin
migraciones de datos ni cambios externos.

## Pendientes

- Revisar el hito antes de activar `VITE_CUSTOMER_SOURCE=dataverse`.
- Validar interactivamente `customerType` real después de una activación
  autorizada.
- Render permanece transitorio y Azure continúa como destino futuro.
