# Prompt 009.5 — Crear Knowledge Base AI-First para sell-through-ap

## Objetivo

Crear la Knowledge Base oficial del proyecto para que cualquier IA comprenda el estado real, los acuerdos y las restricciones antes de modificar archivos.

## Alcance

- Consolidar arquitectura actual y objetivo aprobado.
- Catalogar reglas de negocio, fuentes y configuración implementadas.
- Registrar estándares, roadmap, decisiones, glosario y changelog.
- Documentar el estado y las restricciones de la migración a Dataverse.
- Definir el flujo obligatorio de cambios mediante IA.
- Actualizar el punto de entrada `AGENTS.md` y el historial de prompts.
- Generar evidencia local y ejecutar las validaciones solicitadas.

## Archivos creados

- `docs/README.md`.
- `docs/knowledge/PROJECT_OVERVIEW.md`.
- `docs/knowledge/ARCHITECTURE.md`.
- `docs/knowledge/BUSINESS_RULES.md`.
- `docs/knowledge/DATA_SOURCES.md`.
- `docs/knowledge/CONFIGURATION.md`.
- `docs/knowledge/CODING_STANDARDS.md`.
- `docs/knowledge/ROADMAP.md`.
- `docs/knowledge/DECISIONS.md`.
- `docs/knowledge/GLOSSARY.md`.
- `docs/knowledge/CHANGELOG.md`.
- `docs/knowledge/DATAVERSE_MIGRATION.md`.
- `docs/knowledge/AI_WORKFLOW.md`.
- `docs/prompts/Prompt009.5-KnowledgeBase.md`.
- `logs/Prompt009.5-KnowledgeBase.log` como evidencia local ignorada por Git.

## Archivos modificados

- `AGENTS.md`.
- `docs/PROMPT_HISTORY.md`.

## Restricciones

- Usar únicamente código, documentación, historial y acuerdos existentes.
- No inventar funcionalidades, reglas, fuentes, parámetros ni esquema Dataverse.
- No modificar archivos dentro de `src/`.
- No cambiar comportamiento funcional ni mover código.
- No crear componentes React.
- No crear commits, ramas ni push.
- No modificar configuración de Git.
- No incluir logs en Git.

## Reglas, fuentes y parámetros afectados

- Reglas funcionales: ninguna; solo se catalogan las reglas existentes.
- Fuentes de datos: ninguna; solo se documentan fuentes y contratos actuales.
- Parámetros de negocio: ninguno; solo se registran ubicaciones y valores actuales.
- Arquitectura: se documentan el estado implementado, el flujo objetivo aprobado y sus brechas, sin mover código.

## Riesgos

- Que la documentación quede desactualizada respecto del código en prompts futuros.
- Confundir objetivos del roadmap con funcionalidades completadas.
- Interpretar comentarios de Dataverse como esquema aprobado.
- Que el log local no aparezca en Git por estar ignorado; su existencia debe validarse por ruta.

## Validaciones

- `npm run build`.
- `git diff --check`.
- `git status --short`.
- Confirmación de que no existen cambios dentro de `src/`.

## Estrategia de reversión

Eliminar únicamente los documentos creados por este prompt y restaurar `AGENTS.md` y `docs/PROMPT_HISTORY.md` a su versión previa mediante un cambio Git explícito y revisable. El código funcional no requiere reversión porque no se modifica.

## Resultado esperado

- Knowledge Base completa, navegable y sincronizada con la implementación V1.
- Diferenciación explícita entre estado implementado, arquitectura objetivo y trabajo no definido.
- `AGENTS.md` exige revisar Knowledge Base, prompts y Git antes de cualquier cambio.
- `npm run build` y `git diff --check` ejecutados.
- Log de evidencia completo en la ruta solicitada.
