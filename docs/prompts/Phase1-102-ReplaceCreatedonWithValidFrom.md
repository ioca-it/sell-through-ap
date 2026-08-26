# Phase1-102 — Replace Product createdon With crbbe_validodesde

## Estado

**PASS — IMPLEMENTED LOCALLY / VALIDATED / NOT DEPLOYED.**

## Objetivo aprobado

Sustituir exclusivamente para Product Master el campo funcional Dataverse
`createdon` por `crbbe_validodesde`, sin reemplazo ciego ni cambios en otros
timestamps técnicos. El contrato de dominio se conserva como
`Product.creationDate`.

## Auditoría dirigida

La búsqueda inicial encontró **91** coincidencias exactas de `createdon` en
archivos versionados. Se clasificaron como runtime/mapping Product,
consolidación/MAX, pruebas/fixtures, Knowledge Base vigente, prompts históricos
y guardas negativas de contrato. Los prompts históricos se preservan como
evidencia del estado que documentaron.

## Regla ejecutable

```text
Dataverse crbbe_validodesde
  -> Product.creationDate

Latest Product record =
MAX(crbbe_validodesde) por SKU + ORIGIN + BUYER COMPANY
```

La selección ocurre después de los filtros comerciales y de marca vigentes y
antes de conflictos/consolidación. USA y CHINA se resuelven por separado; cada
comprador se resuelve por separado antes del conflicto cross-buyer. Todos los
empates exactos en el máximo permanecen y los valores incompatibles conservan
`PRODUCT_MASTER_CONFLICT`. No existe segundo desempate.

`null`, `undefined`, texto vacío o fecha inválida se normalizan a `null`. Está
prohibido usar `createdon` como fallback. Producto Nuevo conserva la edad
estricta `<90 días` desde `Product.creationDate`.

## Query Product autorizada

- Entity Set: `productpricelevels`.
- `$select`: incluye `crbbe_validodesde` y excluye `createdon`.
- `$orderby`: `crbbe_sku asc,crbbe_origen asc,crbbe_companiacompradora asc,crbbe_validodesde asc`.
- `$filter`: conserva compradores IOCA/SAND, igualdad compañía-comprador,
  origen no-null/no-vacío y marca escapada obligatoria.
- Brands conserva su `$apply/filter/groupby` sin cambios.

## Presentación y alcance preservado

Dashboard, Datos Completos, Nuevos no presentes, Informe Ejecutivo, Excel y CSV
continúan consumiendo `creationDate`. El label visible `Fecha de creación` no se
renombra sin definición funcional adicional; queda identificado como posible
ajuste semántico posterior.

Se preservan precios, `0|null`, URLs, EOL, Pareto, reposición, Configuration
Center, Customer, seguridad, timeouts, infraestructura y configuración
Dataverse. No se autoriza commit, push, deploy, cambios de variables ni acciones
externas.

## Validación obligatoria

Ejecutar una sola vez al finalizar:

```text
npm --prefix server test
npm --prefix server run build
npm test -- --run
npm run build
git diff --check
git status --short
git grep -n "createdon"
git grep -n "crbbe_validodesde"
```

La evidencia final se registra en
`logs/Phase1-102-ReplaceCreatedonWithValidFrom.log`.

Prompt ejecutado: Phase1-102 — Replace Product createdon With crbbe_validodesde
