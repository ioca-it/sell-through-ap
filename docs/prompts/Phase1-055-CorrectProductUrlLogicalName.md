# Phase1-055 — Correct Product URL Logical Name and Remove Temporary Diagnostics

## Estado

**PASS — PRODUCT URL LOGICAL NAME CORRECTED / TEMPORARY DIAGNOSTICS
REMOVED / NOT DEPLOYED / NOT ACTIVATED.**

## Objetivo ejecutado

Corregir definitivamente el LogicalName Dataverse del URL de Product Master y
retirar los diagnósticos temporales Phase1-046/048/050/052 usados para aislar
la falla, sin modificar el contrato normalizado ni activar Product Dataverse.

## Causa confirmada y contrato final

- LogicalName anterior incorrecto: `producturl`.
- LogicalName confirmado: `crbbe_urlproducto`.
- Mapping exclusivo de integración: `crbbe_urlproducto` → `productUrl`.
- `productUrl` conserva `trim()`; `null`, `undefined` o texto vacío producen
  `""`.
- El contrato Product no expone `crbbe_urlproducto` ni otro nombre físico.

Product Price Level Gateway usa `crbbe_urlproducto` en `$select` y mapping.
Entity Set `productpricelevels`, los demás LogicalNames, el filtro de compradores
`IOCA USA INC` o `SAND SPORTS, CORP.`, FormattedValue de `level`/`status` y el
orden backend permanecen intactos.

## Diagnósticos retirados

Phase1-046 queda retirado completamente:

- módulo de Product query probes;
- import y hook desde Product Price Level Gateway;
- guard once-per-process;
- ruta `probeRetrieveMultiple` del Dataverse Client;
- prueba exclusiva del diagnóstico.

Phase1-048/050/052 queda retirado completamente:

- módulo de metadata Product URL;
- hook desde la secuencia Phase1-046;
- guard once-per-process y observabilidad temporal;
- rutas de `EntityDefinitions` y `Attributes` del Dataverse Client;
- prueba exclusiva y casos de metadata temporales.

No quedan referencias runtime a `PHASE1_046_PRODUCT_QUERY_PROBE` ni
`PHASE1_048_PRODUCT_URL_METADATA`. El diagnóstico general sanitizado de
Dataverse Phase1-020 permanece operativo y cubierto: clasificación HTTP/OData,
respuesta inválida y red, con contratos públicos sanitizados.

## Reglas y contratos preservados

- `crbbe_nombremarca` → `brand`.
- `crbbe_sku` → `sku`.
- `crbbe_nombreproducto` → `productName`.
- `crbbe_nombrecategoria` → `category`.
- `crbbe_validohasta` → `discontinuationDate`.
- `createdon` → `creationDate`.
- `crbbe_clasificacioncomercial` → `level`.
- `crbbe_etapa` → `status`.
- `crbbe_imagenproducto` → `imageUrl`.
- `amount` con `crbbe_origen=USA` → `priceUSA`.
- `amount` con `crbbe_origen=CHINA` → `priceChina`.
- `amount=0` permanece como precio real; `null`/`undefined` o ausencia de un
  origen permanecen como `null`, sin fallback cruzado.
- `PRODUCT_MASTER_CONFLICT`, conflictos de atributos, `fechaStr` canónico,
  Product Domain/Provider/Repository/Application Service y Product API.
- Customer Master, contratos HTTP, autenticación y
  `VITE_PRODUCT_SOURCE=local`.

## Cobertura

Las pruebas del gateway verifican explícitamente:

1. `$select` contiene `crbbe_urlproducto`.
2. `$select` no contiene `producturl`.
3. valor válido de `crbbe_urlproducto` produce `productUrl` trimmed.
4. `null` produce `productUrl: ""`.
5. `undefined` produce `productUrl: ""`.
6. espacios producen `productUrl: ""`.
7. el contrato Product no expone `crbbe_urlproducto`.
8. mappings restantes y FormattedValue permanecen intactos.
9. filtros de ambas compañías permanecen exactos.
10. pivot USA/CHINA permanece intacto.
11. precios `0`/`null` permanecen intactos.
12. conflictos de precio y atributos permanecen intactos.
13. Product API conserva respuesta, errores y seguridad.
14. Customer Master conserva su contrato y API.
15. Dataverse Client expone solo `retrieveMultiple` y `retrieveAll`; el escaneo
    de runtime confirma que no quedan diagnósticos Product temporales.

## Archivos

### Creados

- `docs/prompts/Phase1-055-CorrectProductUrlLogicalName.md`.
- `logs/Phase1-055-CorrectProductUrlLogicalName.log` (evidencia local excluida
  de Git).

### Modificados

- `server/src/integrations/dataverse/dataverseClient.js`.
- `server/src/integrations/dataverse/productPriceLevelGateway.js`.
- `server/tests/dataverseClient.node-test.js`.
- `server/tests/productApi.node-test.js`.
- `server/tests/productPriceLevelGateway.node-test.js`.
- `docs/knowledge/ARCHITECTURE_STATE.md`.
- `docs/knowledge/DATA_SOURCES.md`.
- `docs/knowledge/ROADMAP.md`.
- `docs/knowledge/CHANGELOG.md`.

### Eliminados

- `server/src/integrations/dataverse/productPriceLevelQueryDiagnostic.js`.
- `server/src/integrations/dataverse/productPriceLevelMetadataDiagnostic.js`.
- `server/tests/productPriceLevelQueryDiagnostic.node-test.js`.
- `server/tests/productPriceLevelMetadataDiagnostic.node-test.js`.

## Validaciones ejecutadas

- Backend focalizado Product/Dataverse: 46/46 aprobadas.
- Backend completo: 90/90 aprobadas.
- Backend build/syntax: `Backend syntax check passed.`
- Frontend completo: 342/342 aprobadas en 32 archivos.
- Frontend build: Vite 5.4.21, 1683 módulos transformados, aprobado.
- Escaneo runtime: sin referencias a los dos IDs temporales, módulos de
  diagnóstico, probes o rutas metadata retiradas.
- `git diff --check`: aprobado sin errores; avisos LF/CRLF informativos.
- `logs/` confirmado excluido de Git.

## Riesgo y reversión

El cambio está acotado a un LogicalName del Product Gateway y al retiro del
código diagnóstico temporal. La reversión local consiste en restaurar el diff
de este hito; no requiere cambiar fuente, variables, infraestructura o datos.
No se ejecutó smoke, deploy ni operación contra Dataverse.

## Restricciones respetadas

No hubo commit, push, deploy, smoke test, cambio de variables, modificación de
Dataverse, cambio en Vercel/Render/Entra ni activación global de Product
Dataverse.

Prompt ejecutado: Phase1-055 — Correct Product URL Logical Name and Remove Temporary Diagnostics
