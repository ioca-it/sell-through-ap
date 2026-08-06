# Prompt 029 — Corrección final de impresión PDF

Se aisló la impresión del Informe Ejecutivo mediante reglas `@media print` en `App.jsx`. Durante la impresión se ocultan cabecera, navegación, controles y resto del shell; únicamente `.informe-pdf` y sus descendientes quedan visibles. Se conservaron colores, tablas y saltos de página sin alterar datos, DTO, navegación normal ni dependencias.

Validación: 161/161 pruebas, build correcto y `git diff --check` correcto.
