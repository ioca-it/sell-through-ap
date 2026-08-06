# Prompt 018 — Fortalecer contratos Repository y Provider

## Objetivo

Fortalecer la frontera Repository/Provider con validación estructural, configuración requerida explícita y pruebas dedicadas antes de continuar con Configuration Center o Providers remotos.

## Alcance

- Validar los seis métodos requeridos del Provider al construir Repository.
- Validar strings y formas mínimas de las fuentes adaptadas por Local Provider.
- Validar la configuración operativa antes de usarla en `processSellThrough`.
- Mantener el contrato público `{ resultados, error }` y todos los resultados válidos.
- Agregar pruebas aisladas sin modificar las 117 existentes.
- Sincronizar Knowledge Base, decisiones, estándares e historial.

## Decisión aprobada

- `getConfiguracion()` puede devolver `null` en un Repository parcial usado solo para catálogos o datos de ejemplo.
- `processSellThrough(repository)` requiere `periodoAnalizado`, `semanasPersonalizadas`, `safetyStockSemanas`, `leadTimeUSA` y `leadTimeCHINA`.
- Configuración ausente, de tipo inválido o incompleta devuelve un error controlado dentro de `{ resultados: null, error }`; no produce `TypeError`.

## Archivos creados

- `src/repositories/__tests__/sellThroughRepository.test.js`.
- `src/providers/local/__tests__/localDataProvider.test.js`.
- `docs/prompts/Prompt018-RepositoryProviderContracts.md`.
- `logs/Prompt018-RepositoryProviderContracts.log` como evidencia local ignorada por Git.

## Archivos modificados

- `src/repositories/sellThroughRepository.js`.
- `src/providers/local/localDataProvider.js`.
- `src/application/sellThroughApplicationService.js`.
- `docs/knowledge/ARCHITECTURE.md`.
- `docs/knowledge/DATA_SOURCES.md`.
- `docs/knowledge/DATAVERSE_MIGRATION.md`.
- `docs/knowledge/DECISIONS.md`.
- `docs/knowledge/CODING_STANDARDS.md`.
- `docs/knowledge/CHANGELOG.md`.
- `docs/knowledge/CONFIGURATION.md`.
- `docs/knowledge/FUNCTIONAL_BASELINE.md`.
- `docs/PROMPT_HISTORY.md`.

## Validaciones implementadas

- Repository rechaza Providers no objeto, incompletos o con cualquier método `read*` ausente/no funcional e identifica el método.
- Local Provider exige strings para Maestro/Inventario, objeto o `null` para configuración, arreglos/objetos/número para parámetros, arreglos/objeto para catálogos y strings para ejemplos.
- Application Service distingue configuración ausente, tipo inválido y claves faltantes antes de ejecutar el ensamblaje.

## Pruebas creadas

- Repository/Application Service: 19 casos.
- Local Provider: 15 casos.
- Nuevas: 34.
- Total: 151 pruebas en siete archivos.

## Restricciones

- No modificar JSX, navegación, motores, parsers, reglas, fórmulas, defaults o resultados válidos.
- No introducir asincronía, DataverseProvider, esquema Dataverse o dependencias.
- No modificar `dataService.js` ni `datos.json`.
- No ejecutar `npm audit fix`.
- No realizar commit, push, rama ni cambios de configuración Git.

## Riesgos y pendientes

- Cada Provider futuro deberá validar sus propias formas de retorno; las validaciones del adaptador local no son reutilizables como esquema remoto.
- Los contratos continúan síncronos; carga, espera, reintentos y errores remotos siguen pendientes.
- DataverseProvider, autenticación, entidades, columnas y mapeos no están definidos.

## Validaciones de ejecución

- `npm test -- --run`: 151/151 pruebas aprobadas.
- `npm run build`.
- `git diff --check`.

## Estrategia de reversión

Retirar las validaciones añadidas en los tres módulos, eliminar únicamente las dos suites de Prompt 018 y revertir sus entradas documentales mediante un cambio Git explícito y revisable. No se requiere reversión de reglas o JSX porque no fueron modificados.

## Resultado esperado

- Fallos de contrato trazables en Repository, Local Provider y Application Service.
- Configuración nullable documentada para lecturas parciales y obligatoria para procesamiento.
- 151 pruebas, build y `git diff --check` aprobados.
- Evidencia completa en `logs/Prompt018-RepositoryProviderContracts.log`.
