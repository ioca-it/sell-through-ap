# Prompt 010 — Crear Baseline Funcional

## Objetivo

Crear una línea base funcional de `sell-through-ap` antes de iniciar la refactorización de `App.jsx`, de forma que los cambios futuros puedan contrastarse contra el comportamiento observable vigente.

## Alcance

- Registrar versión, fecha, rama y commit del código observado.
- Inventariar todas las pantallas, estados, secciones, KPIs, tablas, botones y acciones visibles.
- Documentar entradas, salidas y exportaciones realmente soportadas.
- Identificar Inventory Engine, EOL Engine, Pareto, Distribution, Executive Report, Excel y CSV.
- Registrar responsabilidades actuales de `App.jsx`, invariantes y riesgos de regresión.
- Actualizar el índice de documentación, changelog e historial de prompts.
- Ejecutar las validaciones y generar evidencia local.

## Archivos creados

- `docs/knowledge/FUNCTIONAL_BASELINE.md`.
- `docs/prompts/Prompt010-FunctionalBaseline.md`.
- `logs/Prompt010-FunctionalBaseline.log` como evidencia local ignorada por Git.

## Archivos modificados

- `docs/README.md`.
- `docs/knowledge/CHANGELOG.md`.
- `docs/PROMPT_HISTORY.md`.

## Restricciones

- No modificar archivos dentro de `src/`.
- No modificar `App.jsx`.
- No cambiar lógica ni comportamiento funcional.
- No mover código ni crear componentes.
- No inventar funcionalidades, reglas, parámetros o fuentes.
- No crear commits, ramas ni push.
- No modificar configuración de Git.

## Reglas, fuentes y parámetros afectados

- Reglas funcionales: ninguna; se documenta el comportamiento existente.
- Fuentes: ninguna; se documentan entradas y salidas actuales.
- Parámetros: ninguno; se registran defaults e indicadores visibles sin cambiarlos.
- Arquitectura: ninguna modificación; se inventariaron las responsabilidades actuales para preparar refactorizaciones futuras.

## Riesgos

- Omitir un estado condicional y aceptar luego una regresión como equivalente.
- Confundir labels visibles con fórmulas o contratos de datos.
- Tratar la baseline documental como prueba automatizada suficiente.
- Desincronizar la baseline en un cambio funcional futuro.

## Validaciones

- `npm run build`.
- `git diff --check`.
- `git status --short`.
- Confirmación de que `src/` permanece sin cambios.

## Estrategia de reversión

Eliminar los archivos creados por Prompt 010 y restaurar únicamente las adiciones de este prompt en `docs/README.md`, `docs/knowledge/CHANGELOG.md` y `docs/PROMPT_HISTORY.md`. No se requiere reversión funcional porque `src/` no se modifica.

## Resultado esperado

- Baseline oficial y exhaustiva del comportamiento observable vigente.
- Contrato documental utilizable para pruebas de caracterización y revisión de refactorizaciones.
- Build y diff-check exitosos.
- Log de evidencia completo en la ruta solicitada.
