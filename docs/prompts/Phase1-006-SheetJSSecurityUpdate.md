# PHASE1-006 — SheetJS Security Update

Fecha: 2026-08-13

## Objetivo

Eliminar exclusivamente las vulnerabilidades productivas atribuidas a `xlsx`
mediante la distribución oficial soportada de SheetJS Community Edition, sin
modificar la funcionalidad Excel ni ampliar el alcance a Vite, esbuild o nanoid.

## Línea base identificada

- Dependencia anterior: `xlsx@^0.18.5`, resuelta desde npmjs como `0.18.5`.
- Único import productivo: `import * as XLSX from 'xlsx'` en `src/App.jsx`.
- Escritura vigente: `book_new`, `decode_range`, `encode_cell`, `aoa_to_sheet`,
  `book_append_sheet` y `writeFile` para generar el libro de análisis.
- Lectura productiva de archivos Excel: no existe. La entrada vigente continúa
  siendo texto pegado; no se agrega selector, parser ni fuente Excel.
- Cobertura previa relacionada: prueba de exportación de F4 en
  `src/__tests__/ap01DashboardRevision.test.js` mediante el API real de utilidades
  y un mock de descarga.

## Fuente oficial y decisión

SheetJS publica las versiones soportadas desde su CDN a partir de `0.18.6`. La
versión estable actual recomendada es `0.20.3`:

- https://cdn.sheetjs.com/
- https://docs.sheetjs.com/docs/getting-started/installation/nodejs/
- https://cdn.sheetjs.com/advisories/CVE-2023-30533
- https://cdn.sheetjs.com/advisories/CVE-2024-22363

Se fija la URL versionada del tarball oficial para evitar que una instalación
futura cambie silenciosamente de versión:

```text
https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

El paquete conserva el nombre `xlsx`, el import ESM vigente y el contrato usado
por `App.jsx`.

## Implementación

- `package.json`: sustituye `^0.18.5` por el tarball oficial fijado de `0.20.3`.
- `package-lock.json`: resuelve `xlsx@0.20.3` desde `cdn.sheetjs.com`, con su
  integridad, y elimina las dependencias transitivas exclusivas de `0.18.5`.
- `src/App.jsx`: sin cambios por este hito.
- `src/__tests__/ap01DashboardRevision.test.js`: conserva la regresión F4 y
  agrega un ciclo real de serialización y lectura del `.xlsx` generado.

## Compatibilidad protegida

La regresión verifica:

- nombre de archivo;
- orden y nombres de las catorce hojas soportadas por la exportación;
- lectura del libro serializado con `XLSX.read`;
- valores F4 USA y CHINA, descuento `0.15` y aportes `0.2`/`0.8`;
- formato porcentual `0%` y anchos de columna de `Ref Tabla Fases`;
- presencia de la fórmula descriptiva y un total numérico del resumen.

No se modifican fórmulas, valores, reglas Sell Through, fuentes, nombres de
hojas, estructura del libro ni estilos soportados existentes.

## Riesgos y reversión

- El tarball depende del CDN oficial en una instalación limpia; la URL queda
  fijada y el lockfile valida su integridad.
- Para revertir, restaurar únicamente la referencia y resolución de `xlsx` en
  `package.json`/`package-lock.json`, la regresión agregada y esta documentación,
  sin afectar cambios preexistentes del workspace.

## Validación

- `npm test -- --run`: aprobado, 250/250 pruebas en 23 archivos.
- `npm run build`: aprobado, Vite 5.4.21, 1674 módulos transformados.
- `npm audit`: `xlsx` ausente; permanecen 3 vulnerabilidades dev fuera de
  alcance (1 moderada y 2 altas en Vite/esbuild/nanoid).
- `npm audit --omit=dev`: aprobado, 0 vulnerabilidades.
- `git diff --check`: aprobado, sin errores de whitespace; avisos CRLF informativos.
- Sin commit, push ni deploy.
