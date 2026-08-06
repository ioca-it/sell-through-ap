# Prompt 016 — Extraer Parsers y Application Service

## Objetivo

Extraer de `src/App.jsx` los parsers de Maestro/Inventario, el ensamblaje del `record` y la orquestación del procesamiento hacia módulos de dominio y un Application Service, preservando exactamente el comportamiento caracterizado por las 117 pruebas.

## Alcance

- Crear Master Parser, Inventory Parser y Record Assembler bajo `src/domain/parser/`.
- Crear `sellThroughApplicationService.js` bajo `src/application/`.
- Trasladar validación, parsing, cruce, fecha base del caso de uso, ensamblaje, agrupaciones, alertas, distribuciones y Pareto.
- Mantener `App.jsx` como consumidor del servicio para actualizar estado/error y navegar al Dashboard.
- Conservar todos los casos existentes y al menos un puente desde el handler real de `App`.

## Archivos creados

- `src/domain/parser/masterParser.js`.
- `src/domain/parser/inventoryParser.js`.
- `src/domain/parser/recordAssembler.js`.
- `src/application/sellThroughApplicationService.js`.
- `docs/prompts/Prompt016-ApplicationService.md`.
- `logs/Prompt016-ApplicationService.log` como evidencia local ignorada por Git.

## Archivos modificados

- `src/App.jsx`.
- `docs/knowledge/ARCHITECTURE.md`.
- `docs/knowledge/BUSINESS_RULES.md`.
- `docs/knowledge/DATA_SOURCES.md`.
- `docs/knowledge/DECISIONS.md`.
- `docs/knowledge/FUNCTIONAL_BASELINE.md`.
- `docs/knowledge/PROJECT_OVERVIEW.md`.
- `docs/knowledge/ROADMAP.md`.
- `docs/knowledge/GLOSSARY.md`.
- `docs/knowledge/CHANGELOG.md`.
- `docs/PROMPT_HISTORY.md`.

## Contratos creados

### `parseMaster(rawMaster)`

Detecta columnas y aliases, normaliza estado/fecha/categoría/costos, omite SKU vacío y conserva el último duplicado. Devuelve `{ masterBySku, error }`.

### `parseInventory(rawInventory)`

Valida SKU e Inventario Final, detecta aliases, normaliza texto/enteros/defaults, omite SKU vacío y conserva filas duplicadas. Devuelve `{ inventoryRecords, error }`.

### `assembleRecord(inputs)`

Cruza una fila de Inventario con su Maestro y usa Inventory Engine/EOL Engine para devolver exactamente el `record` caracterizado, incluida la variante `SIN MAESTRO`.

### `processSellThrough(inputs)`

Valida textos, coordina parsers y assembler, fija `primerDiaMes()` como fecha base, calcula agrupaciones/alertas/distribuciones/Pareto y devuelve `{ resultados, error }`.

## Responsabilidades extraídas

- Separadores, encabezados, aliases, columnas, defaults y duplicados.
- Conversión de costos, fechas y enteros de entrada.
- Cruce Maestro/Inventario y construcción de ambos contratos de `record`.
- Coordinación de Inventory Engine y EOL Engine.
- Fecha base del procesamiento, totales, alertas, Tier, categorías, Pareto y snapshot de configuración.

## Reglas, fuentes y parámetros afectados

- Reglas: cambia únicamente su ubicación; no cambian fórmulas, aliases, defaults, límites, errores o textos.
- Fuentes: ninguna modificación; `App` continúa recibiendo texto y configuración de `dataService`.
- Parámetros: ninguno; se entregan explícitamente al Application Service y assembler.
- Arquitectura: Application Service implementado para el caso de uso principal; Repository/Provider continúan pendientes.

## Restricciones

- No modificar comportamiento, reglas, cálculos, defaults, JSX o navegación.
- No modificar `dataService.js`, `datos.json`, dependencias o configuración.
- No ejecutar `npm audit fix`.
- No crear commit, rama o push ni modificar configuración de Git.

## Pruebas

- Se conservan los 117 casos sin modificaciones.
- Los 28 casos de parsers/records siguen recorriendo `App` y el Application Service.
- La suite de Inventory/EOL mantiene su prueba puente desde `App` y sus contratos directos de dominio.

## Riesgos

- El servicio sigue siendo síncrono; una fuente remota requerirá un contrato asíncrono aprobado.
- Parsers y Application Service reciben objetos/tablas por referencia y no constituyen Repository o Provider.
- Se conserva la búsqueda parcial susceptible a colisiones y el parser sin quoted CSV.
- `App.jsx` todavía concentra informe, exportaciones y una UI extensa.

## Validaciones

- `npm test -- --run`.
- `npm run build`.
- `git diff --check`.
- `git status --short`.
- Revisión de ausencia de dependencias React/fuentes en los módulos nuevos.

## Estrategia de reversión

Restaurar el bloque `procesar` previo en `App.jsx`, retirar el import del Application Service y eliminar los cuatro módulos creados. Revertir únicamente la documentación de Prompt 016 mediante un cambio Git explícito y revisable.

## Resultado esperado

- Cuatro contratos modulares consumidos por `App`.
- 117 pruebas aprobadas sin cambios funcionales.
- Build y `git diff --check` exitosos.
- Evidencia completa en `logs/Prompt016-ApplicationService.log`.
