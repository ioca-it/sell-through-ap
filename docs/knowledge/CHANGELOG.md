# Changelog de la Knowledge Base

## 2026-08-11 — Prompt Astrid Confirmed Changes

### Implementado

- Sustitución visual Por Vencer → Sin ventas con SKU, unidades y valor de inventario, conservando la temporalidad interna.
- Quiebres Activos como único indicador de quiebre en Resumen Dashboard y exclusión EOL de alertas/tablas/conteos de bajo inventario.
- Textos Vitales/Complementarios y colores Pareto A verde, B azul, C rojo sin cambiar el cálculo ABC.
- Totalización final de Productos de Reposición Sugerida con SKU incluidos y unidades ya calculadas.
- Valor en tránsito por SKU y total global mediante Compra por costo aplicado vigente, presentado sin decimales.
- Contrato Maestro Producto con `creationDate`, regla Producto Nuevo `< 90 días` y Nuevos no presentes sin reposición sugerida.
- Contrato Customer ampliado a `customerType`, fallback vacío y presentación en Configuración.
- Ayudas UI derivadas de las reglas vigentes para Merma, Ventas Pareto A, Reposición y Umbral de Merma.

### Pruebas

- Bordes de Producto Nuevo en 89/90/más de 90 días y fecha vacía/inválida.
- Cobertura de Sin ventas, exclusión EOL, Nuevos no presentes, tránsito, reposición, textos/colores Pareto, Customer y formato monetario.
- Suite frontend: 230/230 aprobadas antes de la validación final de build.

### No implementado

- Sin origen, nuevos buckets/fases EOL, reposición para productos nuevos, fórmula por Tipo de Cliente y mapping físico de `customerType`.
- MSAL, Entra, Render, Azure, Dataverse real, commits, push o despliegues.

## 2026-08-10 — Phase1-004

### Seguridad corregida

- Customer API exige Bearer JWT delegado validado con firma/JWKS, issuer, audience, expiración, tenant y scope.
- Fronteras Usuario→API (`AUTH_*`) y API→Dataverse (`DV_*`) quedan explícitamente separadas.
- Rate limiting por IP e identidad con 429/Retry-After; store in-memory reemplazable.
- CORS admite `Authorization` pero continúa sin considerarse autenticación.
- Tokens, secretos y errores JWT técnicos no se registran ni exponen.

### Agregado

- `GET /health` anónimo, sin consultas externas ni exposición de configuración.
- Respuesta 400 para percent-encoding inválido en `customerCode`.
- Abstracción frontend `getAccessToken()` para futura integración MSAL.
- Dependencia backend `jose` 6.2.4, estándar mantenido JWT/JWKS, ESM y sin dependencias transitivas.
- Suite backend ampliada a 41 pruebas y frontend a 221 pruebas.

### Pendiente operativo

- Registrar API/scope en Entra, integrar MSAL, configurar IDs reales y sustituir rate limit in-memory antes de escala horizontal.

### Sin cambios

- Customer contract, Repository, Customer Master Service, Maestro Producto, Inventario Cliente, Configuration Center, motores, fórmulas y reglas AP01.
- No se configuran credenciales reales ni se realiza commit, push o despliegue.

## 2026-08-10 — Phase1-003

### Agregado

- Backend Node portable con configuración validada, CORS allowlist y tres endpoints Customer.
- OAuth client_credentials, scope derivado, cache/expiración de token y cliente Dataverse con timeout.
- Gateway `accounts` con mapping confirmado, escape OData, select/orden/límite internos y errores normalizados.
- Guía de migración Render → Azure y `.env.example` sin valores sensibles.
- 24 pruebas backend; suite frontend ampliada a 219 pruebas.

### Modificado

- Dataverse Customer Provider frontend ahora consume exclusivamente Customer API mediante `VITE_API_BASE_URL`.
- App compone el Provider API cuando existe la variable y conserva el fallback local inyectable sin datos.
- Errores técnicos de búsqueda se sustituyen por un mensaje controlado al usuario.

### Pendiente operativo

- Configurar Entra/Dataverse/Render/Vercel, desplegar con autorización separada y ejecutar smoke test real.

### Sin cambios

- Customer contract, Customer Repository, Customer Master Application Service, Maestro Producto, Inventario Cliente, motores, fórmulas y reglas AP01.
- No se realiza commit, push ni despliegue.

## 2026-08-10 — Phase1-002

### Agregado

- Contrato normalizado Customer y Customer Master Application Service.
- Dataverse Customer Provider configurable, Customer Repository y Provider local temporal inyectable.
- Búsqueda UI por código/nombre con una selección sincronizada que carga código, nombre y país.
- 23 pruebas nuevas; suite total de 213 pruebas.

### Pendiente de conexión

- URL, tabla, campos reales, forma del país, autenticación, permisos y transporte seguro de Dataverse.

### Sin cambios

- Maestro Producto, Inventario Cliente, Inventory/EOL Engine, fórmulas, parámetros, dependencias y Repository histórico de sell-through.
- No se realiza commit, push ni despliegue y el log local permanece fuera de Git.

## 2026-08-06 — Prompt 031

### Agregado

- Especificación funcional V2 de los acuerdos Astrid–Jesús.
- Inventario en Tránsito agregado por SKU, EOL Fase 4, temporalidad y Pareto A/B/C.
- Pares KPI SKU/unidades y ecuación completa de valorización para Dashboard e Informe.
- 18 pruebas funcionales nuevas; suite total de 179 pruebas.

### Modificado

- Inventory/EOL Engine, Record Assembler, Portfolio Analysis, Executive Report, Application Service, formatos, UI y exportación Excel.
- Reposición final descuenta Compra; seguridad compara Inventario Proyectado; EOL reemplaza el nivel previo.
- Porcentajes y KPI se muestran sin decimales; etiquetas de aportes eliminan `(20%)` y `(80%)`.

### Sin cambios

- Repository, Provider, Configuration Center, `datos.json`, dependencias y fuentes físicas.
- No se realiza push ni se agrega el log local a Git.

## 2026-08-06 — Prompt 029

### Corregido

- La impresión PDF oculta cabecera, navegación, controles y shell de aplicación.
- El contenido `.informe-pdf` conserva visibilidad, paginación, tablas y legibilidad.

### Sin cambios funcionales

- No se modificaron datos, cálculos, DTOs, navegación normal, servicios ni dependencias.

## 2026-08-06 — Prompt 028

### Agregado

- UX final responsive para presentación, estado de procesamiento y metadata deploy-ready.
- Favicon SVG, theme color y metadata Open Graph básica.
- Hito MVP de presentación con Dashboard, Configuration Center y exportaciones existentes.

### Sin cambios funcionales

- No se modificaron Domain, Repository, Provider, reglas ni Business Services.

## 2026-08-06 — Prompt 026

### Agregado

- Configuration Center MVP visible como nueva pestaña, con búsqueda, filtro, validación, restauración y mensajes de estado.
- Persistencia local encapsulada en `configurationService` y siete pruebas de contrato.

### Modificado

- `configurationService` amplía su contrato sin mover parámetros ni cambiar reglas.
- `CONFIGURATION_SCHEMA` incorpora nombres de presentación para sus tres registros existentes.
- Estado de arquitectura y configuración actualizados.

### Sin cambios funcionales

- Los tres parámetros permanecen no editables según `BUSINESS_PARAMETERS.md`.
- No se modificaron PortfolioAnalysisService, ExecutiveReportService, Repository, Provider, parsers, motores ni dependencias.

Este archivo registra cambios en la documentación consolidada. No reemplaza el historial de Git ni representa versiones funcionales del producto.

## 2026-08-06 — Prompt 024

### Agregado

- `src/domain/report/ExecutiveReportService.js` como Business Service MVP de presentación.
- DTO `executiveReport` con Executive Summary, KPIs, totales, indicadores generales y resumen para Dashboard.
- Registro en `docs/prompts/Prompt024-ExecutiveReportService.md` y evidencia local en `logs/Prompt024-ExecutiveReportService.log`.

### Modificado

- Application Service para orquestar Executive Report después de Portfolio Analysis.
- Architecture State, Roadmap e historial para registrar el nuevo servicio y sus límites.

### Sin cambios funcionales

- Se conservan resultados existentes, reglas, fórmulas, parámetros, contratos, UI y navegación.
- No se modifican PortfolioAnalysisService, Repository, Provider, Configuration Center, App.jsx o Domain restante.
- No se crean Recommendation Engine, exportaciones, hallazgos, persistencia, asincronía o dependencias.

## 2026-08-06 — Prompt 023

### Modificado

- `PortfolioAnalysisService.js` reemplaza el `deepFreeze` sobre referencias externas por clonación de estructuras y congelación exclusiva de objetos propios.
- `ARCHITECTURE.md`, `DECISIONS.md`, `ARCHITECTURE_STATE.md` e historial documentan el ownership de inmutabilidad y la decisión D-023.

### Sin cambios funcionales

- Se conservan resultados, forma de salida, reglas, fórmulas, contratos públicos, 154 pruebas y comportamiento síncrono.
- No se modifican App, Application Service, Repository, Provider, Configuration Center, Domain restante, parámetros o dependencias.

## 2026-08-06 — Prompt 022.5

### Agregado

- `INDEX.md` como índice documental único por propósito y momento de lectura.
- `ARCHITECTURE_STATE.md` como resumen vigente de fase, servicios, decisiones, métricas y siguiente hito.
- Registro en `docs/prompts/Prompt022.5-AIWorkflowOptimization.md` y evidencia local en `logs/Prompt022.5-AIWorkflowOptimization.log`.

### Modificado

- `AGENTS.md` para conservar solo reglas permanentes, estándares, roles, convenciones y estructura.
- `AI_WORKFLOW.md` para sustituir la lectura masiva por seis fuentes mínimas relacionadas y prohibir relecturas sin cambios dentro de la sesión.
- Roadmap e historial para oficializar el flujo ChatGPT/Codex/Claude/Copilot y el siguiente hito.

### Optimización

- Contexto documental fijo reducido de 292,831 a 8,917 bytes: estimación de 73,208 a 2,230 tokens, aproximadamente 97% menos antes de sumar el prompt, log y archivos específicos de cada tarea.

### Sin cambios funcionales

- No se modificaron `src`, pruebas, contratos, Configuration Center, Business Services, Repository, Provider, reglas, fórmulas, parámetros o dependencias.

## 2026-08-06 — Prompt 022

### Agregado

- `src/domain/portfolio/PortfolioAnalysisService.js` como Business Service puro para consolidación, alertas, agregados, métricas y estructura final inmutable.
- Contratos internos `consolidateRecords(records)` y `analyzePortfolio(...)`.
- Registro en `docs/prompts/Prompt022-PortfolioAnalysisService.md` y evidencia local en `logs/Prompt022-PortfolioAnalysisService.log`.

### Modificado

- Application Service para orquestar el nuevo servicio y conservar físicamente Distribution y Pareto.
- Arquitectura, reglas, roadmap e historial para registrar responsabilidades, dependencias y posición del Business Service.

### Sin cambios funcionales

- Se conservan resultados, filtros, ordenamientos, reglas, fórmulas, parámetros, errores y contrato público.
- No se modifican App/JSX, navegación, Repository, Provider, Configuration Center, motores, parsers, Executive Report, Recommendation Engine o exportaciones.
- No se agregan dependencias, persistencia, asincronía o integración directa con fuentes.

## 2026-08-06 — Prompt 021

### Agregado

- Validación unitaria de IDs duplicados, keys duplicadas y schema inconsistente en `src/configuration/__tests__/configurationSchema.test.js`.
- Decisión D-022 y registro ejecutable en `docs/prompts/Prompt021-SingleSourceOfTruth.md`.

### Modificado

- `configurationSchema.js` valida unicidad, campos obligatorios y coherencia de tipos/defaults.
- `configurationService.js` valida el schema una sola vez y deriva de él las claves autorizadas.
- Repository elimina `REQUIRED_PILOT_CONFIGURATION_KEYS` y consume exclusivamente el resultado central de integridad.
- Arquitectura, configuración e historial declaran oficialmente `CONFIGURATION_SCHEMA` como Single Source of Truth.

### Sin cambios funcionales

- Se conservan los tres pilotos, defaults, contratos públicos y comportamiento síncrono.
- No se modifican UI, Domain, parámetros, overrides, Provider, persistencia, dependencias ni integración Dataverse.

## 2026-08-06 — Prompt 020

### Agregado

- `src/configuration/configurationDefaults.js`, `configurationSchema.js` y `configurationService.js` como foundation limitada a PAR-001/PAR-002/PAR-003.
- Esquema explícito y cuatro contratos síncronos de lectura/validación, sin React, UI o persistencia.
- Registro en `docs/prompts/Prompt020-ConfigurationCenterFoundation.md` y evidencia local en `logs/Prompt020-ConfigurationCenterFoundation.log`.

### Modificado

- Repository para validar internamente las tres claves piloto, conservando sus seis contratos públicos.
- Arquitectura, configuración, decisiones e historial para registrar el patrón y los criterios de migración futura.

### Sin cambios funcionales

- No cambiaron `App.jsx`, JSX, navegación, Domain, motores, parsers, Provider, fuentes, reglas, fórmulas o defaults fuera de los tres pilotos.
- No se agregaron UI, dependencias, asincronía, persistencia, Provider nuevo, DataverseProvider o esquema Dataverse.

## 2026-08-06 — Prompt 019

### Agregado

- `BUSINESS_PARAMETERS.md` con 160 elementos correlativos y trazabilidad de JSON, estado React, Application Service, Domain, Repository, Provider, dashboard y exportaciones.
- Clasificación explícita en 82 parámetros configurables, 26 constantes técnicas, 38 reglas fijas, 12 textos de UI y 2 valores derivados.
- Registro ejecutable en `docs/prompts/Prompt019-BusinessParametersCatalog.md` y evidencia local en `logs/Prompt019-BusinessParametersCatalog.log`.

### Modificado

- Configuración, reglas, fuentes, decisiones e historial para declarar el catálogo como fuente oficial del futuro Configuration Center.
- Riesgos documentados de duplicidad entre JSON y hardcodes, sin corregirlos dentro de este alcance.

### Sin cambios funcionales

- No se modificaron archivos de `src`, `package.json`, dependencias, reglas, fórmulas, defaults, fuentes físicas, UI, Application Service o Domain.
- No se creó Configuration Center ni se definieron entidades, campos, permisos o mapeos Dataverse.

## 2026-08-05 — Prompt 018

### Agregado

- 19 pruebas dedicadas de Repository para delegación, Provider incompleto, métodos ausentes y configuración del procesamiento.
- 15 pruebas dedicadas de Local Provider para sus seis lecturas y formas mínimas.
- Registro del prompt en `docs/prompts/Prompt018-RepositoryProviderContracts.md`.
- Evidencia local en `logs/Prompt018-RepositoryProviderContracts.log`.

### Modificado

- Repository para validar al construir los seis métodos obligatorios del Provider.
- Local Provider para validar strings y formas mínimas de parámetros, configuración, catálogos y ejemplos.
- Application Service para devolver errores controlados ante configuración ausente, inválida o incompleta.
- Arquitectura, fuentes, migración Dataverse, decisiones, estándares, configuración, baseline e historial para reflejar los contratos fortalecidos.

### Sin cambios funcionales

- `getConfiguracion()` continúa nullable en Repositories parciales, mientras el procesamiento exige las cinco claves que ya consumía.
- No cambiaron JSX, navegación, parsers, motores, fórmulas, defaults, resultados válidos, fuentes, dependencias o asincronía.
- Se mantuvieron las 117 pruebas previas y la suite total aumentó a 151.

## 2026-08-05 — Prompt 017

### Agregado

- `src/repositories/sellThroughRepository.js` como frontera estable para Maestro, Inventario, parámetros, configuración, catálogos y datos de ejemplo.
- `src/providers/local/localDataProvider.js` como único adaptador de las fuentes locales actuales.
- Registro del prompt en `docs/prompts/Prompt017-RepositoryLayer.md`.
- Evidencia local en `logs/Prompt017-RepositoryLayer.log`.

### Modificado

- `src/App.jsx` y Application Service para consumir fuentes únicamente mediante Repository, sin modificar JSX o navegación.
- La prueba de Inventory/EOL que leía `dataService` para que use el contrato Repository.
- Arquitectura, fuentes, migración Dataverse, decisiones, baseline, descripción, roadmap, glosario, configuración e historial para reflejar la frontera implementada.

### Sin cambios funcionales

- No cambiaron parsers, Inventory Engine, EOL Engine, reglas, cálculos, defaults, resultados, dependencias ni fuentes físicas.
- Las 117 pruebas existentes continuaron aprobando.

## 2026-08-05 — Prompt 016

### Agregado

- `src/domain/parser/masterParser.js` y `inventoryParser.js` para normalizar ambas entradas.
- `src/domain/parser/recordAssembler.js` para construir cada `record` mediante los motores existentes.
- `src/application/sellThroughApplicationService.js` para coordinar validación, parsing, ensamblaje, agrupaciones, alertas, distribuciones y Pareto.
- Registro del prompt en `docs/prompts/Prompt016-ApplicationService.md`.
- Evidencia local en `logs/Prompt016-ApplicationService.log`.

### Modificado

- `src/App.jsx` para delegar el procesamiento al Application Service, sin modificar JSX o navegación.
- Arquitectura, reglas, fuentes, decisiones, baseline, descripción, roadmap, glosario e historial para reflejar las capas implementadas.

### Sin cambios funcionales

- Se conservaron aliases, errores, defaults, duplicados, forma de `record`, fórmulas, fecha base, agregaciones, Pareto, textos y resultados.
- Las 117 pruebas existentes aprobaron sin modificar casos; `dataService.js`, `datos.json`, JSX, dependencias y configuración permanecieron sin cambios.

## 2026-08-05 — Prompt 015

### Agregado

- `src/__tests__/parserRecordCharacterization.test.js` con 28 pruebas deterministas sobre los parsers y el ensamblaje real de `App`.
- Datasets controlados para delimitadores, encabezados, alias, faltantes, duplicados, precedencias, defaults y registros `SIN MAESTRO`.
- Registro del prompt en `docs/prompts/Prompt015-ParserRecordCharacterization.md`.
- Evidencia local en `logs/Prompt015-ParserRecordCharacterization.log`.

### Documentado

- Contrato actual de parsing y forma de `record` antes de extraer Parser o Application Service.
- Riesgo de colisiones por subcadena durante la detección parcial de columnas.
- Total acumulado de 117 pruebas: 49 de utilidades, 40 de motores y 28 de parsers/records.

### Sin cambios funcionales

- No se modificaron `src/App.jsx`, módulos de producción, JSX, fuentes, reglas, defaults o contratos.
- No se extrajeron parsers ni se agregaron dependencias o configuración.

## 2026-08-05 — Prompt 014

### Agregado

- `src/domain/inventory/inventoryEngine.js` con nueve contratos puros del Inventory Engine.
- `src/domain/eol/eolEngine.js` con cinco contratos puros del EOL Engine.
- Registro del prompt en `docs/prompts/Prompt014-ExtractInventoryEolEngines.md`.
- Evidencia local en `logs/Prompt014-ExtractInventoryEolEngines.log`.

### Modificado

- `src/App.jsx` para orquestar los nuevos motores sin modificar JSX, navegación, fuentes o fecha base.
- Las 40 pruebas de Prompt 013 para validar directamente los módulos y conservar una prueba puente desde `App`.
- Arquitectura, catálogo de reglas, decisiones e historial para registrar la extracción.

### Sin cambios funcionales

- Se conservaron fórmulas, defaults, límites, tablas, textos de acción y resultados numéricos caracterizados.
- `dataService.js`, `datos.json`, dependencias y configuración permanecieron sin cambios.

## 2026-08-05 — Prompt 013

### Agregado

- `src/__tests__/inventoryEolCharacterization.test.js` con 40 pruebas deterministas sobre el handler real de cálculo.
- Datasets TSV controlados con fecha base `2026-08-01`, límites de buckets/fases y rutas USA/CHINA/faltantes.
- Registro del prompt en `docs/prompts/Prompt013-InventoryEOLCharacterization.md`.
- Evidencia local en `logs/Prompt013-InventoryEOLCharacterization.log`.

### Documentado

- Baseline automatizada de BR-006 a BR-015 para Inventory Engine y EOL Engine.
- Arnés temporal de test, alcance de cobertura, dependencias y estrategia de reemplazo durante la futura extracción.
- Total acumulado de 89 pruebas: 49 de utilidades y 40 de motores.

### Sin cambios funcionales

- No se modificaron `src/App.jsx`, módulos de producción, JSX, fuentes, configuración, reglas ni resultados.
- No se agregaron dependencias o archivos de configuración.

## 2026-08-05 — Prompt 012

### Agregado

- Vitest `3.2.7` como herramienta de pruebas compatible con Vite 5.
- 49 pruebas de caracterización en `src/utils/__tests__/` para los ocho exports de utilidades.
- Script `npm test` en `package.json`.
- Registro del prompt en `docs/prompts/Prompt012-UtilityCharacterizationTests.md`.
- Evidencia local en `logs/Prompt012-UtilityCharacterizationTests.log`.

### Modificado

- `package-lock.json` para registrar el árbol de dependencias de Vitest.
- Arquitectura, estándares, decisiones, flujo AI-First, descripción general y baseline para reflejar la nueva validación automatizada.
- `docs/PROMPT_HISTORY.md` para registrar Prompt 012.

### Sin cambios funcionales

- No se modificaron implementaciones, firmas públicas, reglas de negocio, JSX ni comportamiento visible.
- Las pruebas documentan incluso los fallbacks, formatos y normalizaciones actuales sin corregirlos.

## 2026-08-05 — Prompt 011

### Agregado

- `src/utils/formatters.js` para `fmtUSD`, `fmtPct`, `fmtIdx` y `fmtUSDInline`.
- `src/utils/dateUtils.js` para `parseFecha`, `diasEntre` y `primerDiaMes`.
- `src/utils/headerUtils.js` para `normalizeHeader`.
- Registro del prompt en `docs/prompts/Prompt011-ExtractPureFunctions.md`.
- Evidencia local en `logs/Prompt011-ExtractPureFunctions.log`.

### Modificado

- `src/App.jsx` para importar las funciones extraídas y eliminar únicamente sus definiciones locales.
- `docs/knowledge/ARCHITECTURE.md` para registrar la primera separación modular.
- `docs/PROMPT_HISTORY.md` para registrar Prompt 011.

### Sin cambios funcionales

- Se conservaron nombres, firmas, parámetros y cuerpos de las ocho funciones.
- No se modificó JSX, estado React, reglas, cálculos, resultados ni comportamiento observable.

## 2026-08-05 — Prompt 010

### Agregado

- `FUNCTIONAL_BASELINE.md` como inventario oficial previo a la refactorización de `App.jsx`.
- Registro del prompt en `docs/prompts/Prompt010-FunctionalBaseline.md`.
- Evidencia local en `logs/Prompt010-FunctionalBaseline.log`.

### Documentado

- Pantallas, secciones, estados vacíos y estados condicionales.
- KPIs, tablas, botones y acciones observables.
- Contratos efectivos de entrada, CSV, Excel e impresión/PDF.
- Inventory Engine, EOL Engine, Pareto, Distribution, Executive Report y exportaciones.
- Responsabilidades concentradas en `App.jsx` e invariantes para la refactorización.

### Modificado

- `docs/README.md` para indexar la baseline.
- `docs/PROMPT_HISTORY.md` para registrar Prompt 010.

### Sin cambios funcionales

- No se modificó `src/` ni `App.jsx`.
- No se movió código ni se crearon componentes.

## 2026-08-05 — Prompt 009.5

### Agregado

- Estructura oficial `docs/knowledge/` con doce documentos.
- Índice y reglas de lectura en `docs/README.md`.
- Registro ejecutable del prompt en `docs/prompts/Prompt009.5-KnowledgeBase.md`.
- Catálogos de reglas, fuentes, parámetros, decisiones y glosario basados en el código V1.
- Estado explícito de la preparación para Dataverse, sin entidades ni columnas asumidas.

### Modificado

- `AGENTS.md` para exigir la revisión de Knowledge Base, prompts y Git antes de modificar cualquier archivo.
- `docs/PROMPT_HISTORY.md` para registrar Prompt 009.5.

### Sin cambios funcionales

- No se modificó `src/`.
- No se movió código.
- No se modificó la configuración de Git.

## Mantenimiento

Cada prompt que altere arquitectura, reglas, fuentes, parámetros, decisiones o roadmap debe agregar una entrada con fecha, alcance y efecto funcional.
