# Flujo obligatorio para cambios mediante IA

## 1. Contexto mínimo obligatorio

Antes de actuar, leer únicamente:

1. `AGENTS.md`.
2. `docs/knowledge/ARCHITECTURE_STATE.md`.
3. `docs/knowledge/ROADMAP.md`.
4. El último prompt relacionado con el cambio.
5. El último log o auditoría relacionado con el cambio.
6. Los archivos que serán modificados.

Usar `docs/knowledge/INDEX.md` para localizar contexto adicional únicamente cuando el prompt lo exija o exista una duda material no resuelta por el conjunto mínimo. No leer toda la Knowledge Base, todos los prompts o todo `src/` por defecto. No releer durante una misma sesión documentos ya conocidos que no hayan cambiado.

## 2. Flujo oficial por rol

### ChatGPT

- Define arquitectura, roadmap, decisiones y prompts.
- Resuelve cambios de alcance funcional antes de implementar.

### Codex

- Implementa el alcance aprobado.
- Ejecuta pruebas y build.
- Sincroniza documentación técnica y genera logs.

### Claude

- Audita arquitectura, riesgos, deuda técnica y preparación futura.
- Clasifica hallazgos y valida límites; no modifica código ni autoriza cambios por sí solo.

### Copilot

- Asiste localmente con refactorizaciones pequeñas y código puntual dentro de un alcance aprobado.
- No decide arquitectura, roadmap, reglas, parámetros ni fuentes.

## 3. Ejecución

1. Revisar `git status --short` y preservar cambios preexistentes.
2. Identificar objetivo, archivos, reglas, fuentes, parámetros, riesgos y reversión.
3. Confirmar en el código el comportamiento afectado; distinguir `implementado`, `aprobado pendiente` y `no definido`.
4. Aplicar el cambio mínimo sin ampliar alcance ni inventar contratos.
5. Actualizar `ARCHITECTURE_STATE.md` en cada hito y solo los documentos específicos afectados según `INDEX.md`.
6. Registrar el prompt y generar evidencia local cuando se solicite.

Si no existe autorización funcional, conservar fórmulas, umbrales, defaults, textos contractuales y resultados.

## 4. Validación y entrega

Ejecutar, salvo restricción explícita más estricta:

```text
npm test -- --run
npm run build
git diff --check
git status --short
```

Confirmar el alcance del diff, que los archivos prohibidos no cambiaron y que el log termina con la identificación requerida. Entregar exactamente el formato solicitado; no crear commit, push o rama sin autorización.

## 5. Reversión

Mantener cambios acotados y visibles en Git, documentar cómo restaurarlos y no usar operaciones destructivas sobre trabajo ajeno. Una migración de fuente debe conservar una ruta de rollback aprobada.
