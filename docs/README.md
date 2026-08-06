# Documentación oficial — sell-through-ap

Este directorio concentra el contexto aprobado y la evidencia documental del proyecto. La Knowledge Base describe el estado real de la aplicación y separa claramente lo implementado de lo planificado.

## Lectura obligatoria

Antes de modificar cualquier archivo:

1. Leer `../AGENTS.md`.
2. Leer todos los documentos de `knowledge/`.
3. Revisar todos los acuerdos aplicables en `prompts/`.
4. Revisar la rama, el historial relevante y el estado de Git.
5. Identificar reglas, fuentes y parámetros afectados.

## Índice de la Knowledge Base

- [PROJECT_OVERVIEW.md](knowledge/PROJECT_OVERVIEW.md): propósito, alcance y capacidades actuales.
- [ARCHITECTURE.md](knowledge/ARCHITECTURE.md): arquitectura implementada, arquitectura objetivo y brechas.
- [BUSINESS_RULES.md](knowledge/BUSINESS_RULES.md): reglas y fórmulas observables en el código.
- [DATA_SOURCES.md](knowledge/DATA_SOURCES.md): fuentes actuales, contratos de entrada y procedencia.
- [CONFIGURATION.md](knowledge/CONFIGURATION.md): parámetros, valores iniciales y ubicación.
- [CODING_STANDARDS.md](knowledge/CODING_STANDARDS.md): estándares AI-First de desarrollo.
- [ROADMAP.md](knowledge/ROADMAP.md): líneas aprobadas sin atribuir estados no documentados.
- [DECISIONS.md](knowledge/DECISIONS.md): decisiones funcionales y arquitectónicas vigentes.
- [GLOSSARY.md](knowledge/GLOSSARY.md): vocabulario del dominio y del sistema.
- [CHANGELOG.md](knowledge/CHANGELOG.md): cambios de la Knowledge Base.
- [DATAVERSE_MIGRATION.md](knowledge/DATAVERSE_MIGRATION.md): estado y restricciones de la migración futura.
- [AI_WORKFLOW.md](knowledge/AI_WORKFLOW.md): proceso obligatorio para cambios mediante IA.
- [FUNCTIONAL_BASELINE.md](knowledge/FUNCTIONAL_BASELINE.md): comportamiento observable que debe preservarse durante la refactorización.

## Fuentes de verdad y sincronización

- El código vigente confirma el comportamiento actualmente implementado.
- `AGENTS.md` y los prompts aprobados fijan restricciones y arquitectura objetivo.
- La Knowledge Base consolida ambas perspectivas; no sustituye la verificación del código.
- Si código y documentación difieren, no se debe resolver la diferencia por suposición: se documenta la discrepancia y se solicita un acuerdo cuando afecte comportamiento.
- Todo cambio relevante debe actualizar el documento correspondiente y registrar el prompt en `prompts/`.

Los archivos históricos `PROJECT_CONTEXT.md`, `DATA_SOURCES.md`, `ROADMAP.md` y `PROMPT_HISTORY.md` siguen siendo antecedentes aprobados. Esta carpeta `knowledge/` es la vista consolidada oficial.
