# Phase1-046 — Isolate Dataverse Product Invalid Field or Filter

## Estado

**PASS — DIAGNOSTIC IMPLEMENTED / NOT DEPLOYED / NOT EXECUTED / NOT
ACTIVATED.**

## Objetivo ejecutado

Implementar un diagnóstico backend temporal, seguro y controlado que se activa
solamente después de que la consulta Product normal a `productpricelevels`
falla con `DATAVERSE_INVALID_FIELD_OR_FILTER` y `upstreamStatus=400`. La
evidencia productiva proporcionada confirma que el JWT fue aceptado, el request
Dataverse se intentó y el Entity Set plural dejó atrás el 404; Phase1-046 no
vuelve a investigar ni modifica ese Entity Set.

No se corrigió ningún LogicalName o tipo por inferencia. Los nombres definidos
por el contrato Product se tratan exclusivamente como candidatos que los
probes deben verificar contra el entorno productivo después de una autorización
separada.

## Activación y protección

Product Price Level Gateway conserva primero su consulta normal. Solo al
recibir el error exacto se invoca
`runProductPriceLevelQueryDiagnosticOnce()`. Dataverse Client adjunta al error
normalizado únicamente `diagnosticId` y `upstreamStatus` mediante un `Symbol`
privado no enumerable; el error público continúa siendo
`502 / DATAVERSE_REQUEST_FAILED` con el mensaje sanitizado existente.

La bandera module-scope se establece antes del primer `await`, por lo que dos
requests concurrentes tampoco pueden iniciar dos secuencias. La ejecución es
máximo una vez por proceso. Si el baseline del Entity Set falla, se registra
ese único resultado y se detiene la secuencia porque los probes específicos ya
no producirían evidencia confiable.

## Secuencia diagnóstica

Se implementaron **26 probes en 10 categorías**, todos contra
`productpricelevels` y con `$top=1`:

1. `entity_set`: `productpricelevels`.
2. `select_field`, individualmente:
   `crbbe_nombremarca`, `crbbe_sku`, `crbbe_nombreproducto`,
   `crbbe_nombrecategoria`, `crbbe_validohasta`, `createdon`,
   `crbbe_clasificacioncomercial`, `crbbe_etapa`,
   `crbbe_imagenproducto`, `producturl`, `amount`, `crbbe_origen` y
   `crbbe_companiacompradora`.
3. `select_composition`: `product_select` con los 13 campos candidatos.
4. `filter_string_literal`:
   `crbbe_companiacompradora:text_1` y
   `crbbe_companiacompradora:text_2`; cada uno usa separadamente uno de los dos
   literales comerciales vigentes, sin publicarlo en logs.
5. `filter_composition`: `crbbe_companiacompradora:or` con la forma comercial
   vigente completa.
6. `orderby_field`, individualmente: `crbbe_sku`, `crbbe_origen`,
   `crbbe_companiacompradora` y `createdon` con dirección `asc`.
7. `orderby_composition`: `product_order` con los cuatro ordenamientos.
8. `annotation_header`:
   `OData.Community.Display.V1.FormattedValue` sobre los dos campos que hoy
   solicitan etiqueta.
9. `top_integer`: `$top`.
10. `composed_query`: `product_master_query`, que reproduce select, filtro,
    orden y anotación de la consulta normal, agregando exclusivamente `$top=1`
    como límite seguro del diagnóstico.

Una vez aprobado el baseline, un FAIL no detiene los siguientes probes: esto
permite distinguir nombre de campo, comparación/literal, orden individual y
composición. No se adivinan valores OptionSet ni se sustituyen literales
funcionales.

La lectura esperada de los eventos es:

- `select_field=FAIL`: el candidato no existe, no es seleccionable o no está
  disponible para la API/permisos efectivos.
- `select_field=PASS` y `filter_string_literal=FAIL`: el campo existe, pero la
  comparación textual, el tipo o el literal vigente no es aceptado.
- Comparaciones individuales PASS y `filter_composition=FAIL`: la composición
  `or` vigente es la diferencia aislada.
- `select_field=PASS` y `orderby_field=FAIL`: el campo existe, pero el orden
  individual vigente no es aceptado.
- Órdenes individuales PASS y `orderby_composition=FAIL`: la composición del
  orden es la diferencia aislada.
- Componentes previos PASS y `composed_query=FAIL`: la interacción de la
  consulta completa requiere revisión, sin inferir una corrección.

## Sanitización

Cada evento contiene exclusivamente:

```text
component=ProductPriceLevelQueryDiagnostic
diagnosticId=PHASE1_046_PRODUCT_QUERY_PROBE
sequence
category
element
result=PASS|FAIL
```

`probeRetrieveMultiple()` observa solo `response.ok`, cancela el body sin
llamar `json()` y no emite el diagnóstico Dataverse general para cada probe.
No registra valores devueltos, compañías literales, SKU, nombres, marcas,
categorías, precios, URLs, payloads, query strings, mensajes OData, tokens,
JWT, Authorization, cookies, claims, secretos, PII o stack traces. Un fallo de
logger o del propio probe no sustituye el error Product original.

## Archivos

### Creados

- `server/src/integrations/dataverse/productPriceLevelQueryDiagnostic.js`.
- `server/tests/productPriceLevelQueryDiagnostic.node-test.js`.
- `docs/prompts/Phase1-046-IsolateDataverseProductInvalidFieldOrFilter.md`.
- `logs/Phase1-046-IsolateDataverseProductInvalidFieldOrFilter.log`, evidencia
  local excluida de Git.

### Modificados

- `server/src/integrations/dataverse/dataverseClient.js`.
- `server/src/integrations/dataverse/productPriceLevelGateway.js`.
- `server/tests/dataverseClient.node-test.js`.
- `server/tests/productApi.node-test.js`.
- `docs/knowledge/ARCHITECTURE_STATE.md`.
- `docs/knowledge/DATA_SOURCES.md`.
- `docs/knowledge/ROADMAP.md`.
- `docs/knowledge/CHANGELOG.md`.

## Reglas, fuentes, parámetros y contratos preservados

- Entity Set runtime Product: exactamente `productpricelevels`.
- Mapping Product y los 13 nombres candidatos: sin correcciones.
- Compañías vigentes y composición del filtro: sin cambios.
- Consolidación por SKU y pivot USA/CHINA: sin cambios.
- `amount=0`, `null|undefined`, origen ausente y precios nullable: sin cambios.
- `PRODUCT_MASTER_CONFLICT`, conflictos de atributos, FormattedValue y
  `fechaStr`: sin cambios.
- Product Domain, Provider, Repository, Application Service y frontend: sin
  cambios.
- Customer Master, autenticación, rate limiter, contratos HTTP y variables:
  sin cambios.

## Riesgo y reversión obligatoria

El único efecto remoto futuro será una secuencia acotada de hasta 26 GET
adicionales después del 400 específico y una sola vez por proceso. Phase1-046
es **TEMPORAL**: una vez identificados y corregidos mediante otro prompt los
LogicalNames, tipos, literales, filtros u ordenamientos definitivos, se deben
eliminar el módulo, el método `probeRetrieveMultiple`, el disparador del
gateway y sus pruebas específicas.

La reversión local consiste en retirar esos puntos y esta documentación; no
existe migración de datos, cambio de configuración o modificación externa que
revertir.

## Validaciones

- Prueba focalizada Phase1-046: 6/6 aprobadas.
- `npm --prefix server test`: 95/95 aprobadas en 11 archivos.
- `npm --prefix server run build`: aprobado; `Backend syntax check passed.`
- `npm test -- --run`: 342/342 aprobadas en 32 archivos.
- `npm run build`: aprobado con Vite 5.4.21 y 1683 módulos transformados.
- `git diff --check`: aprobado sin errores; las advertencias LF/CRLF son
  informativas.
- `git status --short`: registrado al cierre en la evidencia local.

## Siguiente acción exacta

Solicitar autorización separada para checkpoint y deploy exclusivo del
diagnóstico Phase1-046, sin activar `VITE_PRODUCT_SOURCE=dataverse`. Después,
ejecutar exactamente una vez el smoke test existente Phase1-042 y revisar
únicamente los eventos sanitizados
`PHASE1_046_PRODUCT_QUERY_PROBE`. Con esa evidencia preparar un prompt distinto
de corrección y retirar el diagnóstico temporal cuando la corrección definitiva
quede confirmada.

No hubo commit, push, deploy, smoke test productivo ni consultas adicionales
contra Dataverse productivo durante Phase1-046.

Prompt ejecutado: Phase1-046 — Isolate Dataverse Product Invalid Field or Filter
