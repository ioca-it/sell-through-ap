# Claude 001 — Configurar perfil de auditor técnico

## Objetivo

Configurar a Claude Code como auditor técnico permanente del proyecto `sell-through-ap`. Claude revisa arquitectura, mantenibilidad, riesgos, documentación y preparación para Dataverse, pero no modifica código salvo autorización explícita posterior.

## Revisión obligatoria realizada

- `AGENTS.md`.
- Todos los documentos de `docs/knowledge/`.
- Prompts de `docs/prompts/` relevantes (Prompt005, Prompt006, Prompt009.5 a Prompt016).
- `git status --short`.
- `git diff --stat`.
- Rama actual: `feature/foundation-refactor`.

## Archivos creados

- `docs/knowledge/CLAUDE_AUDITOR_PROFILE.md`: define rol, responsabilidades, restricciones, clasificación obligatoria de hallazgos y formato obligatorio de auditoría.
- `docs/prompts/Claude001-AuditorProfile.md` (este archivo).
- `logs/Claude001-AuditorProfile.log` como evidencia local ignorada por Git.

## Archivos modificados

- `AGENTS.md`: agrega sección "Roles de IA en el proyecto" indicando que Codex es el único implementador principal y Claude es el auditor técnico independiente.
- `docs/knowledge/AI_WORKFLOW.md`: agrega sección 8 "Rol de auditoría independiente" y renumera la sección de reversión a 9.
- `docs/knowledge/DECISIONS.md`: agrega D-017, decisión aprobada sobre el rol permanente de auditor de Claude.
- `docs/PROMPT_HISTORY.md`: agrega entrada "Claude 001 — Configurar perfil de auditor técnico".

## Reglas, fuentes y parámetros afectados

- Reglas de negocio: ninguna. No se modificó `src/`.
- Fuentes: ninguna.
- Parámetros: ninguno.
- Arquitectura: sin cambios; el perfil de auditor documenta un rol de revisión, no una capa de la arquitectura objetivo.

## Restricciones aplicadas

- No se modificó código en `src/`.
- No se aplicaron refactorizaciones.
- No se creó commit.
- No se hizo push.
- No se cambiaron reglas funcionales.
- No se inventaron entidades ni columnas de Dataverse.
- No se presentaron mejoras opcionales como defectos.
- No se ejecutaron comandos destructivos.

## Validaciones

- `npm run build`.
- `git diff --check`.

## Riesgos

- El perfil de auditor es un documento de configuración de rol; no reemplaza la ejecución de una auditoría real sobre el estado actual del código.
- Si un futuro prompt de auditoría no sigue el formato de nueve secciones o la clasificación de cinco categorías definida aquí, quedará en desacuerdo con este perfil y deberá corregirse.
- La separación Claude/Codex depende de que cada prompt futuro respete explícitamente las restricciones de este perfil; no hay una barrera técnica que lo imponga.

## Pendientes

- Ejecutar la primera auditoría real de arquitectura y mantenibilidad usando el formato de nueve secciones definido en `docs/knowledge/CLAUDE_AUDITOR_PROFILE.md`.
- Evaluar si el rol de auditor debe reflejarse también en `docs/knowledge/CODING_STANDARDS.md` u otro documento cuando exista una primera auditoría real que lo motive.

## Estrategia de reversión

Eliminar `docs/knowledge/CLAUDE_AUDITOR_PROFILE.md` y `docs/prompts/Claude001-AuditorProfile.md`, y revertir los bloques agregados en `AGENTS.md`, `docs/knowledge/AI_WORKFLOW.md`, `docs/knowledge/DECISIONS.md` y `docs/PROMPT_HISTORY.md` mediante un cambio Git explícito y revisable.

## Resultado esperado

- Rol de auditor técnico permanente de Claude documentado y enlazado desde `AGENTS.md`, `AI_WORKFLOW.md` y `DECISIONS.md`.
- Build y `git diff --check` exitosos.
- Evidencia completa en `logs/Claude001-AuditorProfile.log`.
- Sin commit ni push.
