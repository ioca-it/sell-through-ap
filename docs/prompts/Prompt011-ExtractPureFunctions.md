# Prompt 011 — Refactorización Fase 1: Extraer funciones puras

## Objetivo

Reducir responsabilidades de `src/App.jsx` trasladando exclusivamente ocho funciones puras a módulos independientes, sin modificar comportamiento funcional.

## Alcance

- Crear módulos de formato, fechas y encabezados dentro de `src/utils/`.
- Mover las funciones conservando literalmente nombres, firmas, parámetros y cuerpos.
- Sustituir las definiciones locales de `App.jsx` por imports nombrados.
- Mantener JSX, estado React, reglas, cálculos, resultados y acciones sin cambios.
- Actualizar arquitectura, changelog e historial.
- Ejecutar validaciones y generar evidencia local.

## Archivos creados

- `src/utils/formatters.js`.
- `src/utils/dateUtils.js`.
- `src/utils/headerUtils.js`.
- `docs/prompts/Prompt011-ExtractPureFunctions.md`.
- `logs/Prompt011-ExtractPureFunctions.log` como evidencia local ignorada por Git.

## Archivos modificados

- `src/App.jsx`.
- `docs/knowledge/ARCHITECTURE.md`.
- `docs/knowledge/CHANGELOG.md`.
- `docs/PROMPT_HISTORY.md`.

## Funciones extraídas

| Módulo | Funciones |
| --- | --- |
| `formatters.js` | `fmtUSD`, `fmtPct`, `fmtIdx`, `fmtUSDInline` |
| `dateUtils.js` | `parseFecha`, `diasEntre`, `primerDiaMes` |
| `headerUtils.js` | `normalizeHeader` |

## Reglas, fuentes y parámetros afectados

- Reglas de negocio: ninguna.
- Fuentes de datos: ninguna.
- Parámetros y constantes: ninguno.
- Comportamiento observable: ninguno.
- Arquitectura: ubicación de ocho helpers puros, ahora consumidos por import.

## Restricciones

- No modificar firmas, parámetros, nombres o lógica.
- No modificar JSX.
- No mover estado, hooks ni componentes.
- No modificar reglas, cálculos, resultados o comportamiento observable.
- No extraer funciones adicionales.
- No crear commit, rama o push.
- No modificar configuración de Git.

## Riesgos

- Omitir un import o dejar una definición duplicada.
- Introducir un cambio accidental al copiar expresiones regulares, formatos o aritmética de fechas.
- Crear dependencias circulares desde `src/utils/` hacia `App.jsx` o datos.
- Confundir esta extracción con una separación de Domain Service ya completada.

## Validaciones

- Revisión del diff de `src/App.jsx` para confirmar ausencia de cambios JSX.
- Verificación de una única definición/export por función.
- `npm run build`.
- `git diff --check`.
- `git status --short`.

## Estrategia de reversión

Restaurar las ocho definiciones en sus ubicaciones originales de `src/App.jsx`, retirar los tres imports y eliminar únicamente los tres módulos `src/utils/` creados por este prompt. Revertir además las entradas documentales de Prompt 011 mediante un cambio Git explícito y revisable.

## Resultado esperado

- Tres módulos independientes con encabezados AI-First y sin dependencias de fuente.
- `App.jsx` usa imports sin cambios en consumidores o JSX.
- Build y diff-check exitosos.
- Evidencia completa en `logs/Prompt011-ExtractPureFunctions.log`.
