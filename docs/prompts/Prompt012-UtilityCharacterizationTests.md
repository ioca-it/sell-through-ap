# Prompt 012 — Pruebas de caracterización para utilidades extraídas

## Objetivo

Incorporar pruebas automatizadas que congelen el comportamiento actual de `fmtUSD`, `fmtPct`, `fmtIdx`, `fmtUSDInline`, `parseFecha`, `diasEntre`, `primerDiaMes` y `normalizeHeader` antes de continuar la refactorización.

## Alcance

- Incorporar Vitest `3.2.7` como dependencia de desarrollo compatible con Vite 5.
- Agregar el script `npm test` sin modificar la configuración del build.
- Ejecutar las pruebas en el entorno Node predeterminado, sin DOM ni configuración adicional.
- Caracterizar valores normales, cero, ausentes, negativos, fechas y variantes de encabezados.
- Registrar y validar el comportamiento actual sin modificar las implementaciones probadas.

## Archivos creados

- `src/utils/__tests__/formatters.test.js`.
- `src/utils/__tests__/dateUtils.test.js`.
- `src/utils/__tests__/headerUtils.test.js`.
- `docs/prompts/Prompt012-UtilityCharacterizationTests.md`.
- `logs/Prompt012-UtilityCharacterizationTests.log` como evidencia local ignorada por Git.

## Archivos modificados

- `package.json`.
- `package-lock.json`.
- `docs/knowledge/PROJECT_OVERVIEW.md`.
- `docs/knowledge/ARCHITECTURE.md`.
- `docs/knowledge/CODING_STANDARDS.md`.
- `docs/knowledge/DECISIONS.md`.
- `docs/knowledge/AI_WORKFLOW.md`.
- `docs/knowledge/FUNCTIONAL_BASELINE.md`.
- `docs/knowledge/CHANGELOG.md`.
- `docs/PROMPT_HISTORY.md`.

## Pruebas creadas

| Archivo | Casos | Contrato caracterizado |
| --- | ---: | --- |
| `formatters.test.js` | 24 | Importes USD, porcentajes e índices normales, cero, negativos y valores ausentes/no numéricos. |
| `dateUtils.test.js` | 19 | Tres formatos de fecha admitidos, espacios, ausentes, formatos inválidos, normalización de calendario, días positivos/cero/negativos y primer día local del mes. |
| `headerUtils.test.js` | 6 | Mayúsculas, espacios, acentos, símbolos, combinaciones y números. |
| **Total** | **49** | Ocho exports públicos. |

## Reglas, fuentes y parámetros afectados

- Reglas de negocio: ninguna; solo se capturan resultados existentes.
- Fuentes de datos: ninguna.
- Parámetros y configuración funcional: ninguno.
- Configuración técnica: se agrega Vitest y el script de pruebas.
- Comportamiento observable: ninguno.

## Restricciones

- No modificar implementaciones ni firmas públicas de las utilidades.
- No modificar JSX, estado React o comportamiento visible.
- No modificar reglas, cálculos, fuentes ni parámetros de negocio.
- No crear configuración de test innecesaria.
- No ejecutar correcciones automáticas de dependencias fuera del alcance.
- No crear commit, rama o push.
- No modificar configuración de Git.

## Riesgos

- Las fechas usan zona horaria local y `Date` normaliza días calendario fuera de rango; las pruebas preservan ambas características.
- `toLocaleString('en-US')` depende del soporte de internacionalización del runtime.
- La suite cubre utilidades aisladas, no motores, JSX, exportaciones ni interacción del usuario.
- La auditoría npm reporta vulnerabilidades en dependencias existentes; su remediación requiere un alcance separado para evitar actualizaciones mayores no autorizadas.

## Validaciones

- `npm test -- --run`.
- `npm run build`.
- `git diff --check`.
- `git status --short`.

## Estrategia de reversión

Eliminar únicamente los tres archivos de prueba y retirar el script `test` y la dependencia `vitest`; regenerar `package-lock.json` mediante npm y revertir las entradas documentales de Prompt 012 mediante un cambio Git explícito y revisable. No se requiere reversión funcional porque las implementaciones no se modifican.

## Resultado esperado

- 49 pruebas de caracterización ejecutables en una sola orden.
- Comportamiento de las ocho utilidades congelado sin cambiar producción.
- Tests, build y diff-check exitosos.
- Evidencia completa en `logs/Prompt012-UtilityCharacterizationTests.log`.
