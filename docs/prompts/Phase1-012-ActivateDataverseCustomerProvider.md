# Phase1-012 — Activate Dataverse Customer Provider in UI

## Objetivo aprobado

Dejar la UI de Configuración preparada para usar el Customer Provider
Dataverse después de una revisión explícita, sin cambiar todavía
`VITE_CUSTOMER_SOURCE=local` ni ejecutar deploy.

## Estado alcanzado

La cadena Customer de UI queda preparada y cubierta para búsquedas por código y
nombre, selección única, cero resultados, sesión ausente, errores sanitizados,
timeout, deduplicación de requests activos y protección de respuestas
asíncronas obsoletas.

La activación real en Vercel permanece pendiente. Este hito no afirma tráfico
Dataverse desde los combobox mientras `VITE_CUSTOMER_SOURCE=local` continúe
vigente.

## Arquitectura preservada

```text
Dataverse
  → Render Customer API
  → DataverseCustomerProvider
  → CustomerRepository
  → Customer Application Service
  → UI Configuración
```

La UI no consulta Dataverse, no construye OData y no conoce entity sets,
columnas lógicas, tokens, headers de autorización ni secretos. El Provider es
la única capa frontend que obtiene el Bearer delegado y consume la Customer
API.

## Búsquedas y selección

- Código usa `searchCustomersByCode` y nombre usa `searchCustomersByName` a
  través de Application Service y Repository.
- El término se normaliza y un valor vacío no genera token ni request.
- Una solicitud idéntica ya pendiente no se duplica.
- Cada request recibe un identificador monotónico; sólo el más reciente puede
  publicar resultados, incluso en una secuencia A→B→A.
- La UI mantiene una única entidad `selectedCustomer`; al seleccionar, el
  Application Service sincroniza en una sola actualización `customerCode`,
  `customerName`, `country` y `customerType` con el contrato histórico de
  configuración.
- Al empezar una nueva búsqueda se invalida la selección previa y se limpian
  juntos sus cuatro campos.

## Cero resultados

`{ "customers": [] }` se conserva como arreglo vacío. La UI muestra
`No se encontraron clientes.`, no restaura la selección anterior y permite una
nueva búsqueda sin recargar la aplicación.

## Sesión, errores y seguridad

- `getAccessToken()` sigue siendo la única abstracción de sesión. Cuando MSAL
  no entrega token, su flujo existente inicia login y el Provider no consulta
  la API.
- La UI orienta al usuario a iniciar sesión sin duplicar lógica MSAL.
- El Provider clasifica de forma interna y sanitizada 401, 403, 429, 5xx,
  error de red, timeout y respuesta inválida.
- Application Service traduce esos códigos a mensajes claros y no técnicos.
- Un timeout de 10 segundos aborta el request frontend y también cubre la
  lectura de la respuesta.
- No se muestran tokens, URLs internas, stack traces, payloads técnicos ni
  detalles sensibles.

## customerType

El contrato permanece:

```js
{
  customerCode,
  customerName,
  country,
  customerType
}
```

No se inventa una columna Dataverse. Cuando el backend no entrega el campo,
`normalizeCustomer()` conserva `customerType: ''` como fallback temporal.

## Smoke tests preservados

No se modifica ni elimina el arnés autenticado histórico Phase1-007 ni el
smoke real Phase1-010B conservado mediante `?phase1-010b-smoke=1`.

## Archivos de implementación

- `src/App.jsx`.
- `src/providers/dataverse/dataverseCustomerProvider.js`.
- `src/application/customerMasterService.js`.
- `src/domain/customer/customer.js`.
- `src/providers/dataverse/__tests__/dataverseCustomerProvider.test.js`.
- `src/providers/__tests__/customerProviderFactory.test.js`.
- `src/application/__tests__/customerMasterService.test.js`.
- `src/__tests__/customerMasterUi.test.js`.

No se modifica backend, Repository, factory productiva, autenticación, Render,
Entra, Dataverse, Maestro Producto, Inventario Cliente, fórmulas ni Dashboard.

## Pruebas y validación

- 24 pruebas nuevas: ocho de Provider, una de factory, nueve de Application
  Service y seis de UI.
- Código/nombre, Bearer delegado, `customerType` vacío, cero resultados, 401,
  403, 429, 5xx, red, timeout, sesión inexistente, respuesta obsoleta,
  deduplicación, selección sincronizada y modo local quedan cubiertos.
- `npm test -- --run`: PASS — 282/282 en 24 archivos.
- `npm run build`: PASS — Vite 5.4.21, 1675 módulos transformados.
- `git diff --check` y `git status --short`: registrados en la evidencia local.

## Pendientes reales

- Revisar este hito antes de cambiar la variable en Vercel.
- Activar posteriormente `VITE_CUSTOMER_SOURCE=dataverse` mediante autorización
  explícita.
- Ejecutar validación interactiva real de ambos combobox y sus estados de
  cero/error después de la activación.
- Confirmar el nombre lógico real de `customerType` antes de mapearlo.
- Mantener Render como backend transitorio y migrar posteriormente a Azure.

## Reversión

Restaurar los cuatro módulos frontend y las cuatro pruebas relacionadas de
este hito, además de sus entradas documentales. La fuente efectiva continúa en
`local`, por lo que no existe migración de datos, backend o configuración
externa que revertir.
