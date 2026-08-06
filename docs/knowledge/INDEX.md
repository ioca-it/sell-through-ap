# Índice documental

| Documento | Propósito | Cuándo debe leerse |
| --- | --- | --- |
| `AGENTS.md` | Reglas permanentes, roles, convenciones y estructura. | Siempre, al iniciar una tarea. |
| `ARCHITECTURE_STATE.md` | Estado ejecutivo vigente del proyecto. | Siempre, después de `AGENTS.md`. |
| `ROADMAP.md` | Líneas aprobadas, brechas y siguiente hito. | Siempre, después del estado vigente. |
| `AI_WORKFLOW.md` | Contexto mínimo y proceso oficial entre IA. | Al ejecutar, auditar o diseñar un cambio mediante IA. |
| `ARCHITECTURE.md` | Detalle histórico y técnico de capas y refactorizaciones. | Solo para cambios arquitectónicos o de responsabilidades. |
| `BUSINESS_RULES.md` | Catálogo de reglas y ubicación de sus implementaciones. | Cuando cambien o se extraigan cálculos, reglas o resultados. |
| `BUSINESS_FUNCTIONAL_SPEC_V2.md` | Especificación vigente de los acuerdos funcionales Astrid–Jesús. | Para cambios o auditorías de reposición, tránsito, temporalidad, F4, Pareto, KPIs y valorización V2. |
| `BUSINESS_PARAMETERS.md` | Catálogo oficial de parámetros, hardcodes y clasificación. | Cuando se consulte o migre configuración de negocio. |
| `CONFIGURATION.md` | Estado y contratos del Configuration Center. | Cuando cambien schema, defaults o resolución de configuración. |
| `DATA_SOURCES.md` | Fuentes vigentes, formatos y procedencia. | Cuando cambien entradas, fuentes, Repository o Provider. |
| `DATAVERSE_MIGRATION.md` | Restricciones y preparación para Dataverse. | Solo para diseño o implementación relacionada con Dataverse. |
| `DECISIONS.md` | Decisiones arquitectónicas y funcionales aprobadas. | Cuando el cambio dependa de una decisión o apruebe una nueva. |
| `FUNCTIONAL_BASELINE.md` | Comportamiento visible protegido y cobertura funcional. | Para cambios de UI, flujos, salidas o riesgo de regresión. |
| `CODING_STANDARDS.md` | Límites técnicos y estándares de implementación. | Para código nuevo o dudas de convención no resueltas por `AGENTS.md`. |
| `CLAUDE_AUDITOR_PROFILE.md` | Contrato del auditor técnico independiente. | Solo al preparar o ejecutar una auditoría Claude. |
| `PROJECT_OVERVIEW.md` | Identidad, capacidades y límites generales. | Para incorporación al proyecto o dudas de propósito. |
| `GLOSSARY.md` | Definiciones del vocabulario del dominio. | Cuando un término sea ambiguo. |
| `CHANGELOG.md` | Historial documental consolidado. | Para rastrear cuándo cambió un acuerdo específico. |
| `docs/PROMPT_HISTORY.md` | Resumen cronológico de prompts ejecutados. | Solo para rastrear un hito no resuelto por el prompt relacionado. |
| `docs/prompts/*.md` | Acuerdo ejecutable y evidencia documental de cada hito. | Leer únicamente el último prompt relacionado con la tarea. |
| `logs/*.log` | Evidencia local de ejecuciones y auditorías. | Leer únicamente el último log relacionado; no incluir en Git. |
| `docs/PROJECT_CONTEXT.md` | Antecedente legado de contexto general. | Solo si un prompt histórico lo exige expresamente. |
| `docs/DATA_SOURCES.md` | Antecedente legado de fuentes. | Solo si un prompt histórico lo exige expresamente. |
| `docs/ROADMAP.md` | Antecedente legado del roadmap. | Solo si un prompt histórico lo exige expresamente. |
