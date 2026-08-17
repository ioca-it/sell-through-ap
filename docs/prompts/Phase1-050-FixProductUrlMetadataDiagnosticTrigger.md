# Phase1-050 — Fix Product URL Metadata Diagnostic Trigger

## Estado

**PASS — METADATA TRIGGER OBSERVABILITY FIXED / NOT DEPLOYED / NOT EXECUTED /
NOT ACTIVATED.**

## Objetivo ejecutado

Corregir exclusivamente la conexión observable entre el probe temporal
Phase1-046 `select_field=producturl / FAIL` y el diagnóstico temporal de
metadata Phase1-048, sin corregir ni eliminar `producturl` y sin modificar el
Product Gateway definitivo.

La evidencia productiva proporcionada confirmó el `FAIL` individual y cero
eventos `PHASE1_048_PRODUCT_URL_METADATA`. No se ejecutó Dataverse productivo
durante este hito.

## Causa exacta

El hook sí estaba ubicado inmediatamente después de emitir el `FAIL` de
`producturl`, pero Phase1-048 no emitía ningún evento al entrar. Su primer log
solo se construía después de que el método de Dataverse Client completara tanto
la resolución de `EntityDefinitions` como la consulta `Attributes` y devolviera
atributos válidos.

Si cualquiera de esas etapas fallaba, el error subía al `catch` del loop
Phase1-046 y era absorbido para preservar el 502 Product original y continuar
los probes. El resultado era cero eventos Phase1-048, indistinguible de un
trigger no alcanzado. La captura productiva disponible no permite atribuir el
fallo histórico a una de las dos consultas; Phase1-050 elimina precisamente
esa ambigüedad.

## Corrección implementada

- La guardia module-scope Phase1-048 se fija antes del primer `await`.
- Inmediatamente después se emite un evento allowlisted
  `stage=TRIGGER / result=REACHED`.
- Dataverse Client adjunta mediante un `Symbol` privado no enumerable la etapa
  técnica de cualquier fallo interno de metadata.
- Phase1-048 transforma esa marca exclusivamente en
  `ENTITY_DEFINITION/FAIL` o `ATTRIBUTES/FAIL`.
- Una consulta completada emite `CANDIDATES/FOUND|NONE` y `candidateCount`, y
  después conserva los eventos por atributo con `LogicalName`, `SchemaName`,
  `AttributeType`, `IsValidForRead` y `CANDIDATE|NOT_CANDIDATE`.
- Todos los fallos internos siguen absorbidos y Phase1-046 continúa con los
  probes posteriores sin sustituir el error Product original.

## Punto exacto del disparo

`productPriceLevelQueryDiagnostic.js`, dentro del loop de probes:

1. espera el resultado del probe individual;
2. emite el evento Phase1-046;
3. si `category=select_field`, `element=producturl` y `passed=false`, invoca y
   espera `runProductPriceLevelMetadataDiagnosticOnce()`;
4. solo después continúa con el siguiente probe Phase1-046.

Por tanto, la ejecución Phase1-048 no depende de que termine correctamente el
resto de la secuencia Phase1-046.

## Observabilidad sanitizada

Los eventos de ciclo de vida contienen únicamente:

```text
component=ProductPriceLevelMetadataDiagnostic
diagnosticId=PHASE1_048_PRODUCT_URL_METADATA
stage=TRIGGER|ENTITY_DEFINITION|ATTRIBUTES|CANDIDATES
result=REACHED|FAIL|FOUND|NONE
candidateCount (solo para CANDIDATES)
```

Los eventos de candidatos conservan el allowlist Phase1-048. No se registran
datos Product, SKU, precios, URLs comerciales, tokens, JWT, Authorization,
secretos, PII, query completa, payload completo, mensajes OData o stack traces.

## Pruebas obligatorias cubiertas

1. `producturl FAIL` dispara Phase1-048 inmediatamente.
2. El diagnóstico se ejecuta exactamente una vez.
3. Phase1-046 continúa con probes posteriores después del trigger.
4. Llamadas concurrentes no duplican el diagnóstico de metadata.
5. Fallo de `EntityDefinitions` emite observabilidad sanitizada.
6. Fallo de `Attributes` emite observabilidad sanitizada.
7. Candidatos válidos emiten ciclo de vida y atributos allowlisted.
8. Logs no contienen datos comerciales ni credenciales inyectados en errores o
   payloads de prueba.
9. Product Gateway conserva `productpricelevels`, `producturl`, mapping y
   contrato.
10. Customer Master permanece sin regresión en backend y frontend.

## Archivos

### Creados

- `docs/prompts/Phase1-050-FixProductUrlMetadataDiagnosticTrigger.md`.
- `logs/Phase1-050-FixProductUrlMetadataDiagnosticTrigger.log` (evidencia local
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

- Entity Set Product: `productpricelevels`.
- Candidato y mapping vigentes: `producturl` -> `productUrl`.
- Filtros de compradores, orden, FormattedValue y `$top`.
- Pivot USA/CHINA, precios `0`/`null`, conflictos y `fechaStr`.
- Product Domain, Provider, Repository, Application Service y frontend.
- Customer Master, `VITE_PRODUCT_SOURCE`, autenticación e infraestructura.

## Validaciones

- Pruebas focalizadas Product/Customer: 75/75 aprobadas.
- Backend completo: 104/104 aprobadas.
- Backend build: aprobado; `Backend syntax check passed.`
- Frontend completo: 342/342 aprobadas en 32 archivos.
- Frontend build: aprobado con Vite 5.4.21 y 1683 módulos transformados.
- `git diff --check`: aprobado sin errores; advertencias LF/CRLF informativas.
- `git status --short`: registrado al cierre en la evidencia local.

## Riesgo y reversión

El único efecto adicional futuro son eventos técnicos allowlisted y la marca
privada de etapa sobre errores internos ya absorbidos. No se añaden consultas:
el diagnóstico conserva las mismas dos lecturas máximas de metadata y una sola
ejecución por proceso.

La reversión local consiste en retirar los eventos de ciclo de vida, la marca
privada de etapa y sus pruebas/documentación. Phase1-046/048/050 continúan
temporales y deben retirarse con la corrección definitiva basada en metadata
real.

## Siguiente acción exacta

Después de revisar este diff, solicitar autorización separada para checkpoint y
deploy exclusivo del backend Phase1-050, sin cambiar
`VITE_PRODUCT_SOURCE=local`. Tras reiniciar el proceso, ejecutar exactamente una
vez `?phase1-042-product-smoke=1` y capturar los eventos
`PHASE1_048_PRODUCT_URL_METADATA`. El evento posterior a `TRIGGER/REACHED`
determinará si debe investigarse `EntityDefinitions`, `Attributes` o si ya hay
candidatos para un prompt separado de corrección y retiro.

No hubo commit, push, deploy, smoke productivo ni consulta a Dataverse
productivo.

Prompt ejecutado: Phase1-050 — Fix Product URL Metadata Diagnostic Trigger
