# Phase1-090 — Resolve Product Duplicates by Latest Record

## Estado

**PASS — IMPLEMENTED LOCALLY / VALIDATED / NOT DEPLOYED.**

## Objetivo y regla implementada

Product Price Level Gateway aplica, después de los filtros Product actuales:

```text
Latest Product record =
MAX(createdon) por SKU + ORIGIN + BUYER COMPANY
```

La selección ocurre antes de conflictos PRICE, conflictos de atributos y
consolidación Product. Las filas anteriores al máximo quedan fuera. No se
selecciona una fila global por SKU ni se añade lógica en React.

El `createdon` ya formaba parte de `$select` y `$orderby`; no fue necesario
cambiar la query, filtros, paginación o contrato Dataverse.

## Comportamiento funcional

### USA y CHINA

Cada origen resuelve su `MAX(createdon)` independientemente dentro de cada
comprador. Solo después se ejecuta el pivot vigente:

- `USA -> priceUSA`.
- `CHINA -> priceChina`.

No existe fallback entre orígenes. `amount = 0` continúa siendo precio real y
el amount vigente `null|ausente` continúa como precio no disponible.

### Empate en el máximo

Todas las filas del mismo grupo empatadas exactamente en el máximo permanecen
en la consolidación. Si sus valores son equivalentes consolidan normalmente;
si contienen amounts o atributos incompatibles mantienen
`PRODUCT_MASTER_CONFLICT`. No existe segunda precedencia.

### Cross-buyer

IOCA y SAND se resuelven primero, cada uno dentro de su propio grupo
`SKU+ORIGIN+BUYER`. Después se aplica la comparación vigente por `SKU+ORIGIN`.
Si los valores actuales difieren, se conserva conflicto `PRICE / SKU_ORIGIN`;
ningún comprador tiene prioridad.

### `Product.creationDate`

`creationDate` es el mayor `createdon` entre las filas vigentes seleccionadas
para el SKU. Por tanto, máximos distintos de USA y CHINA no son conflicto de
atributo: el Product publica el mayor de ambos. El New Product Domain Service
continúa evaluando estrictamente `<90 días` sobre esa fecha.

## Cobertura

Las pruebas backend demuestran:

- MAX independiente para USA y CHINA.
- Pivot con máximos distintos por origen.
- independencia del orden de entrada.
- exclusión de precio y atributo históricos.
- conflicto ante empate máximo incompatible.
- resolución por comprador antes del conflicto cross-buyer.
- preservación de `0` y `null` vigentes.
- `creationDate = MAX(createdon)` entre registros vigentes del SKU.

La prueba frontend existente
`src/application/__tests__/productMasterIntegration.test.js` mantiene la regla
Producto Nuevo: 89 días clasifica y 90 días no clasifica.

## Evidencia local SKULLCANDY

Fuente exclusiva: `logs/Phase1-089-SKULLCANDY-Filtered.json`. No se consultó ni
modificó Dataverse.

| Métrica | Resultado |
| --- | ---: |
| Filas recibidas/elegibles | 426 / 426 |
| Grupos `SKU+ORIGIN+BUYER` | 426 |
| Filas vigentes seleccionadas | 426 |
| Filas históricas descartadas | 0 |
| Grupos con empate en MAX | 0 |
| Products consolidados | 362 |
| Conflictos PRICE restantes | 0 |
| Conflictos ATTRIBUTE restantes | 0 |
| Conflictos totales restantes | 0 |

La muestra no contiene más de una fila por grupo comercial, por lo que no
ejercita descarte histórico real; los casos controlados sí lo cubren. La nueva
regla elimina los 63 conflictos `creationDate` observados en Phase1-089 al
calcular la fecha final conforme a la regla aprobada.

## Arquitectura y alcance preservado

Permanece `UI -> Application Service -> Domain Service -> Repository ->
Provider -> Fuente`. Solo cambian la consolidación backend y sus pruebas. Se
preservan filtros, brand antes de `retrieveAll()`, Brands con
`$apply/filter/groupby`, mappings, contratos HTTP, Customer, providers,
JWT/MSAL, CORS/rate limiting, timeouts, tracing y fuentes.

## Archivos

Modificados:

- `server/src/integrations/dataverse/productPriceLevelGateway.js`.
- `server/tests/productPriceLevelGateway.node-test.js`.
- `docs/knowledge/ARCHITECTURE_STATE.md`.
- `docs/knowledge/ROADMAP.md`.
- `docs/knowledge/BUSINESS_RULES.md`.
- `docs/knowledge/DATA_SOURCES.md`.
- `docs/knowledge/CHANGELOG.md`.
- `docs/knowledge/DECISIONS.md`.

Creados:

- `docs/prompts/Phase1-090-ResolveProductDuplicatesByLatestRecord.md`.
- `logs/Phase1-090-ResolveProductDuplicatesByLatestRecord.log`, fuera de Git.
- `logs/Phase1-090-ValidateLatestProductRecords.mjs`, helper fuera de Git.

`docs/prompts/Phase1-089-AuditRemainingSkullcandyProductConflicts.md` ya estaba
sin seguimiento al iniciar Phase1-090 y se preservó sin modificar.

## Validación

- Analizador SKULLCANDY: **PASS**, 362 productos y 0 conflictos.
- `npm --prefix server test`: **PASS**, 137/137.
- `npm --prefix server run build`: **PASS**.
- `npm test -- --run`: **PASS**, 33 archivos y 391/391.
- `npm run build`: **PASS**, 1684 módulos transformados.
- `git diff --check`: **PASS**.

`git status --short`:

```text
 M docs/knowledge/ARCHITECTURE_STATE.md
 M docs/knowledge/BUSINESS_RULES.md
 M docs/knowledge/CHANGELOG.md
 M docs/knowledge/DATA_SOURCES.md
 M docs/knowledge/DECISIONS.md
 M docs/knowledge/ROADMAP.md
 M server/src/integrations/dataverse/productPriceLevelGateway.js
 M server/tests/productPriceLevelGateway.node-test.js
?? docs/prompts/Phase1-089-AuditRemainingSkullcandyProductConflicts.md
?? docs/prompts/Phase1-090-ResolveProductDuplicatesByLatestRecord.md
```

## Riesgos, reversión y paso externo pendiente

El riesgo residual es un empate real en el máximo con datos incompatibles;
queda bloqueado explícitamente. Reversión local: retirar el selector temporal,
volver a comparar `creationDate` como atributo, retirar las nuevas pruebas y
restaurar esta documentación. No existe migración ni estado externo que
revertir.

Para deploy/presentación falta autorización externa para desplegar el backend;
si Product Dataverse aún no está activo en el entorno objetivo, configurar
`VITE_PRODUCT_SOURCE=dataverse`, reconstruir/desplegar el frontend y validar una
vez el flujo Marca → Product Master → Producto Nuevo. Phase1-090 no ejecuta
ninguna de esas acciones.

No hubo commit, push, deploy, consulta/modificación Dataverse ni cambios en
Vercel, Render o Entra.

Prompt ejecutado: Phase1-090 — Resolve Product Duplicates by Latest Record
