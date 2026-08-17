# Phase1-044 — Correct Dataverse Product EntitySetName

## Estado

**PASS — CORRECTED / NOT REVALIDATED / NOT ACTIVATED.**

## Objetivo ejecutado

Corregir exclusivamente el Entity Set usado por Product Price Level Gateway
en la consulta Dataverse del Maestro Producto:

```text
productpricelevel -> productpricelevels
```

El smoke Product confirmado alcanzó Render, aceptó el JWT e intentó la
consulta Dataverse; `retrieveMultiple` devolvió HTTP 404 con el valor singular.
El Entity Set plural `productpricelevels` fue confirmado como el endpoint
técnico correcto. Este prompt no ejecuta otro smoke productivo.

## Cambio runtime

`server/src/integrations/dataverse/productPriceLevelGateway.js` conserva la
misma constante de fuente y modifica únicamente su `entitySet`. El comentario
técnico de esa frontera se sincroniza con el valor plural. No cambian campos,
select, filtro, orden, paginación, FormattedValue, consolidación ni contratos.

## Mapping y reglas preservados

Se preserva sin cambios el mapping:

- `crbbe_nombremarca` → `brand`.
- `crbbe_sku` → `sku`.
- `crbbe_nombreproducto` → `productName`.
- `crbbe_nombrecategoria` → `category`.
- `crbbe_validohasta` → `discontinuationDate`.
- `createdon` → `creationDate`.
- `crbbe_clasificacioncomercial` → `level`.
- `crbbe_etapa` → `status`.
- `crbbe_imagenproducto` → `imageUrl`.
- `producturl` → `productUrl`.
- `amount` con `crbbe_origen=USA` → `priceUSA`.
- `amount` con `crbbe_origen=CHINA` → `priceChina`.

El filtro continúa limitado a `IOCA USA INC` o `SAND SPORTS, CORP.`. También
se preservan `amount=0` como precio real, `null|undefined` como precio ausente,
orígenes faltantes en `null`, `PRODUCT_MASTER_CONFLICT`, conflictos de
atributos, FormattedValue para `level`/`status`, `fechaStr=YYYY-MM-DD`, el
contrato Product y Maestro Cliente.

## Pruebas ajustadas

`server/tests/productPriceLevelGateway.node-test.js`:

- exige exactamente `productpricelevels` en la llamada runtime a
  `dataverseClient.retrieveAll`;
- añade una prueba independiente que falla si el gateway vuelve a usar
  `productpricelevel`;
- conserva las aserciones del filtro, campos, FormattedValue, precios,
  conflictos, atributos y contrato sanitizado.

La prueba focalizada aprobó 30/30 casos. La suite backend completa incluye la
regresión de Maestro Cliente y aprobó 87/87.

## Documentación

- Creado `docs/prompts/Phase1-044-CorrectProductEntitySetName.md`.
- Actualizados `docs/knowledge/ARCHITECTURE_STATE.md`,
  `docs/knowledge/DATA_SOURCES.md`, `docs/knowledge/CHANGELOG.md` y
  `docs/knowledge/ROADMAP.md`.
- Las referencias vigentes autorizadas describen `productpricelevels` como
  Entity Set actual. Las menciones singulares que explican el estado anterior
  o actúan como aserción negativa se preservan como evidencia histórica o de
  regresión.
- Evidencia local: `logs/Phase1-044-CorrectProductEntitySetName.log`, excluida
  de Git.

## Validaciones

- `node --test server/tests/productPriceLevelGateway.node-test.js`: 30/30.
- `npm --prefix server test`: 87/87.
- `npm --prefix server run build`: aprobado; `Backend syntax check passed.`
- `npm test -- --run`: 342/342 en 32 archivos.
- `npm run build`: aprobado con Vite 5.4.21 y 1683 módulos transformados.
- `git diff --check`: aprobado sin errores.
- `git status --short`: se registra al cierre en el log local.

## Alcance, riesgos y reversión

El riesgo queda limitado a la exactitud del Entity Set confirmado. La
reversión consiste en restaurar este cambio acotado de gateway, prueba y
documentación; no existe migración de datos ni modificación remota que
revertir. Restaurar el singular reintroduciría el HTTP 404 confirmado.

No se modificaron frontend, Product Provider, contratos HTTP, autenticación,
variables, Vercel, Render, Dataverse, mappings, filtros, semántica de precios,
conflictos o `fechaStr`. No hubo commit, push, deploy ni smoke productivo.

Prompt ejecutado: Phase1-044 — Correct Dataverse Product EntitySetName
