# Phase1-089 — Audit Remaining SKULLCANDY Product Conflicts

## Estado

**PASS — AUDITORÍA LOCAL COMPLETADA / SIN CONFLICTOS PRICE REMANENTES / SIN
CAMBIOS FUNCIONALES O EXTERNOS.**

## Objetivo y alcance

Se auditó exclusivamente
`logs/Phase1-089-SKULLCANDY-Filtered.json`, sin consultar Dataverse. El análisis
reproduce la normalización y las fronteras relevantes del Gateway: `trim()` de
SKU y compañía, origen en mayúsculas, `amount null|undefined|'' -> null`, cero
como número real y exclusión de precios fuera de `USA|CHINA`.

La detección se ejecutó primero por `SKU+ORIGIN+BUYER COMPANY`; solo dos o más
`amount` numéricos distintos dentro del grupo constituyen conflicto PRICE.
Después se evaluó `SKU+ORIGIN` para diferencias entre compradores. No se sumó,
promedió, seleccionó el registro más reciente ni aplicó precedencia.

Fuente local: `logs/Phase1-089-SKULLCANDY-Filtered.json`  
SHA-256: `b5b991335ed648c264a647f464fd4bfa3902a131d5b6a27a423b6bc5a7a6604b`

## Resumen obligatorio

| Métrica | Resultado |
| --- | ---: |
| Total de filas analizadas | 426 |
| Total de SKU únicos | 362 |
| Total de grupos `SKU+ORIGIN+BUYER` | 426 |
| Total de grupos `SKU+ORIGIN` | 426 |
| Total de SKU con conflictos PRICE | 0 |
| Conflictos USA (`SKU+ORIGIN`) | 0 |
| Conflictos CHINA (`SKU+ORIGIN`) | 0 |
| Conflictos dentro de la misma compañía | 0 |
| Conflictos cross-buyer observados | 0 |
| Grupos conflictivos con 2 amounts distintos | 0 |
| Grupos conflictivos con 3+ amounts distintos | 0 |

Las 426 filas superan las defensas del Gateway: no hay SKU vacío, comprador no
autorizado, desigualdad entre compañía y comprador, origen vacío ni origen
fuera de `USA|CHINA`. Hay 351 filas USA y 75 CHINA; las 426 pertenecen a
`SAND SPORTS, CORP.`. No hay `amount = null` ni `amount = 0`. Cada grupo
`SKU+ORIGIN+BUYER` y cada grupo `SKU+ORIGIN` contiene exactamente una fila;
por ello no existe una pareja de amounts que pueda formar conflicto PRICE.

## Evidencia de grupos conflictivos

No existen grupos conflictivos que poblar en la tabla solicitada.

| sku | origin | buyerCompany | amounts distintos | cantidad de filas | createdon mínimo | createdon máximo |
| --- | --- | --- | --- | ---: | --- | --- |

## Análisis de `createdon`

Como hay cero grupos PRICE conflictivos, no existe dentro de ese universo un
cambio de amount a través del tiempo, un registro más reciente que seleccionar,
un empate en el `createdon` máximo ni un precio más reciente que comparar con el
anterior. Los cuatro resultados son **no aplicables (0 grupos)**; esto no se
convierte en una regla de `latest wins`.

El contraste directo con el Gateway revela un hallazgo separado: `createdon`
se mapea actualmente a `creationDate` y se compara como atributo invariante por
SKU. Con este payload, 63 SKU tienen más de un `creationDate` distinto y
producen 63 conflictos `ATTRIBUTE / SKU_ATTRIBUTE`. Este hallazgo no es un
conflicto PRICE y no altera los conteos anteriores.

## Comparación con runtime

Se revisó únicamente
`server/src/integrations/dataverse/productPriceLevelGateway.js` y se ejecutó
`consolidateProductPriceLevelRows()` sobre las 426 filas locales.

- El runtime generó **0** conflictos `PRICE / SKU_ORIGIN_BUYER`.
- El runtime generó **0** conflictos `PRICE / SKU_ORIGIN`.
- Por tanto, no hay grupos PRICE detectados que el runtime pueda bloquear bajo
  `scope = SKU_ORIGIN_BUYER`.
- El payload completo sí lanza `PRODUCT_MASTER_CONFLICT`, pero exclusivamente
  por 63 conflictos `ATTRIBUTE / SKU_ATTRIBUTE / creationDate` en 63 SKU.
- El bloqueo observado no puede atribuirse a amounts, al origen ni a
  diferencias entre compradores con esta evidencia.

## Opciones funcionales posibles, sin implementar

1. Preservar la invariancia estricta de `creationDate` y corregir la
   inconsistencia en la fuente antes de cargar el Maestro Producto.
2. Autorizar un hito separado que defina qué fecha representa realmente
   `creationDate` por SKU y, solo con esa definición y una fuente confirmada,
   ajustar su consolidación o mapping.

No hay evidencia que justifique cambiar la regla PRICE, introducir
`latest wins`, promedios, sumas o precedencia entre compradores.

## Recomendación

Mantener sin cambios la detección PRICE: los filtros comerciales actuales dejan
cero conflictos de precio para SKULLCANDY. Antes de cualquier activación,
auditar en un hito separado la semántica de `creationDate`, porque esa es la
única causa de `PRODUCT_MASTER_CONFLICT` reproducida por el runtime con el
archivo autorizado. Hasta contar con una definición funcional, preservar el
bloqueo actual y no inferir una fecha canónica.

## Archivos y reversión

- Creado: `docs/prompts/Phase1-089-AuditRemainingSkullcandyProductConflicts.md`.
- Generado fuera de Git:
  `logs/Phase1-089-AuditRemainingSkullcandyProductConflicts.log`.
- Helper local fuera de Git:
  `logs/Phase1-089-AuditRemainingSkullcandyProductConflicts.mjs`.

Reversión: eliminar únicamente esos tres artefactos. No existe cambio de
runtime, tests, reglas, filtros, timeouts, configuración, Dataverse ni estado
externo que revertir.

## Validación

- Analizador local: **PASS**.
- `git diff --check`: **PASS**.
- `git status --short`:
  `?? docs/prompts/Phase1-089-AuditRemainingSkullcandyProductConflicts.md`.
- No se ejecutaron suites completas, tests, build, deploy, commit ni push.
- Cero cambios funcionales o externos.

Prompt ejecutado: Phase1-089 — Audit Remaining SKULLCANDY Product Conflicts
