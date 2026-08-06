# Prompt 026 — Configuration Center MVP

## Objetivo

Implementar una pantalla responsive de Configuration Center y ampliar `configurationService` para consultar, validar, persistir localmente y restaurar únicamente los parámetros ya registrados en `CONFIGURATION_SCHEMA`.

## Alcance aprobado

- Nueva pestaña Configuration Center en `App.jsx`.
- Tabla responsive con ID, nombre, clave, categoría, descripción, valor actual, default, edición, fuente y acciones.
- Búsqueda por nombre, clave o descripción y filtro por categoría.
- Edición condicionada por `editable`; los tres pilotos actuales siguen siendo no editables.
- Persistencia exclusiva en `configurationService` mediante `localStorage`.
- Fallback a defaults, validación por tipo, restauración individual y restauración global.
- Siete pruebas unitarias del contrato del servicio.

## Restricciones preservadas

No se agregaron parámetros, dependencias, Providers, Dataverse ni cambios a reglas, motores, parsers, PortfolioAnalysisService, ExecutiveReportService o Repository público.

## Validación

161/161 pruebas aprobadas, build Vite correcto y `git diff --check` correcto.
