# Phase1-022 — Isolate Dataverse Invalid Customer Field or Filter

## Objetivo aprobado

Aislar con evidencia cuál campo o expresión OData de Customer Master provoca
el `HTTP 400 / DATAVERSE_INVALID_FIELD_OR_FILTER`, sin modificar el contrato
Customer, autenticación, configuración externa, despliegue ni los tres filtros
empresariales aprobados.

## Resultado del análisis local

**Causa identificada: AÚN NO AISLADA.** El evento Phase1-020 demuestra que
Dataverse rechaza un campo, filtro o expresión, pero excluye deliberadamente el
mensaje OData y el nombre lógico. Por ello no permite distinguir por sí solo
entre `customertype`, `statecode`, `crbbe_estadocliente`, `new_tipocliente`,
otro campo de select/orden o el tipo del literal.

El smoke real Phase1-011 fue exitoso antes de incorporar los tres filtros de
Phase1-015 y `new_tipocliente` en Phase1-016. Esa secuencia histórica acota los
elementos nuevos sospechosos, pero no prueba que los nombres o tipos sigan
siendo válidos en el entorno actual. No se infiere ningún nombre alternativo.

## Consulta productiva vigente

Dataverse Client crea la URL con `URLSearchParams`: une el array de `$select`
con comas y serializa `$top` solamente cuando recibe un entero positivo.
Account Customer Gateway entrega estas formas internas:

### Búsqueda por código

```text
$select  = new_codigocliente,name,crbbe_nombrepais,new_tipocliente
$filter  = contains(new_codigocliente,'<valor escapado>') and customertype eq 3 and statecode eq 0 and crbbe_estadocliente eq 4
$orderby = new_codigocliente asc
$top     = 20
```

### Búsqueda por nombre

```text
$select  = new_codigocliente,name,crbbe_nombrepais,new_tipocliente
$filter  = contains(name,'<valor escapado>') and customertype eq 3 and statecode eq 0 and crbbe_estadocliente eq 4
$orderby = name asc
$top     = 20
```

### Lectura exacta por código

```text
$select  = new_codigocliente,name,crbbe_nombrepais,new_tipocliente
$filter  = new_codigocliente eq '<valor escapado>' and customertype eq 3 and statecode eq 0 and crbbe_estadocliente eq 4
$orderby = name asc
$top     = 1
```

Los valores continúan pasando por `quoteODataString()`; este documento no
contiene el valor real usado por Customer.

## Diagnóstico temporal implementado

Después de que la consulta normal recibe específicamente
`DATAVERSE_INVALID_FIELD_OR_FILTER`, el gateway ejecuta como máximo una
secuencia diagnóstica por proceso backend. Una sola solicitud UI controlada
activa todos los probes necesarios; la UI no genera consultas adicionales ni
recibe el resultado técnico.

La secuencia prueba:

1. Entity Set base `accounts` con `$top=1`.
2. Cada campo del `$select` por separado.
3. Existencia individual de los tres campos de elegibilidad mediante select.
4. Cada comparación `eq` con literal numérico por separado.
5. El predicado string `contains` o `eq` con un literal diagnóstico fijo y no
   relacionado con clientes.
6. El campo de `$orderby`.
7. `$top=20` cuando corresponde.
8. La forma compuesta con literal diagnóstico, solamente si todos los
   componentes anteriores fueron PASS.

La secuencia de búsqueda contiene un máximo de 15 probes. Si falla el Entity
Set base se detiene; si falla cualquier componente se omite la consulta
compuesta. Los probes evalúan sólo el status HTTP, cancelan el body exitoso y
no leen ni registran payloads Dataverse.

Cada línea diagnóstica contiene exclusivamente:

```text
component, diagnosticId, sequence, category, element, result=PASS|FAIL
```

Las categorías separan `select_field`, `filter_field`,
`filter_numeric_literal`, `predicate_string_literal`, `orderby_field`,
`top_integer` y `composed_query`. `element` contiene únicamente el nombre
lógico o la categoría técnica backend probada. Nunca contiene valores
Customer, expresiones, query strings, URLs, payloads, mensajes OData, tokens,
headers, JWT, secretos o PII.

El identificador interno Phase1-020 se conserva en un `Symbol` no serializable
para activar la secuencia. El error público permanece en `HTTP 502` con
`DATAVERSE_REQUEST_FAILED` y el mensaje sanitizado vigente.

## Interpretación de evidencia

- `select_field=FAIL`: el nombre lógico probado no es seleccionable con el
  esquema/permisos efectivos.
- `filter_field=PASS` y `filter_numeric_literal=FAIL` para el mismo elemento:
  la propiedad existe, pero la comparación, el tipo o el literal numérico no
  es aceptado.
- `predicate_string_literal=FAIL` después de `select_field=PASS`: el predicado
  o el tipo string no es válido para ese campo.
- `orderby_field=FAIL` después de `select_field=PASS`: el campo existe pero no
  acepta el orden vigente.
- Todos los componentes PASS y `composed_query=FAIL`: el problema está en la
  composición de la consulta.
- Todos los probes PASS mientras la consulta original falla: investigar el
  literal específico o una condición transitoria sin registrar dicho valor.

## Archivos del hito

- Creado:
  `server/src/integrations/dataverse/accountCustomerQueryDiagnostic.js`.
- Modificados:
  `server/src/integrations/dataverse/accountCustomerGateway.js` y
  `server/src/integrations/dataverse/dataverseClient.js`.
- Creado:
  `server/tests/accountCustomerQueryDiagnostic.node-test.js`.
- Modificados:
  `server/tests/accountCustomerGateway.node-test.js` y
  `server/tests/dataverseClient.node-test.js`.
- Modificado: `docs/knowledge/ARCHITECTURE_STATE.md`.
- Creado:
  `docs/prompts/Phase1-022-IsolateDataverseInvalidCustomerField.md`.
- Evidencia local excluida:
  `logs/Phase1-022-IsolateDataverseInvalidCustomerField.log`.

`DATA_SOURCES.md` y `ROADMAP.md` no cambian porque no se modificaron fuente,
mapping, contrato, activación ni roadmap funcional.

## Pruebas y validación

- Backend relevante: 26/26 pruebas aprobadas.
- Backend completo: 52/52 pruebas aprobadas.
- Frontend completo: 282/282 pruebas aprobadas en 24/24 archivos.
- Backend build/syntax: aprobado.
- Frontend build: aprobado con Vite 5.4.21 y 1675 módulos transformados.
- `git diff --check`: aprobado.

La cobertura demuestra ejecución única, probes individuales y compuestos,
PASS/FAIL, detención de baseline, omisión de composición tras un fallo,
ausencia de valores/query/payloads en eventos, falta de lectura de bodies,
preservación del error 502 y conservación exacta de filtros/select/orden/top.

## Reglas, fuentes y parámetros

- Regla preservada: elegibilidad Customer
  `customertype eq 3 and statecode eq 0 and crbbe_estadocliente eq 4`.
- Fuente preservada: Entity Set `accounts` mediante el backend vigente.
- Contrato preservado:
  `{ customerCode, customerName, country, customerType }`.
- Parámetros y variables de entorno: sin cambios.

## Riesgos y reversión

El diagnóstico produce consultas backend adicionales únicamente tras el 400
específico y una sola vez por proceso. Debe retirarse inmediatamente después
de identificar el elemento. La reversión elimina el módulo temporal, el método
`probeRetrieveMultiple`, el disparador del gateway y sus pruebas, restaurando
el flujo Phase1-020 sin migraciones ni cambios externos.

## Siguiente acción exacta

Después de autorización independiente para versionar y desplegar únicamente el
backend Phase1-022 en Render, ejecutar exactamente una vez el arnés existente
`?phase1-010b-smoke=1` con sesión MSAL. En Render Application Logs, localizar
las líneas `PHASE1_022_CUSTOMER_QUERY_PROBE` y tomar como causa el primer
elemento/categoría `FAIL` según la tabla anterior. No conservar otros datos del
request. Con esa evidencia, preparar un prompt de corrección que use metadata
Dataverse confirmada; no sustituir nombres ni tipos por conjetura.

## Alcance no ejecutado

No se realizaron consultas de producción, commit, push, deploy, cambios de
variables, activación de Provider, ni cambios en MSAL, JWT, Entra, Vercel o
Render. Ninguno de los tres filtros empresariales se eliminó como solución.

Prompt ejecutado: Phase1-022 — Isolate Dataverse Invalid Customer Field or Filter
