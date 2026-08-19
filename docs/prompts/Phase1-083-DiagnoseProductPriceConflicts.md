# Phase1-083 — Diagnose Product Price Conflicts

## Estado

**PASS — CONFLICT REPRODUCED / ROOT CONDITION IDENTIFIED / NO FUNCTIONAL CHANGE.**

## Objetivo ejecutado

Diagnosticar localmente por qué el Product Master real de `SKULLCANDY`
responde `PRODUCT_MASTER_CONFLICT`, sin modificar consolidación, mapping,
Provider, contratos, runtime, fuentes, variables o infraestructura externa.

La única evidencia de datos utilizada fue
`logs/Phase1-083-SKULLCANDY-Raw.json`. El analizador temporal y el resultado
permanecen bajo `logs/`, excluidos de Git.

## Condición exacta

`ProductPriceLevelGateway` normaliza cada fila y aplica dos controles
independientes:

1. Para precio, ignora `amount = null`, agrupa números por
   `SKU + origin + buyerCompany` y por `SKU + origin`, y crea conflicto cuando
   el set contiene más de un número distinto. Si ya existe conflicto dentro de
   una compañía para un SKU/origen, no duplica ese mismo caso como conflicto
   cross-company. Cero es un número real y compite contra cualquier número
   distinto.
2. Para atributos, agrupa por SKU cada valor no vacío de nueve atributos,
   incluido `createdon -> creationDate`. Más de un instante ISO distinto para
   `creationDate` crea un conflicto `ATTRIBUTE / SKU_ATTRIBUTE` aunque el precio
   sea igual.

Cualquier conflicto de precio o atributo lanza
`ProductMasterConflictError`, código `PRODUCT_MASTER_CONFLICT`, HTTP 409. El
frontend traduce ese único código al texto público de precios duplicados; por
eso el mensaje también aparece para diferencias exclusivamente de `createdon`.

## Resultado SKULLCANDY

| Métrica | Resultado |
| --- | ---: |
| Filas analizadas/elegibles | 2.646 / 2.646 |
| SKU únicos | 436 |
| SKU que activan algún conflicto actual | 354 |
| SKU con conflicto numérico de precio | 11 |
| Combinaciones SKU/origen con conflicto de precio | 11 |
| USA / CHINA | 11 / 0 |
| Entre compañías / dentro de la misma compañía | 0 / 11 |
| Conflicto exclusivo por `createdon` | 343 SKU |
| Conflicto de precio separado únicamente por distintos `createdon` | 11 combinaciones |
| Filas `amount = 0` / `amount` no disponible en la evidencia | 0 / 0 |

Los 11 conflictos de precio pertenecen a `USA`, ocurren dentro de
`SAND SPORTS, CORP.`, contienen exactamente dos filas numéricas por
SKU/origen y presentan importes y `createdon` distintos. No hay conflicto
China ni diferencia de precio entre compradores.

Distribución de registros numéricos por combinación conflictiva:

| Registros por SKU/origen | Combinaciones | Participación |
| ---: | ---: | ---: |
| 2 | 11 | 100% |

## Ejemplos representativos

| sku | origin | buyerCompany | amount | createdon |
| --- | --- | --- | ---: | --- |
| S2JPW-M003 | USA | SAND SPORTS, CORP. | 14.1 | 2023-04-16T21:20:18.000Z |
| S2JPW-M003 | USA | SAND SPORTS, CORP. | 14.5 | 2023-04-16T21:45:57.000Z |
| S2RLW-Q740 | USA | SAND SPORTS, CORP. | 50.5 | 2023-06-07T12:55:57.000Z |
| S2RLW-Q740 | USA | SAND SPORTS, CORP. | 44.9 | 2023-06-07T12:56:11.000Z |
| S2TAW-R740 | USA | SAND SPORTS, CORP. | 18.9 | 2023-06-14T20:50:03.000Z |
| S2TAW-R740 | USA | SAND SPORTS, CORP. | 19.79 | 2023-06-14T20:50:29.000Z |
| S5CSW-M448 | USA | SAND SPORTS, CORP. | 23.5 | 2023-04-16T21:14:02.000Z |
| S5CSW-M448 | USA | SAND SPORTS, CORP. | 24 | 2023-04-16T21:39:57.000Z |
| S5CSW-M712 | USA | SAND SPORTS, CORP. | 23.5 | 2023-04-16T21:21:55.000Z |
| S5CSW-M712 | USA | SAND SPORTS, CORP. | 24 | 2023-04-16T21:47:51.000Z |

## Semántica de amount y papel de createdon

El modelo implementado distingue correctamente:

```text
amount = 0          -> precio real cero; participa en conflictos
amount null         -> precio no disponible; no participa
amount undefined    -> precio no disponible; no participa
```

La evidencia entregada no contiene filas cero ni no disponibles, por lo que
esta conclusión procede del código y las pruebas focalizadas existentes.

`createdon` ordena la consulta ascendente, pero el orden no concede precedencia
ni selecciona un precio. Además, el mapping lo convierte en `creationDate` y la
consolidación exige actualmente que sea único por SKU. En estos datos, 354 SKU
tienen más de un `createdon`: 343 se explican solo por esa diferencia y 11
también contienen importes diferentes. Que todos los conflictos de precio
estén separados temporalmente no autoriza concluir que el más reciente deba
ganar.

## Regla funcional existente

Existe una regla aprobada para **detectar y bloquear**: dos importes numéricos
distintos no se suman, promedian ni seleccionan; dos `creationDate` no vacíos
distintos tampoco se consolidan silenciosamente.

No existe una regla funcional aprobada para **resolver** estos conflictos. La
documentación prohíbe elegir por primera/última fila, compañía, fecha, mayoría,
promedio u otra precedencia sin una decisión funcional posterior.

## Alternativas no implementadas

Ordenadas por consistencia con la evidencia:

1. Definir funcionalmente la semántica temporal de los registros y de
   `createdon`; solo después decidir si una versión efectiva debe seleccionarse
   y con qué desempates. Los 11 casos de precio están separados por fecha, pero
   no se asume que el más reciente gane.
2. Corregir/gobernar la fuente para mantener un único registro canónico por
   SKU/origen/comprador y un único `createdon` Product consolidable, conservando
   el bloqueo como defensa.
3. Mantener el bloqueo estricto y aprobar resoluciones manuales explícitas para
   los 11 SKU de precio, sin crear precedencia global.

## Recomendación Phase1-084

Ejecutar un prompt funcional que decida por separado:

- si `createdon` es un atributo único del Product o metadata de cada fila de
  precio que no debe competir durante la consolidación;
- qué regla aprobada resuelve múltiples importes del mismo
  SKU/origen/comprador cuando están en fechas distintas, incluidos desempates y
  la preservación obligatoria de `0` frente a `null`.

No implementar Phase1-084 hasta obtener esa definición del dueño funcional de
Product Master.

## Archivos y validación

- Creado `docs/prompts/Phase1-083-DiagnoseProductPriceConflicts.md`.
- Creado localmente
  `logs/Phase1-083-DiagnoseProductPriceConflicts.mjs`.
- Usado exclusivamente
  `logs/Phase1-083-SKULLCANDY-Raw.json` como evidencia de datos.
- Generado `logs/Phase1-083-DiagnoseProductPriceConflicts.log`.
- Ejecutado el self-test sanitizado del analizador.
- Ejecutado el análisis real sanitizado: 2.646 filas, conflicto reproducido.
- Ejecutados `git diff --check` y `git status --short` al cierre.

No se modificó lógica funcional, runtime, contratos, Provider, UI, Dataverse,
variables, autenticación, timeouts o infraestructura. No hubo commit, push ni
deploy. Reversión: eliminar el prompt versionado y los tres archivos locales
ignorados de Phase1-083.

Prompt ejecutado: Phase1-083 — Diagnose Product Price Conflicts
