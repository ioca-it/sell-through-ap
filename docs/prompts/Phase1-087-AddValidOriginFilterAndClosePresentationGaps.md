# Phase1-087 — Add Valid Origin Filter and Close Presentation Gaps

## Estado

**IMPLEMENTED LOCALLY / NOT DEPLOYED.**

## Objetivo y alcance

Dejar la versión local lista para presentación con el cambio mínimo: exigir
origen válido en el universo comercial de Product y revisar, sin reimplementar,
los ocho entregables Astrid cerrados en Phase1-084.

## Product Master y Brands

El Gateway construye en backend el filtro Product:

```text
(
  crbbe_companiacompradora eq 'IOCA USA INC'
  or crbbe_companiacompradora eq 'SAND SPORTS, CORP.'
)
and crbbe_nombrecompania eq crbbe_companiacompradora
and crbbe_origen ne null
and crbbe_origen ne ''
and crbbe_nombremarca eq '<brand escapada>'
```

Las condiciones de origen preceden a `retrieveAll()` y consolidación. Brands
reutiliza el mismo universo dentro de `$apply=filter(...)/groupby((marca))`.
La defensa Node excluye origen null, vacío o solo espacios si una respuesta
upstream incumple el predicado; no sustituye el ahorro server-side.

Se preservan pivot USA/CHINA, `amount 0 -> 0`, `amount null|ausente -> null`,
mappings, FormattedValue y bloqueo de conflictos reales. No hay precedencia,
deduplicación arbitraria ni regla de último precio.

## Gap-check Phase1-084

Quedaron conectados y visibles, sin correcciones adicionales: KPI y tabla de
Nuevos no presentes, `creationDate`, Excel de Tránsito y Reposición sugerida,
leyenda de rotación, explicación EOL y Trimestral=13. Producto Nuevo conserva
`<90 días`, fuente Product Master, cruce por SKU, conteo de SKU y ausencia de
reposición.

## Riesgos y reversión

La sintaxis usa operadores OData/Dataverse `ne null` y `ne ''`. Una validación
real requiere deploy autorizado separado. Reversión: retirar solo ambas
condiciones de origen, la defensa correspondiente, sus pruebas y esta
documentación; no existe estado externo que revertir.

## Validación

La ejecución única solicitada y sus conteos se registran en:
`logs/Phase1-087-AddValidOriginFilterAndClosePresentationGaps.log`.

No hubo commit, push, deploy, cambio de variables, Dataverse, Entra, Vercel,
Render, timeouts o smokes.

Prompt ejecutado: Phase1-087 — Add Valid Origin Filter and Close Presentation Gaps
