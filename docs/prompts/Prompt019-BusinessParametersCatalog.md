# Prompt 019 — Crear Business Parameters Catalog

## Objetivo

Identificar, clasificar y documentar los parámetros actuales de negocio y operación de `sell-through-ap` sin modificar comportamiento, reglas, defaults, fuentes ni código de producción.

## Alcance ejecutado

- Se revisaron las fuentes autorizadas por Prompt 019: acuerdos de configuración, reglas, fuentes, arquitectura y decisiones; Prompt 018; `App.jsx`; Application Service; Domain; Local Provider; Repository; `datos.json`; rama, estado, historial y diff de Git.
- Se creó `docs/knowledge/BUSINESS_PARAMETERS.md` con una sola tabla de 160 filas e IDs correlativos `PAR-001` a `PAR-160`.
- Se distinguieron parámetros configurables, constantes técnicas, textos de UI, reglas fijas y valores derivados.
- Se trazaron valores provenientes de JSON local, estado React, reloj del navegador y hardcodes de App/Application Service/Domain.
- Se registraron consumidores, reglas relacionadas, editabilidad futura, riesgos y procedencia, sin inventar entidades o campos Dataverse.

## Resultado del catálogo

| Clasificación | Cantidad |
| --- | ---: |
| Parámetros configurables | 82 |
| Constantes técnicas | 26 |
| Reglas fijas | 38 |
| Textos de UI | 12 |
| Valores derivados | 2 |
| **Total** | **160** |

Las 23 categorías requeridas quedaron cubiertas. Todos los elementos mantienen `Pendiente de definición` para entidad/campo Dataverse porque no existe esquema aprobado.

## Archivos creados

- `docs/knowledge/BUSINESS_PARAMETERS.md`.
- `docs/prompts/Prompt019-BusinessParametersCatalog.md`.
- `logs/Prompt019-BusinessParametersCatalog.log` como evidencia local ignorada por Git.

## Archivos modificados

- `docs/knowledge/CONFIGURATION.md`.
- `docs/knowledge/BUSINESS_RULES.md`.
- `docs/knowledge/DATA_SOURCES.md`.
- `docs/knowledge/DECISIONS.md`.
- `docs/knowledge/CHANGELOG.md`.
- `docs/PROMPT_HISTORY.md`.

## Reglas, fuentes y parámetros afectados

- Reglas: solo documentación y trazabilidad de BR-001 a BR-021; ninguna fórmula, condición, precedencia u operador fue modificado.
- Fuentes: JSON local y estado React continúan como fuentes actuales; Repository/Provider conserva la frontera implementada.
- Parámetros: no se cambiaron valores ni defaults; el catálogo pasa a ser la fuente oficial de inventario para el futuro Configuration Center.
- Dataverse: entidades, campos, relaciones, permisos y mapeos continúan pendientes de definición.

## Hardcodes identificados

Se identificaron 98 elementos de catálogo con literal o contrato embebido en JavaScript/JSX. Incluyen versión/nombre, defaults de sesión, fallback `4.33`, límites de buckets, gate de fase, fórmulas y operadores, bandas de rotación, Pareto, umbrales del informe, límites de listas, paletas nombradas, formatos/nombres de exportación, contratos de integración y validación.

## Riesgos y pendientes

- Los rangos declarados de buckets están en JSON, pero el selector efectivo usa límites y posiciones hardcoded.
- El gate global de fase de 90 días duplica los mínimos F0 de la tabla.
- `4.33` se repite como fallback de Domain/UI y como semanas del período Mensual.
- Application Service valida presencia de cinco claves, no sus tipos o rangos.
- `fechaCorte` no controla el cálculo EOL, que usa el reloj del navegador.
- Textos narrativos y referencias 20/80 están duplicados entre JSON, JSX y exportaciones.
- Permisos, persistencia, asincronía, autenticación y esquema Dataverse no están definidos.

## Validaciones

- Conteo estructural del catálogo: 160/160 IDs correlativos y 23/23 categorías requeridas.
- `npm test -- --run`: 151/151 pruebas aprobadas en 7 archivos.
- `npm run build`: aprobado; 1513 módulos transformados y bundle generado en `dist`.
- `git diff --check`: aprobado, sin errores de whitespace.

## Estrategia de reversión

Retirar los dos documentos creados y las entradas de Prompt 019 en Knowledge Base/historial mediante un cambio Git explícito. El log puede eliminarse por ser evidencia local ignorada. No se requiere revertir `src`, dependencias, reglas o defaults porque no fueron modificados.

## Recomendación siguiente

Diseñar el contrato del Configuration Center a partir de las 82 filas configurables, comenzando por resolver duplicidades y validaciones sin asumir esquema Dataverse. Priorizar semanas/fallback, buckets y fases antes de habilitar edición.
