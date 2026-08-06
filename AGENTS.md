# AGENTS.md — sell-through-ap

## Reglas permanentes

- Usar `docs/knowledge/INDEX.md` como único índice documental y seguir el contexto mínimo de `docs/knowledge/AI_WORKFLOW.md`; no releer documentos ya conocidos y sin cambios en la misma sesión.
- No inventar funcionalidades, reglas, fuentes, parámetros, entidades ni columnas Dataverse.
- Preservar comportamiento, reglas, fórmulas, defaults y contratos salvo autorización explícita.
- Mantener cambios mínimos, reversibles y dentro del alcance; preservar trabajo preexistente.
- No crear commits, push, ramas ni incluir logs en Git sin autorización expresa.
- Verificar `git status --short`, `npm test -- --run`, `npm run build` y `git diff --check` según el alcance.

## Estándares y convenciones

- Arquitectura AI-First y modular; una responsabilidad principal por módulo.
- Flujo vigente: `UI -> Application Service -> Domain Service -> Repository -> Provider -> Fuente`.
- Separar UI, negocio, configuración y acceso a datos.
- React no accede directamente a JSON, Excel, Dataverse o Business Central; las fuentes pasan por Repository/Provider.
- Las constantes de negocio modificables migran progresivamente al Configuration Center mediante prompt aprobado.
- Documentar el motivo de reglas, fallbacks y contratos; evitar comentarios redundantes.
- Cada cambio identifica objetivo, archivos, reglas, fuentes, parámetros, riesgos, validaciones y reversión.
- Todo prompt relevante se registra en `docs/prompts/` y todo hito actualiza `ARCHITECTURE_STATE.md`.

## Flujo oficial de IA

- ChatGPT: arquitectura, roadmap, decisiones y definición de prompts.
- Codex: implementación principal, pruebas, documentación técnica y logs.
- Claude: auditoría independiente, riesgos, deuda técnica y validación arquitectónica; no implementa sin autorización posterior.
- Copilot: asistencia local, refactorizaciones pequeñas y generación puntual; nunca toma decisiones arquitectónicas.

## Estructura del proyecto

- `src/application/`: orquestación de casos de uso.
- `src/domain/`: reglas y Business Services puros.
- `src/repositories/` y `src/providers/`: fronteras de acceso a fuentes.
- `src/configuration/`: schema, defaults y servicio de configuración.
- `docs/knowledge/`: conocimiento oficial, índice y estado vigente.
- `docs/prompts/`: acuerdos ejecutables por hito.
- `logs/`: evidencia local excluida de Git.
