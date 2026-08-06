# Historial de prompts — sell-through-ap

- Prompt 001: inicialización de Git.
- Prompt 002: instalación y build.
- Prompt 003: auditoría de dependencias.
- Prompt 004: auditoría de arquitectura.
- Prompt 005: Foundation documental.

Cada prompt revisable deberá generar evidencia en la carpeta logs.

## Prompt 006 — AI-First Entry Point

- Objetivo: crear AGENTS.md como punto de entrada para desarrolladores y asistentes de IA.
- Resultado esperado: documentación AI-First completa y proyecto listo para línea base Git.
- Evidencia: logs/Prompt006-AIFirstEntryPoint.log.

## Prompt 009.5 — Knowledge Base AI-First

- Objetivo: crear la Knowledge Base oficial y consolidada de sell-through-ap.
- Alcance: documentación de arquitectura, reglas, fuentes, configuración, decisiones, roadmap, glosario, migración a Dataverse y flujo de trabajo AI-First.
- Restricción: sin cambios funcionales ni modificaciones dentro de `src/`.
- Evidencia: logs/Prompt009.5-KnowledgeBase.log.

## Prompt 010 — Baseline Funcional

- Objetivo: documentar el comportamiento observable antes de refactorizar `App.jsx`.
- Alcance: pantallas, secciones, KPIs, tablas, botones, acciones, entradas, salidas, motores y responsabilidades actuales.
- Restricción: sin cambios funcionales, movimientos de código ni modificaciones dentro de `src/`.
- Evidencia: logs/Prompt010-FunctionalBaseline.log.

## Prompt 011 — Extraer funciones puras

- Objetivo: iniciar la refactorización de `App.jsx` mediante la extracción mecánica de helpers puros.
- Alcance: formatters, fechas y normalización de encabezados en tres módulos `src/utils/`.
- Restricción: conservar nombres, firmas, parámetros, lógica, JSX, estado y comportamiento observable.
- Evidencia: logs/Prompt011-ExtractPureFunctions.log.

## Prompt 012 — Pruebas de caracterización para utilidades extraídas

- Objetivo: congelar mediante pruebas automatizadas el comportamiento de las ocho utilidades extraídas.
- Alcance: Vitest 3.2.7, script `npm test` y 49 casos para formatos numéricos, fechas y encabezados.
- Restricción: sin cambios en implementaciones, firmas públicas, reglas de negocio, JSX o comportamiento visible.
- Evidencia: logs/Prompt012-UtilityCharacterizationTests.log.

## Prompt 013 — Caracterización de Inventory Engine y EOL Engine

- Objetivo: congelar determinísticamente las reglas actuales de inventario y EOL antes de extraerlas de `App.jsx`.
- Alcance: 40 pruebas sobre el handler real con fecha controlada, datasets TSV y límites de merma, quiebre, buckets, fases y aportes.
- Restricción: sin refactorización de producción, cambios de JSX, fuentes, reglas o comportamiento visible.
- Evidencia: logs/Prompt013-InventoryEOLCharacterization.log.

## Prompt 014 — Extraer Inventory Engine y EOL Engine

- Objetivo: mover a dominio puro las reglas congeladas por Prompt 013.
- Alcance: nueve contratos de inventario, cinco contratos EOL, integración temporal desde `App` y adaptación directa de las 40 pruebas.
- Restricción: conservar fórmulas, defaults, límites, fecha base, JSX, navegación y fuentes.
- Evidencia: logs/Prompt014-ExtractInventoryEolEngines.log.

## Prompt 015 — Caracterizar parsers y ensamblaje de registros

- Objetivo: congelar el comportamiento actual de los parsers de Maestro e Inventario y la construcción final de cada registro antes de extraerlos de `App.jsx`.
- Alcance: 28 pruebas desde el flujo real de `App` para delimitadores, encabezados, columnas, duplicados, precedencias, defaults, `SIN MAESTRO` y forma de `record`.
- Restricción: sin extraer parsers o Application Service y sin modificar JSX, fuentes, reglas, defaults o comportamiento funcional.
- Evidencia: logs/Prompt015-ParserRecordCharacterization.log.

## Prompt 016 — Extraer Parsers y Application Service

- Objetivo: separar de `App.jsx` los parsers, el ensamblaje de `record` y la orquestación del procesamiento.
- Alcance: Master Parser, Inventory Parser, Record Assembler y Application Service síncrono, integrados sin cambios funcionales.
- Restricción: conservar las 117 pruebas, reglas, defaults, JSX, navegación y fuentes actuales.
- Evidencia: logs/Prompt016-ApplicationService.log.

## Claude 001 — Configurar perfil de auditor técnico

- Objetivo: configurar a Claude Code como auditor técnico permanente e independiente de `sell-through-ap`, sin modificar código.
- Alcance: `docs/knowledge/CLAUDE_AUDITOR_PROFILE.md`, actualización de `AGENTS.md`, `AI_WORKFLOW.md`, `DECISIONS.md` y `PROMPT_HISTORY.md`.
- Restricción: sin cambios en `src/`, sin commits ni push.
- Evidencia: logs/Claude001-AuditorProfile.log.

## Prompt 017 — Repository Layer

- Objetivo: crear la primera frontera estable de acceso a fuentes mediante Repository y Local Provider.
- Alcance: contratos para Maestro, Inventario, parámetros, configuración, catálogos y datos de ejemplo; integración desde App y Application Service sin cambios funcionales.
- Restricción: conservar reglas, cálculos, JSX, navegación, parsers, motores, resultados y las 117 pruebas.
- Evidencia: logs/Prompt017-RepositoryLayer.log.

## Prompt 018 — Fortalecer contratos Repository y Provider

- Objetivo: validar la estructura del Provider, las formas del Local Provider y la configuración requerida por el procesamiento.
- Alcance: decisión de nulabilidad parcial, errores controlados y 34 pruebas dedicadas para Repository/Provider.
- Restricción: conservar JSX, navegación, parsers, motores, reglas, resultados válidos, sincronía y dependencias.
- Evidencia: logs/Prompt018-RepositoryProviderContracts.log.

## Prompt 019 — Crear Business Parameters Catalog

- Objetivo: identificar, clasificar y documentar todos los parámetros actuales de negocio y operación sin modificar comportamiento funcional.
- Alcance: 160 elementos con IDs `PAR-001` a `PAR-160`, procedencia, consumidores, editabilidad futura, clasificación y estado Dataverse pendiente.
- Resultado: `docs/knowledge/BUSINESS_PARAMETERS.md` se establece como fuente oficial para el futuro Configuration Center.
- Restricción: sin cambios en `src`, `package.json`, dependencias, reglas, defaults, UI, Application Service o Domain; sin esquema Dataverse asumido.
- Evidencia: logs/Prompt019-BusinessParametersCatalog.log.

## Prompt 020 — Configuration Center Foundation

- Objetivo: implementar la infraestructura base del Configuration Center con solo PAR-001, PAR-002 y PAR-003, sin modificar comportamiento funcional.
- Alcance: defaults centralizados, schema explícito, servicio síncrono de lectura/validación e integración interna desde Repository.
- Contratos: `getConfiguration()`, `getValue(key)`, `hasKey(key)` y `getDefaultValue(key)`; seis métodos públicos de Repository preservados.
- Restricción: sin UI, Provider nuevo, DataverseProvider, persistencia, asincronía, dependencias o migración de otros parámetros; `App.jsx` y Domain intactos.
- Evidencia: logs/Prompt020-ConfigurationCenterFoundation.log.

## Prompt 021 — Configuration Schema Single Source of Truth

- Objetivo: eliminar la duplicación de claves entre Repository y Configuration Schema sin modificar comportamiento funcional.
- Decisión: `CONFIGURATION_SCHEMA` es la única fuente autorizada de IDs, keys y metadatos; los defaults permanecen almacenados una vez en `configurationDefaults.js` y referenciados desde el schema.
- Implementación: validación temprana de unicidad y consistencia, resultado consumido por Repository sin listas manuales ni cambios en sus seis métodos públicos.
- Pruebas: tres casos nuevos para IDs duplicados, keys duplicadas y schema inconsistente, preservando las 151 pruebas anteriores.
- Restricción: sin nuevos parámetros, overrides, UI, Domain, Provider, persistencia, asincronía, dependencias ni DataverseProvider.
- Evidencia: logs/Prompt021-SingleSourceOfTruth.log.

## Prompt 022 — Portfolio Analysis Service

- Objetivo: extraer desde Application Service la lógica de análisis de portafolio sin modificar resultados o contratos públicos.
- Alcance: consolidación y clasificación de records procesados, alertas, totales, métricas generales, snapshot y estructura final profundamente inmutable.
- Contratos: `PortfolioAnalysisService.consolidateRecords(records)` y `PortfolioAnalysisService.analyzePortfolio(...)`, ambos síncronos e independientes de UI y fuentes.
- Exclusiones: Distribution y Pareto permanecen en Application Service; Executive Report, Recommendation Engine y exportaciones no se trasladan.
- Restricción: sin cambios en App/JSX, navegación, Repository, Provider, Configuration Center, motores, parsers, reglas, fórmulas, parámetros o dependencias.
- Validación: 154/154 pruebas preservadas, build y `git diff --check` aprobados.
- Evidencia: logs/Prompt022-PortfolioAnalysisService.log.

## Prompt 022.5 — AI Workflow Optimization

- Objetivo: reducir el consumo de tokens del flujo de IA sin modificar código o comportamiento funcional.
- Entradas: `INDEX.md` como índice único y `ARCHITECTURE_STATE.md` como resumen vigente actualizado en cada hito.
- Contexto mínimo: `AGENTS.md`, estado, roadmap, último prompt/log relacionado y archivos que serán modificados; no se relee contexto sin cambios en la misma sesión.
- Roles: ChatGPT define arquitectura/acuerdos; Codex implementa y valida; Claude audita; Copilot brinda asistencia local sin decisiones arquitectónicas.
- Reducción estimada: contexto fijo de 292,831 a 8,917 bytes, aproximadamente 97% o 70,978 tokens menos.
- Restricción: sin cambios en `src`, pruebas, contratos, configuración, Business Services, Repository, Provider o dependencias.
- Evidencia: logs/Prompt022.5-AIWorkflowOptimization.log.

## Prompt 023 — Portfolio Contract Hardening

- Objetivo: eliminar el efecto lateral de `deepFreeze` sobre objetos externos sin modificar resultados o contratos públicos.
- Implementación: clonación de contenedores externos antes de incorporarlos y congelación exclusiva de estructuras propias del Portfolio Analysis Service.
- Decisión: D-023 establece que las referencias originales del llamador nunca se congelan ni mutan; la salida final permanece completamente inmutable.
- Restricción: sin cambios en App, Application Service, Repository, Provider, Configuration Center, Domain restante, reglas, fórmulas, parámetros o dependencias.
- Validación: 154/154 pruebas preservadas, build y `git diff --check` aprobados.
- Evidencia: logs/Prompt023-PortfolioContractHardening.log.

## Prompt 024 — Executive Report MVP

- Objetivo: extraer la construcción mínima del Executive Report a un Business Service reutilizable para presentación.
- Alcance: Executive Summary, KPIs ejecutivos, totales, indicadores generales y resumen para Dashboard derivados exclusivamente del DTO de Portfolio Analysis.
- Contrato: `ExecutiveReportService.buildExecutiveReport(portfolioAnalysis)` devuelve un DTO inmutable; Application Service sólo lo orquesta en `resultados.executiveReport`.
- Exclusiones: sin UI, navegación, hallazgos, Recommendation Engine, exportaciones, Pareto o Distribution.
- Restricción: sin cambios en PortfolioAnalysisService, Repository, Provider, Configuration Center, App.jsx, Domain restante, reglas, fórmulas, parámetros o dependencias.

## Prompt 026 — Configuration Center MVP

- Objetivo: implementar la pantalla y el contrato de persistencia local usando exclusivamente los tres parámetros existentes en `CONFIGURATION_SCHEMA`.
- Resultado: nueva pestaña responsive, búsqueda, filtro, edición condicionada, restauración individual/global y mensajes visibles; persistencia administrada únicamente por `configurationService`.
- Validación: 161/161 pruebas, build Vite correcto y `git diff --check` correcto.

## Prompt 028 — MVP Final

- Objetivo: completar la versión de presentación ejecutiva en una sola implementación.
- Resultado: mejoras UX responsive, loading/empty/error states, Dashboard ejecutivo, Configuration Center UX, exportaciones Excel/PDF y metadata/favicón deploy-ready.
- Validación: 161/161 pruebas, build correcto y `git diff --check` correcto.
- Validación: 154/154 pruebas preservadas, build y `git diff --check` aprobados.
- Evidencia: logs/Prompt024-ExecutiveReportService.log.
