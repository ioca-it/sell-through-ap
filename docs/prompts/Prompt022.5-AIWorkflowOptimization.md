# Prompt 022.5 — AI Workflow Optimization

## Objetivo

Optimizar exclusivamente la documentación y el proceso de IA para reducir el contexto repetitivo de futuros prompts, sin modificar código de producción, pruebas, contratos o comportamiento funcional.

## Problema identificado

`AGENTS.md` y `AI_WORKFLOW.md` exigían releer toda la Knowledge Base, todos los prompts y varios antecedentes en cada cambio. El conjunto fijo alcanzaba 37 archivos y 292,831 bytes antes de abrir el código específico.

## Patrón aprobado

```text
AGENTS.md
  -> ARCHITECTURE_STATE.md
  -> ROADMAP.md
  -> último prompt relacionado
  -> último log relacionado
  -> archivos que serán modificados

INDEX.md -> contexto adicional solo cuando sea necesario
```

No se releen documentos conocidos que no cambiaron durante la misma sesión. `INDEX.md` no duplica contenido: identifica cada documento, su propósito y cuándo consultarlo.

## Documentos creados

- `docs/knowledge/INDEX.md`.
- `docs/knowledge/ARCHITECTURE_STATE.md`.
- `docs/prompts/Prompt022.5-AIWorkflowOptimization.md`.
- `logs/Prompt022.5-AIWorkflowOptimization.log`.

## Documentos optimizados

- `AGENTS.md`: conserva reglas permanentes, estándares, roles, convenciones y estructura del proyecto.
- `AI_WORKFLOW.md`: formaliza contexto mínimo, ejecución, validación y reversión.
- `ROADMAP.md`: registra la optimización y Prompt 023 como siguiente hito técnico.
- `CHANGELOG.md` y `PROMPT_HISTORY.md`: trazabilidad del acuerdo.

## Flujo oficial de IA

- ChatGPT: arquitectura, roadmap, decisiones y prompts.
- Codex: implementación, pruebas, documentación técnica y logs.
- Claude: auditorías, riesgos, deuda técnica y validación arquitectónica.
- Copilot: asistencia local, refactorizaciones pequeñas y código puntual; nunca decisiones arquitectónicas.

## Reducción estimada de tokens

Medición con `rg --stats` sobre el contexto obligatorio:

- Antes: 37 archivos, 292,831 bytes, aproximadamente 73,208 tokens.
- Núcleo fijo nuevo: 3 archivos, 8,917 bytes, aproximadamente 2,230 tokens.
- Reducción del núcleo fijo: 283,914 bytes y aproximadamente 70,978 tokens, equivalente a 96.95%.
- Bootstrap ampliado incluyendo `INDEX.md` y `AI_WORKFLOW.md`: 14,571 bytes, aproximadamente 3,643 tokens y 95.02% menos que el esquema anterior.

Cada tarea añade solo su prompt, log y archivos relacionados. Por ello la reducción total real variará según el tamaño del cambio, pero elimina la mayor fuente de consumo repetitivo.

## Estado ejecutivo

`ARCHITECTURE_STATE.md` debe actualizarse en cada hito y mantener como máximo dos páginas. Es la referencia rápida para fase, último prompt/auditoría, servicios, arquitectura, decisiones congeladas, métricas, pruebas y build.

## Reglas, fuentes y parámetros afectados

No se modifican reglas de negocio, fuentes, parámetros, fórmulas, defaults, contratos ni resultados. El cambio es exclusivamente documental y operativo para IA.

## Validaciones

- `npm test -- --run`: 154/154 pruebas aprobadas.
- `npm run build`: aprobado con 1517 módulos transformados.
- `git diff --check`: aprobado, sin errores de whitespace.
- Confirmación de alcance: ningún archivo dentro de `src` fue modificado por Prompt 022.5.

## Riesgos y mitigaciones

- Riesgo de omitir contexto especializado: `INDEX.md` dirige a la fuente concreta cuando el conjunto mínimo no resuelve una duda material.
- Riesgo de estado obsoleto: cada hito debe actualizar `ARCHITECTURE_STATE.md`.
- Riesgo de pérdida histórica: no se elimina documentación; solo deja de ser lectura obligatoria masiva.

## Estrategia de reversión

Restaurar las instrucciones anteriores de `AGENTS.md` y `AI_WORKFLOW.md`, retirar `INDEX.md` y `ARCHITECTURE_STATE.md`, y revertir las entradas documentales. No existen cambios de código, datos o dependencias que recuperar.

## Recomendación siguiente

Ejecutar Prompt 023 usando por primera vez el contexto mínimo y actualizar `ARCHITECTURE_STATE.md` al finalizar, validando la reducción real del flujo optimizado.
