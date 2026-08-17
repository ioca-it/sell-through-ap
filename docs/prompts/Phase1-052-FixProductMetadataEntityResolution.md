# Phase1-052 — Fix Product Metadata Entity Resolution

## Estado

**PASS — PRODUCT METADATA ENTITY RESOLUTION FIXED / NOT DEPLOYED / NOT
EXECUTED / NOT ACTIVATED.**

## Objetivo ejecutado

Corregir exclusivamente la resolución de EntityDefinition del diagnóstico
temporal Phase1-048/050 para el Entity Set confirmado `productpricelevels` y
permitir que continúe hacia `Attributes`, sin asumir el LogicalName de la tabla
ni modificar el Product Gateway definitivo.

## Evidencia de entrada

- Phase1-046 confirmó `productpricelevels` y doce campos Product individuales.
- `producturl`, el select Product y la consulta compuesta fallaron.
- Phase1-050 confirmó `TRIGGER/REACHED` seguido de
  `ENTITY_DEFINITION/FAIL`; no existía evento `ATTRIBUTES`.
- Una consulta directa a `/api/data/v9.2/productpricelevels` devolvió registros.
- Este hito no ejecutó Dataverse productivo.

## Causa técnica exacta

La consulta anterior era:

```text
EntityDefinitions
  ?$select=LogicalName,EntitySetName
  &$filter=EntitySetName eq 'productpricelevels'
  &$top=2
```

`EntitySetName` es una propiedad primitiva válida para `$filter`, pero las
consultas de definiciones de Dataverse no tienen paginación ni requieren
límites: la primera respuesta devuelve todas las coincidencias. El `$top=2`
añadido por Phase1-048 estaba fuera de ese patrón de metadata y provocaba el
fallo HTTP antes de que el diagnóstico pudiera validar una EntityDefinition o
consultar `Attributes`.

## Mecanismo corregido

1. Consultar `EntityDefinitions` únicamente con
   `$select=LogicalName,EntitySetName` y el `$filter` exacto por
   `EntitySetName=productpricelevels`.
2. Filtrar de nuevo la respuesta en memoria por igualdad exacta.
3. Exigir exactamente una coincidencia.
4. Validar sintácticamente el `LogicalName` devuelto.
5. Usar ese valor, y ningún nombre asumido, en
   `EntityDefinitions(LogicalName='<resuelto>')/Attributes`.
6. Solicitar solo `LogicalName`, `SchemaName`, `AttributeType` e
   `IsValidForRead`, filtrando por `url`, `product` o `producto`.

Dataverse Client separa ahora la resolución de EntityDefinition y la lectura de
Attributes. El diagnóstico puede emitir un resultado preciso al completar cada
frontera antes de iniciar la siguiente.

## Observabilidad sanitizada

Secuencia posible:

```text
TRIGGER / REACHED
ENTITY_DEFINITION / PASS|FAIL
ATTRIBUTES / PASS|FAIL
CANDIDATES / FOUND|NONE
```

Los candidatos contienen solo las cinco propiedades técnicas allowlisted
vigentes. No se registran datos Product, SKU, precios, URLs almacenadas,
payloads completos, tokens/JWT, Authorization, secretos, PII, stack traces o
mensajes OData completos. Los fallos continúan absorbidos para preservar el 502
Product original y la secuencia Phase1-046.

## Once-per-process y concurrencia

La guardia module-scope permanece asignada antes del primer `await`. Dos
invocaciones concurrentes producen una sola resolución, una sola consulta de
Attributes y una sola secuencia de eventos.

## Archivos

### Creados

- `docs/prompts/Phase1-052-FixProductMetadataEntityResolution.md`.
- `logs/Phase1-052-FixProductMetadataEntityResolution.log` (evidencia local
  excluida de Git).

### Modificados

- `server/src/integrations/dataverse/dataverseClient.js`.
- `server/src/integrations/dataverse/productPriceLevelMetadataDiagnostic.js`.
- `server/tests/dataverseClient.node-test.js`.
- `server/tests/productPriceLevelMetadataDiagnostic.node-test.js`.
- `server/tests/productPriceLevelQueryDiagnostic.node-test.js`.
- `docs/knowledge/ARCHITECTURE_STATE.md`.
- `docs/knowledge/DATA_SOURCES.md`.
- `docs/knowledge/ROADMAP.md`.
- `docs/knowledge/CHANGELOG.md`.

`productPriceLevelGateway.js` y el Product Gateway definitivo no fueron
modificados.

## Reglas, fuentes, parámetros y contratos preservados

- Entity Set Product `productpricelevels`.
- Candidato/mapping vigente `producturl` → `productUrl`.
- Filtros, orden, FormattedValue y `$top` de consultas de datos Product.
- Pivot USA/CHINA, precios `0`/`null`, conflictos y `fechaStr`.
- Product Domain, Provider, Repository, Application Service y frontend.
- Customer Master, variables, autenticación e infraestructura.

## Pruebas obligatorias

- Resolución exacta de EntityDefinition sin `$top` de metadata.
- LogicalName dinámico tomado de la respuesta y reutilizado en Attributes.
- Fallo sanitizado de EntityDefinition.
- `ENTITY_DEFINITION/PASS` antes de continuar hacia Attributes.
- Fallo sanitizado de Attributes y `ATTRIBUTES/PASS` cuando completa.
- Candidatos allowlisted y rechazo de nombres inseguros.
- Once-per-process y concurrencia.
- Regresión Product y Customer, backend y frontend completos.

## Validaciones ejecutadas

- Backend focalizado Product/Customer: 75/75 aprobadas.
- Backend completo: 104/104 aprobadas.
- Frontend completo: 342/342 aprobadas en 32 archivos.
- Backend build/syntax: `Backend syntax check passed.`
- Frontend build: Vite 5.4.21, 1683 módulos transformados, aprobado.
- `git diff --check`: aprobado sin errores; avisos LF/CRLF informativos.
- Product Price Level Gateway: sin diff.
- `logs/` confirmado excluido por `.gitignore`.

## Riesgo y reversión

El cambio solo afecta el diagnóstico Product temporal. La reversión local
consiste en restaurar la resolución combinada anterior y sus pruebas; no
requiere cambios de fuente, variables, gateway o contratos. Phase1-046/048/050/
052 deben retirarse con la corrección definitiva basada en candidatos reales.

## Siguiente acción exacta

Después de revisar este diff, solicitar autorización separada para checkpoint y
deploy exclusivo del backend Phase1-052, sin cambiar
`VITE_PRODUCT_SOURCE=local`. Tras reiniciar el proceso, ejecutar exactamente una
vez `?phase1-042-product-smoke=1` y capturar la secuencia
`PHASE1_048_PRODUCT_URL_METADATA`. Solo con candidatos reales se debe preparar
otro prompt para corregir el Gateway y retirar los diagnósticos temporales.

No hubo commit, push, deploy, smoke productivo, consulta productiva ni cambio en
Vercel, Render, Entra o Dataverse.

Prompt ejecutado: Phase1-052 — Fix Product Metadata Entity Resolution
