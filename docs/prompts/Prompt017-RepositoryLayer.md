# Prompt 017 — Crear Repository Layer

## Objetivo

Crear la primera versión del Repository Layer de `sell-through-ap` como único punto autorizado de acceso a fuentes y preparar la sustitución futura del origen local por Dataverse sin modificar reglas, dominio o interfaz.

## Alcance

- Crear un Repository con contratos estables para Maestro, Inventario, parámetros, configuración, catálogos y datos de ejemplo.
- Crear un Local Provider que adapte el estado de sesión y la fuente institucional local existente.
- Hacer que Application Service obtenga sus entradas exclusivamente desde Repository.
- Retirar accesos directos a `dataService` desde App y pruebas.
- Mantener el procesamiento síncrono, las fuentes físicas y el comportamiento observable vigentes.
- Sincronizar Knowledge Base, decisiones, roadmap, baseline e historial.

## Archivos creados

- `src/repositories/sellThroughRepository.js`.
- `src/providers/local/localDataProvider.js`.
- `docs/prompts/Prompt017-RepositoryLayer.md`.
- `logs/Prompt017-RepositoryLayer.log` como evidencia local ignorada por Git.

## Archivos modificados

- `src/App.jsx`.
- `src/application/sellThroughApplicationService.js`.
- `src/__tests__/inventoryEolCharacterization.test.js`.
- `docs/knowledge/ARCHITECTURE.md`.
- `docs/knowledge/DATA_SOURCES.md`.
- `docs/knowledge/DATAVERSE_MIGRATION.md`.
- `docs/knowledge/DECISIONS.md`.
- `docs/knowledge/CHANGELOG.md`.
- `docs/knowledge/FUNCTIONAL_BASELINE.md`.
- `docs/knowledge/PROJECT_OVERVIEW.md`.
- `docs/knowledge/ROADMAP.md`.
- `docs/knowledge/GLOSSARY.md`.
- `docs/knowledge/CONFIGURATION.md`.
- `docs/PROMPT_HISTORY.md`.

## Contratos creados

- Repository: `getMaestro`, `getInventario`, `getParametros`, `getConfiguracion`, `getCatalogos` y `getDatosEjemplo`.
- Local Provider: `readMaestro`, `readInventario`, `readParametros`, `readConfiguracion`, `readCatalogos` y `readDatosEjemplo`.
- Application Service: `processSellThrough(repository)` conserva `{ resultados, error }` como salida.

## Responsabilidades y dependencias

- Repository es el único consumidor del Provider y no contiene reglas de negocio.
- Local Provider es el único consumidor de `dataService` y no transforma resultados.
- Application Service desconoce el origen y no importa Provider, `dataService` o JSON.
- Domain permanece puro y sin cambios.
- Un Provider compatible puede inyectarse para sustituir el origen local sin modificar Repository, Application Service o Domain.

## Restricciones

- No modificar reglas, fórmulas, defaults, resultados, JSX o navegación.
- No modificar Inventory Engine, EOL Engine, parsers, `dataService.js` o `datos.json`.
- No agregar dependencias ni ejecutar `npm audit fix`.
- No inventar autenticación, entidades, columnas o mapeos Dataverse.
- No realizar commit, push, rama ni cambios de configuración Git.

## Riesgos y pendientes

- Los contratos actuales son síncronos; un Provider remoto requerirá un diseño aprobado de asincronía, carga y errores.
- DataverseProvider, autenticación, esquema y mapeos continúan pendientes.
- La UI renderizada y las exportaciones todavía no tienen pruebas automatizadas de navegador.

## Validaciones

- `npm test -- --run`: 117/117 pruebas aprobadas.
- `npm run build`.
- `git diff --check`.

## Estrategia de reversión

Restaurar el contrato de parámetros explícitos en App/Application Service, devolver a App y la prueba sus accesos previos a `dataService`, eliminar únicamente Repository y Local Provider y revertir las entradas documentales de Prompt 017 mediante un cambio Git explícito y revisable.

## Resultado esperado

- Repository y Local Provider como frontera única de fuentes locales.
- Application Service independiente del origen de datos.
- 117 pruebas, build y `git diff --check` aprobados.
- Evidencia completa en `logs/Prompt017-RepositoryLayer.log`.
