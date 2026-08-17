# Phase1-048 — Resolve Dataverse Product URL Logical Name

## Estado

**PASS — METADATA DIAGNOSTIC IMPLEMENTED / NOT DEPLOYED / NOT EXECUTED / NOT
ACTIVATED.**

## Objetivo ejecutado

Preparar una resolución inequívoca mediante metadata real del LogicalName,
SchemaName, AttributeType y capacidad de lectura del campo funcional URL de
producto asociado a `productpricelevels`, sin corregir por suposición el
Product Gateway ni ejecutar consultas productivas durante la implementación.

La evidencia productiva proporcionada de Phase1-046 confirma:

- PASS para `productpricelevels`, los otros doce campos, filtros, orden,
  FormattedValue y `$top`.
- FAIL para `select_field=producturl`, `product_select` y
  `product_master_query`.

Por tanto, Phase1-048 no asume que el campo funcional no exista: resuelve su
metadata antes de autorizar una corrección definitiva.

## Activación temporal

El Product Price Level Gateway conserva su flujo y consulta normal. Después
del `DATAVERSE_INVALID_FIELD_OR_FILTER / 400`, Phase1-046 ejecuta sus probes;
Phase1-048 se encadena solamente cuando el probe individual
`select_field=producturl` produce `FAIL`.

No existe endpoint nuevo, trigger frontend ni parámetro público. La bandera
module-scope de Phase1-048 se establece antes del primer `await`, de modo que
requests concurrentes o posteriores no pueden iniciar una segunda lectura de
metadata dentro del mismo proceso.

## Consulta de metadata

Dataverse Client realiza dos GET internos y acotados:

1. `EntityDefinitions` con `$select=LogicalName,EntitySetName`, filtro exacto
   `EntitySetName eq 'productpricelevels'` y `$top=2`; exige una única entidad.
2. `EntityDefinitions(LogicalName='<resuelto>')/Attributes` con
   `$select=LogicalName,SchemaName,AttributeType,IsValidForRead` y filtro en
   servidor por `contains(LogicalName,'url'|'product'|'producto')`.

Esta navegación demuestra que los atributos devueltos pertenecen directamente
a la entidad asociada con el Entity Set confirmado. `AttributeType` e
`IsValidForRead` permiten distinguir el tipo y la capacidad declarada de
lectura; cualquier necesidad de otra forma de acceso se decidirá solo con la
captura real, no por inferencia local.

## Logging y sanitización

Cada evento JSON contiene exclusivamente:

```text
component=ProductPriceLevelMetadataDiagnostic
diagnosticId=PHASE1_048_PRODUCT_URL_METADATA
logicalName
schemaName
attributeType
isValidForRead
result=CANDIDATE|NOT_CANDIDATE
```

El cliente reduce cada atributo a las cuatro propiedades allowlisted antes de
entregarlo al diagnóstico. El logger valida nombres y tipos técnicos; entradas
con saltos de línea u otros caracteres no permitidos se omiten. Nunca registra
filas Product, SKU, nombres, precios, URL almacenada, payload completo de
metadata, query completa, token, JWT, Authorization, secreto, PII o stack
trace. Los errores de metadata/logger se absorben y se conserva el error
Product original `502 / DATAVERSE_REQUEST_FAILED`.

## Archivos

### Creados

- `server/src/integrations/dataverse/productPriceLevelMetadataDiagnostic.js`.
- `server/tests/productPriceLevelMetadataDiagnostic.node-test.js`.
- `docs/prompts/Phase1-048-ResolveDataverseProductUrlLogicalName.md`.
- `logs/Phase1-048-ResolveDataverseProductUrlLogicalName.log` (local,
  excluido de Git).

### Modificados

- `server/src/integrations/dataverse/dataverseClient.js`.
- `server/src/integrations/dataverse/productPriceLevelQueryDiagnostic.js`.
- `server/tests/dataverseClient.node-test.js`.
- `server/tests/productPriceLevelQueryDiagnostic.node-test.js`.
- `server/tests/productApi.node-test.js`.
- `docs/knowledge/ARCHITECTURE_STATE.md`.
- `docs/knowledge/DATA_SOURCES.md`.
- `docs/knowledge/ROADMAP.md`.
- `docs/knowledge/CHANGELOG.md`.

## Reglas y contratos preservados

- Product Gateway y su Entity Set `productpricelevels`: sin modificación.
- Candidato `producturl`: permanece en `$select` y mapping; no se sustituye.
- Contrato `productUrl`: permanece íntegro; no se elimina.
- Mappings confirmados, compradores/filtro, orderby y FormattedValue: sin
  cambios.
- Consolidación/pivot USA-CHINA, `0`/`null`, conflictos y `fechaStr`: sin
  cambios.
- Product Domain, Provider, Repository, Application Service y frontend: sin
  cambios.
- Customer Master, variables, Vercel, Render, Entra y Dataverse: sin cambios.

## Pruebas y validaciones

- Pruebas focalizadas de integración/diagnóstico: 57/57 aprobadas.
- Backend completo: 101/101 aprobadas en 12 archivos.
- Backend build: aprobado; `Backend syntax check passed.`
- Frontend completo: 342/342 aprobadas en 32 archivos.
- Frontend build: aprobado con Vite 5.4.21 y 1683 módulos transformados.
- `git diff --check`: aprobado sin errores.
- `git status --short`: registrado al cierre en la evidencia local.

## Temporalidad, riesgo y reversión

Phase1-048 es **TEMPORAL**. Su único efecto remoto futuro son dos GET de
metadata después del fallo individual de `producturl` y como máximo una vez
por proceso. No lee ni modifica filas Product.

La reversión consiste en retirar
`productPriceLevelMetadataDiagnostic.js`, el método metadata temporal del
Dataverse Client, el hook del diagnóstico Phase1-046 y sus pruebas. Una vez
confirmado/corregido el LogicalName definitivo mediante otro prompt, deben
retirarse simultáneamente los diagnósticos Phase1-046 y Phase1-048.

## Siguiente acción exacta

Solicitar autorización separada para crear el checkpoint y desplegar
exclusivamente el backend Phase1-048, sin cambiar `VITE_PRODUCT_SOURCE=local`
ni variables. Tras el reinicio del proceso, ejecutar exactamente una vez el
smoke existente `?phase1-042-product-smoke=1` y capturar únicamente eventos
`PHASE1_048_PRODUCT_URL_METADATA`. Con esa metadata preparar un prompt distinto
que corrija el LogicalName del Gateway, valide la consulta final y retire los
diagnósticos temporales Phase1-046/048.

No hubo commit, push, deploy, smoke test productivo ni consultas adicionales
contra Dataverse productivo durante Phase1-048.

Prompt ejecutado: Phase1-048 — Resolve Dataverse Product URL Logical Name
