# Phase1-015 — Filter Dataverse Customer Master

## Objetivo aprobado

Aplicar en backend filtros obligatorios a toda consulta del Maestro Cliente
sobre el Entity Set `accounts`, sin modificar frontend, UI, autenticación,
hosting ni el contrato Customer.

## Filtro base implementado

```text
customertype eq 3 and statecode eq 0 and crbbe_estadocliente eq 4
```

Account Customer Gateway define una sola cláusula base y la combina con cada
criterio específico mediante `and`. Los tres valores son constantes de
elegibilidad del gateway; no se reciben desde parámetros frontend.

## Consultas afectadas

- Búsqueda por código:
  `contains(new_codigocliente,'<q>') and <filtro base>`.
- Búsqueda por nombre: `contains(name,'<q>') and <filtro base>`.
- Lectura exacta por código:
  `new_codigocliente eq '<customerCode>' and <filtro base>`.

Se preservan el Entity Set `accounts`, el `$select` vigente
`new_codigocliente,name,crbbe_nombrepais`, `$top=20` y orden por campo de
búsqueda para las búsquedas. La lectura exacta conserva `$top=1` y orden por
nombre. Todos los valores continúan pasando por `quoteODataString()` y su
escape de comillas simples.

## Contrato preservado

El mapping continúa entregando exclusivamente:

```js
{
  customerCode,
  customerName,
  country
}
```

El contrato Customer frontend mantiene además su fallback histórico
`customerType: ''`. `customertype=3` es solo un criterio de elegibilidad y no
se agregó al `$select`, al mapping ni a la salida del gateway.

## Frontera arquitectónica

El cambio productivo se limita a
`server/src/integrations/dataverse/accountCustomerGateway.js`. `App.jsx`, el
frontend, Customer UI, MSAL, Entra, Render, autenticación y configuración de
deploy permanecen sin cambios. La Customer API continúa rechazando `$filter`,
`$select`, `$orderby`, `$top` y parámetros arbitrarios enviados por frontend.

## Pruebas

- Búsqueda por código contiene los tres filtros y conserva select, orden y
  límite.
- Búsqueda por nombre contiene los tres filtros y conserva su orden.
- Lectura exacta contiene los tres filtros y conserva select, orden y límite.
- Comillas simples permanecen escapadas antes de combinar el filtro base.
- El mapping mantiene el contrato Customer sin campos físicos adicionales.
- La API rechaza un `$filter` enviado por frontend.
- Backend: 42/42 pruebas aprobadas.
- Frontend: 282/282 pruebas aprobadas en 24 archivos.
- Backend build: syntax check aprobado.
- Frontend build: Vite 5.4.21, 1675 módulos transformados.

## Riesgos y reversión

El cambio puede reducir resultados previamente visibles que no cumplan la
elegibilidad aprobada; esa reducción es el objetivo funcional. La reversión
consiste en retirar el helper de filtro base y restaurar las expectativas de
gateway, sin migraciones de datos ni cambios de configuración externa.

## Pendientes

- Activación posterior de `VITE_CUSTOMER_SOURCE=dataverse`, revisión y deploy
  requieren autorización independiente.
- La confirmación y mapping de `customerType` lógico continúa pendiente.
- Render sigue siendo transitorio y Azure permanece como destino futuro.
