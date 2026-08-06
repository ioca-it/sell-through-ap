# Prompt 014 — Extraer Inventory Engine y EOL Engine

## Objetivo

Extraer de `src/App.jsx` la lógica pura de Inventory Engine y EOL Engine hacia módulos de dominio independientes, preservando los resultados caracterizados por Prompt 013.

## Alcance

- Crear dos módulos sin dependencias de UI o fuentes.
- Mantener `App.jsx` como orquestador temporal de parsing, configuración y resultados.
- Conservar fecha base, defaults, fórmulas, límites, tablas y textos actuales.
- Adaptar las 40 pruebas para consumir los módulos directamente.
- Mantener una prueba puente que ejecute los datasets controlados desde el handler real de `App`.

## Archivos creados

- `src/domain/inventory/inventoryEngine.js`.
- `src/domain/eol/eolEngine.js`.
- `docs/prompts/Prompt014-ExtractInventoryEolEngines.md`.
- `logs/Prompt014-ExtractInventoryEolEngines.log` como evidencia local ignorada por Git.

## Archivos modificados

- `src/App.jsx`.
- `src/__tests__/inventoryEolCharacterization.test.js`.
- `docs/knowledge/ARCHITECTURE.md`.
- `docs/knowledge/BUSINESS_RULES.md`.
- `docs/knowledge/DECISIONS.md`.
- `docs/knowledge/CHANGELOG.md`.
- `docs/PROMPT_HISTORY.md`.

## Funciones extraídas

### Inventory Engine

- `obtenerSemanasPeriodo`.
- `calcularInventarioProyectado`.
- `calcularMerma`.
- `calcularIndiceRotacion`.
- `seleccionarOrigen`.
- `seleccionarCostoPorOrigen`.
- `calcularInventarioSeguridadIOCA`.
- `calcularQuiebreYReposicion`.
- `obtenerAccionQuiebreActivo`.

### EOL Engine

- `calcularDiasEOL`.
- `seleccionarBucketEOL`.
- `seleccionarFaseEOL`.
- `calcularDescuentoYAportes`.
- `obtenerAccionQuiebreEOL`.

## Contratos definidos

- Los motores reciben únicamente valores ya parseados, fechas, parámetros y tablas explícitas.
- Inventory Engine devuelve números, banderas, procedencia y acción activa mediante objetos simples.
- EOL Engine devuelve selección de bucket/fase, importes, aportes y acción EOL mediante objetos simples.
- Los módulos no acceden a `dataService`, JSON, Excel, Dataverse, Business Central, Repository, Provider, React o navegador.
- `App` conserva `primerDiaMes()` como fecha base y no entrega `fechaCorte` al motor EOL.

## Pruebas adaptadas

- Se conservan los 40 casos y los datasets deterministas de Prompt 013.
- Las aserciones de reglas invocan directamente los 14 exports de dominio.
- Una prueba puente sigue procesando el Maestro e Inventario TSV mediante el botón real de `App`.
- La suite total permanece en 89 pruebas: 40 de motores y 49 de utilidades.

## Reglas, fuentes y parámetros afectados

- Reglas: cambia únicamente su ubicación; no cambian resultados ni contratos funcionales.
- Fuentes: ninguna modificación; `App` continúa consumiendo `dataService`.
- Parámetros: ninguno; se pasan explícitamente a los motores con valores vigentes.
- Fecha base: continúa siendo el primer día del mes del navegador.
- Arquitectura: Domain Service implementado parcialmente para Inventory/EOL.

## Restricciones

- No modificar JSX, navegación, fuentes o configuración.
- No cambiar fórmulas, defaults, límites, fases, buckets o textos protegidos.
- No usar `fechaCorte` como fecha base.
- No modificar `dataService.js` ni `datos.json`.
- No agregar dependencias.
- No ejecutar `npm audit fix`.
- No crear commit, rama o push.
- No modificar configuración de Git.

## Riesgos

- El objeto `resultados` debe conservar nombres como `ioaPct`/`ioaUSD` por compatibilidad actual.
- El puente desde `App` aún depende del orden de hooks y del botón de cálculo.
- Las tablas institucionales siguen siendo mutables por referencia desde `dataService`; los motores no las persisten ni clonan salvo para ordenar candidatos.
- La suite no renderiza el DOM ni cubre Pareto, Distribution, Executive Report o exportaciones.

## Validaciones

- `npm test -- --run`.
- `npm run build`.
- `git diff --check`.
- `git status --short`.
- Revisión de diff para confirmar ausencia de cambios JSX y de fuentes.

## Estrategia de reversión

Restaurar las fórmulas en sus ubicaciones previas dentro de `App.jsx`, retirar los imports de dominio, eliminar los dos módulos y volver a orientar las pruebas al handler de `App`. Revertir únicamente la documentación de Prompt 014 mediante un cambio Git explícito y revisable.

## Resultado esperado

- Dos módulos de dominio puros consumidos por `App`.
- 40 pruebas de motores y 89 pruebas totales aprobadas.
- Build y diff-check exitosos.
- Evidencia completa en `logs/Prompt014-ExtractInventoryEolEngines.log`.
