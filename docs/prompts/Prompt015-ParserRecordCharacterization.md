# Prompt 015 — Caracterizar parsers y ensamblaje de registros

## Objetivo

Crear pruebas de caracterización deterministas para congelar los parsers actuales del Maestro y del Inventario y el ensamblaje final de cada `record` antes de extraer estas responsabilidades de `src/App.jsx`.

## Alcance

- Ejecutar el handler real `procesar` desde `App` mediante un arnés exclusivo de test.
- Usar datasets controlados con fecha del sistema fija en `2026-08-15`.
- Caracterizar tab, coma y punto y coma; normalización; detección exacta/parcial; alias; columnas faltantes; SKU vacío y duplicado; precedencia; defaults; `SIN MAESTRO`; y campos del registro final.
- Mantener las fórmulas de Inventory Engine y EOL Engine en sus módulos de dominio, sin copiarlas en pruebas.
- Documentar cobertura, riesgos y contratos observados.

## Archivos creados

- `src/__tests__/parserRecordCharacterization.test.js`.
- `docs/prompts/Prompt015-ParserRecordCharacterization.md`.
- `logs/Prompt015-ParserRecordCharacterization.log` como evidencia local ignorada por Git.

## Archivos modificados

- `docs/knowledge/ARCHITECTURE.md`.
- `docs/knowledge/BUSINESS_RULES.md`.
- `docs/knowledge/DATA_SOURCES.md`.
- `docs/knowledge/DECISIONS.md`.
- `docs/knowledge/FUNCTIONAL_BASELINE.md`.
- `docs/knowledge/CHANGELOG.md`.
- `docs/PROMPT_HISTORY.md`.

## Casos caracterizados

- Separación de filas por salto de línea y columnas por tab, coma o punto y coma.
- Normalización de mayúsculas, espacios, acentos y símbolos.
- Prioridad exacta, fallback parcial y colisión por subcadena en encabezados.
- Alias y defaults de Maestro e Inventario.
- Estado EOL/DESCONTINUADO/ACTIVO, fecha, costos y atributos del Maestro.
- Enteros del Inventario, columna proyectada ausente o vacía y campos opcionales.
- Omisión de SKU vacío; último Maestro duplicado; preservación de Inventarios duplicados.
- Precedencia del Maestro y fallback de nombre desde Inventario.
- Registros `SIN MAESTRO`, validaciones de columnas obligatorias y datasets solo con encabezados.
- Conjunto exacto de campos con Maestro y campos actualmente ausentes en `SIN MAESTRO`.

## Reglas, fuentes y parámetros afectados

- Reglas: ninguna modificada; las pruebas congelan contratos de entrada y ensamblaje existentes.
- Fuentes: ninguna modificada; Maestro e Inventario continúan como texto en estado React.
- Parámetros: ninguno modificado; se usa una configuración de test controlada.
- Arquitectura: no se extraen Parser, Application Service, Repository o Provider.

## Restricciones

- No modificar comportamiento funcional, reglas, defaults o contratos.
- No modificar `src/App.jsx`, JSX, `dataService.js` o `datos.json`.
- No copiar fórmulas de negocio ya extraídas.
- No extraer parsers ni Application Service.
- No agregar dependencias ni ejecutar `npm audit fix`.
- No crear commit, rama o push ni modificar configuración de Git.

## Riesgos

- El arnés temporal depende del orden actual de `useState` y del texto/botón de cálculo.
- La coincidencia parcial por subcadena puede elegir una columna inesperada; este comportamiento queda caracterizado, no corregido.
- El parser simple no soporta quoted CSV y trata cualquiera de los tres delimitadores como separador dentro de toda fila.
- La suite no renderiza el DOM ni cubre exportaciones, Pareto, Distribution o Executive Report.

## Validaciones

- `npm test -- --run`.
- `npm run build`.
- `git diff --check`.
- `git status --short`.

## Estrategia de reversión

Eliminar el archivo de pruebas de Prompt 015 y revertir únicamente sus entradas documentales mediante un cambio Git explícito y revisable. No es necesario revertir código de producción porque no se modifica.

## Resultado esperado

- 28 pruebas nuevas y 117 pruebas totales aprobadas.
- Contratos actuales de parsing y `record` documentados sin refactorización de producción.
- Build y `git diff --check` exitosos.
- Evidencia completa en `logs/Prompt015-ParserRecordCharacterization.log`.
