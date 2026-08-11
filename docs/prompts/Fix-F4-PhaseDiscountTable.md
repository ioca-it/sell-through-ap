# FIX F4 — Descuento 15% y Tabla de Descuento por Fase

## Objetivo

Corregir exclusivamente el descuento consumidor de F4 a 15% para USA y CHINA
desde la fuente autorizada de Domain. La Tabla de Descuento por Fase, los
cálculos EOL y la hoja Excel deben consumir la misma regla, sin hardcodear 15%
en `App.jsx`.

## Causa y fuente confirmadas

F4 se resuelve en `src/domain/eol/eolEngine.js`, fuera de `datos.json`, porque la
tabla física conserva F0–F3. La fuente efectiva mantenía 50% y la autorización
vigente lo sustituye exclusivamente por 15% para USA y CHINA. Permanecen
`diasMin: 366`, mínimo 12 y los aportes heredados de la última fase configurada.

## Corrección

- Domain define una sola vez el 15% y lo reutiliza al resolver F4.
- Application Service entrega esa lista efectiva a presentación mediante Repository.
- La tabla visible, los textos F4 y la hoja `Ref Tabla Fases` consumen dinámicamente la lista.
- `datos.json`, Configuration Center, Repository, Provider, Dataverse, Entra,
  Render, F0–F3 y la lógica de selección EOL permanecen sin cambios funcionales.

## Valores F4 corregidos

| Origen | Inicio efectivo | Descuento | IOCA base | Retail base | Mínimo reconocido |
| --- | ---: | ---: | ---: | ---: | ---: |
| USA | más de 365 días (`diasMin: 366`) | 15% | 20% | 80% | 12 |
| CHINA | más de 365 días (`diasMin: 366`) | 15% | 20% | 80% | 12 |

Con menos de 12 unidades se conserva la regla vigente IOCA 0% / Retail 100%; no
se modificó ni se incorporó como fila física.

## Validación

- Pruebas Domain para selección y cálculos F4 USA/CHINA con 12 y menos de 12 unidades.
- Prueba UI de regresión para filas F4 de USA y CHINA.
- Prueba de exportación para filas F4 en `Ref Tabla Fases`.
- `npm test -- --run`: aprobado, 238/238 pruebas en 19 archivos.
- `npm run build`: aprobado, Vite 5.4.21, 1527 módulos.
- `git diff --check`: aprobado, sin errores de whitespace.

## Reversión

Revertir exclusivamente los cambios identificados en este fix. No restaurar ni
sobrescribir modificaciones preexistentes del workspace.
