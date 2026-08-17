# Phase1-036 — Detect Product Attribute Conflicts

## Estado

**PASS — IMPLEMENTED / NOT ACTIVATED.**

## Objetivo ejecutado

Eliminar la consolidación silenciosa de atributos descriptivos divergentes en
`productpricelevel` sin definir una precedencia nueva, modificar el pivot de
precios o activar Product Dataverse.

## Regla implementada

Para un mismo SKU, el gateway controla como atributos únicos `productName`,
`brand`, `category`, `level`, `status`, `discontinuationDate`, `creationDate`,
`imageUrl` y `productUrl`.

- Vacío o `null` no genera conflicto.
- El primer valor no vacío puede inicializar el atributo.
- Otro valor no vacío equivalente normalizado no genera conflicto.
- Otro valor no vacío distinto bloquea toda la consolidación.
- No se elige por primera/última fila, compañía compradora, fecha, mayoría,
  promedio ni otro criterio.

## Normalización

- Strings y URLs: `String(value).trim()`.
- `level` y `status`: FormattedValue trimmed; el fallback textual existente se
  conserva y los códigos Choice numéricos siguen sin publicarse.
- Fechas válidas: instante ISO canónico.
- Fecha no vacía inválida: texto trimmed solo para comparación interna, sin
  publicarlo ni convertir valores distintos en equivalentes artificialmente.

## Conflictos y contrato público

Se reutiliza `ProductMasterConflictError` con código
`PRODUCT_MASTER_CONFLICT` y status `409`. La metadata interna identifica
`conflictType: PRICE` para precios y `conflictType: ATTRIBUTE` con el campo
normalizado para atributos. La respuesta HTTP continúa limitada a código y
mensaje estable; no incluye `conflicts`, valores, SKU del conflicto, nombres
físicos ni contexto Dataverse.

El frontend conserva su traducción pública existente para
`PRODUCT_MASTER_CONFLICT`; no se modifica su contrato ni se filtran detalles
internos.

## Precio y pendientes preservados

- `USA -> priceUSA` y `CHINA -> priceChina` permanecen sin cambios.
- Los conflictos de `amount` siguen bloqueando con el mismo mecanismo.
- `amount null/undefined` mantiene el comportamiento compatible actual y queda
  pendiente de decisión funcional separada.
- `fechaStr` no cambia y permanece pendiente separado.

## Archivos de código y pruebas

- Modificado `server/src/integrations/dataverse/productPriceLevelGateway.js`.
- Modificado `server/tests/productPriceLevelGateway.node-test.js`.
- Modificado `server/tests/productApi.node-test.js`.

La cobertura agrega equivalencia normalizada, vacío más valor en ambos órdenes,
conflicto individual de los nueve atributos, fechas no equivalentes, distinción
interna de precio, contrato HTTP sanitizado y Maestro Cliente sin regresión.

## Documentación

- Creado `docs/prompts/Phase1-036-DetectProductAttributeConflicts.md`.
- Actualizados `ARCHITECTURE_STATE.md`, `DATA_SOURCES.md`,
  `BUSINESS_RULES.md`, `CHANGELOG.md` y `ROADMAP.md`.
- Evidencia local: `logs/Phase1-036-DetectProductAttributeConflicts.log`,
  excluida de Git.

## Riesgos, reversión y alcance

La detección ocurre antes de devolver el Maestro consolidado, por lo que una
divergencia bloquea el conjunto completo sin publicar un Product arbitrario.
La reversión consiste en retirar el tracking de atributos y sus pruebas; no hay
migración de datos ni cambio de entorno que revertir.

No se modifica Inventario Cliente, Product Domain frontend, fórmulas, EOL,
Vercel, Render, Entra o Dataverse. `VITE_PRODUCT_SOURCE=local` continúa vigente.
No hubo consulta productiva, activación, commit, push ni deploy.

## Validaciones

- Frontend completo: 302/302 pruebas aprobadas en 31 archivos.
- Backend completo: 81/81 pruebas aprobadas.
- Build frontend: aprobado con Vite 5.4.21 y 1682 módulos transformados.
- Build backend: aprobado (`Backend syntax check passed.`).
- `git diff --check`: aprobado sin errores.
- `git status --short`: se registra al cierre en el log.

Prompt ejecutado: Phase1-036 — Detect Product Attribute Conflicts
