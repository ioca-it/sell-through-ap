# Prompt 013 — Caracterización de Inventory Engine y EOL Engine

## Objetivo

Crear pruebas deterministas que congelen el comportamiento actual de las reglas de inventario y EOL antes de extraerlas de `src/App.jsx`.

## Alcance

- Ejecutar el handler `procesar` real sin modificarlo ni copiar sus fórmulas.
- Usar un arnés exclusivo de test para simular el estado React y capturar `resultados`.
- Fijar el reloj y usar Maestro e Inventario TSV controlados.
- Caracterizar defaults, datos faltantes, límites y resultados numéricos.
- Mantener intactos módulos de producción, JSX, fuentes y configuración.

## Archivos creados

- `src/__tests__/inventoryEolCharacterization.test.js`.
- `docs/prompts/Prompt013-InventoryEOLCharacterization.md`.
- `logs/Prompt013-InventoryEOLCharacterization.log` como evidencia local ignorada por Git.

## Archivos modificados

- `docs/knowledge/ARCHITECTURE.md`.
- `docs/knowledge/BUSINESS_RULES.md`.
- `docs/knowledge/DECISIONS.md`.
- `docs/knowledge/FUNCTIONAL_BASELINE.md`.
- `docs/knowledge/CHANGELOG.md`.
- `docs/PROMPT_HISTORY.md`.

## Capa mínima de caracterización

El test sustituye únicamente `useState` durante su ejecución, instancia `App`, localiza el botón `Calcular y ver dashboard` en el árbol React y llama su handler. Los setters simulados capturan el mismo objeto `resultados` que recibe el componente.

No se exportaron helpers internos, no se movió `procesar`, no se creó un motor paralelo y no se incorporó un renderer DOM.

## Datasets controlados

- Reloj del navegador simulado: `2026-08-15 12:00` local.
- Fecha base esperada: `2026-08-01` local.
- `fechaCorte` configurada deliberadamente en `2030-01-15` para congelar que no interviene en EOL.
- Configuración funcional: período Mensual `4.33`, safety stock `4`, lead time USA `4` y China `12`.
- Maestro principal: 25 SKU controlados activos/EOL, marcas `SKULLCANDY` y `OTHER`, costos USA/China y fechas calculadas desde la base.
- Inventario principal: 25 filas con rutas USA, CHINA, origen vacío, origen no reconocido y SKU sin Maestro.
- Inventario secundario: una fila sin columna `Inv Proyectado` para congelar el fallback `Inv. Inicial + Compra - Ventas`.

## Reglas caracterizadas

- cálculo y porcentaje de merma;
- alerta de merma y límite estricto de `10%`;
- fallback de Inventario Proyectado cuando falta la columna;
- índice de rotación y Ventas en cero;
- Inventario de Seguridad IOCA USA/China y fallback del cliente;
- alerta de quiebre, igualdad con el piso y reposición solo para activos;
- origen USA/CHINA, fallback USA, origen no reconocido y costo aplicado;
- defaults y quiebre de SKU sin Maestro;
- fecha base, días EOL y desacoplamiento efectivo de `fechaCorte`;
- buckets EOL en todos los límites vigentes;
- fases F0-F3 en todos sus límites y marca sin configuración;
- descuentos y aportes IOCA/Retail unitarios y totales para USA F1 y China F3.

## Cantidad de pruebas

- Nuevas en Prompt 013: 40.
- Existentes de utilidades: 49.
- Total de la suite: 89.

## Reglas, fuentes y parámetros afectados

- Reglas de negocio: ninguna modificación; quedan caracterizados los aspectos del alcance contenidos en BR-006 a BR-015.
- Fuentes: ninguna modificación; se consumen `dataService` y su JSON vigente.
- Parámetros: ninguna modificación; se congelan los valores actuales dentro del dataset de prueba.
- Arquitectura de producción: ninguna modificación.

## Restricciones

- No extraer motores ni helpers a módulos de producción.
- No modificar `src/App.jsx`, JSX, fuentes, reglas o comportamiento visible.
- No agregar dependencias ni configuración innecesaria.
- No ejecutar `npm audit fix`.
- No crear commit, rama o push.
- No modificar configuración de Git.

## Riesgos

- El arnés temporal depende del orden actual de los ocho `useState` y del botón de cálculo.
- La suite ejecuta reglas reales, pero no renderiza DOM ni valida la experiencia visible.
- Un cambio institucional en `datos.json` puede romper expectativas aun cuando sea intencional; deberá actualizarse mediante un cambio funcional aprobado.
- Las fechas siguen usando semántica local de JavaScript, aunque el reloj esté fijado.

## Validaciones

- `npm test -- --run`.
- `npm run build`.
- `git diff --check`.
- `git status --short`.
- Confirmación de ausencia de cambios de producción atribuibles a Prompt 013.

## Estrategia de reversión

Eliminar el archivo de prueba y retirar únicamente las entradas documentales de Prompt 013. No se requiere reversión funcional porque no se modificaron archivos de producción, dependencias o configuración.

## Resultado esperado

- 40 pruebas nuevas y 89 pruebas totales aprobadas.
- Contratos actuales de Inventory Engine y EOL Engine listos para validar una extracción posterior.
- Build y diff-check exitosos.
- Evidencia completa en `logs/Prompt013-InventoryEOLCharacterization.log`.
