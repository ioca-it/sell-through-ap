# Reglas de negocio implementadas

Este catálogo describe el comportamiento observable actual. No convierte recomendaciones del informe en políticas externas ni aprueba cambios futuros.

## Ingesta y normalización

### BR-001 — Entradas obligatorias

- Deben existir texto de Maestro e Inventario.
- El Maestro requiere una columna reconocible como `SKU`.
- El Inventario requiere `SKU` e `Inv Final` o equivalentes reconocidos.

### BR-002 — Separadores y encabezados

- Cada fila se divide por tabulador, coma o punto y coma.
- Los encabezados se convierten a minúsculas, pierden tildes, espacios y caracteres no alfanuméricos.
- La búsqueda de columnas intenta primero coincidencia exacta y luego coincidencia parcial.

### BR-003 — Maestro de Productos

- `EOL` y `DESCONTINUADO` se normalizan a estado `EOL`; cualquier otro valor se normaliza a `ACTIVO`.
- La fecha solo se interpreta para productos `EOL`.
- Fechas aceptadas: `d/m/aaaa`, `d-m-aaaa` y `aaaa-m-d`.
- Categoría vacía se convierte en `SIN CATEGORIA`.
- Los costos eliminan `$` y comas antes de convertirse a número; un valor inválido queda en cero.

### BR-004 — Inventario del Cliente

- Los valores enteros eliminan caracteres distintos de dígitos y signo menos; un valor inválido queda en cero.
- Si falta Inventario Proyectado: `Inv. Inicial + Compra - Ventas`.
- Si falta Tier, el registro conserva Tier vacío; para las distribuciones un Tier desconocido o vacío se agrupa como `GOOD`.

### BR-005 — SKU sin maestro

- Se conserva como `SIN MAESTRO`, con categoría `SIN CATEGORIA`, costo y valores financieros en cero.
- Su Inventario de Seguridad IOCA se iguala al informado por el cliente.
- No obtiene reposición sugerida automática.
- Si queda bajo el inventario de seguridad del cliente, la acción es agregarlo al maestro y decidir.

## Origen y costo

### BR-006 — Procedencia del origen

- El origen se toma del Inventario del Cliente, no del Maestro.
- Solo `CHINA` selecciona origen China; cualquier otro valor se trata como `USA`.
- Un origen vacío se marca como alerta y usa USA por defecto.
- El costo aplicado es el costo China o USA del Maestro según el origen resultante.

## EOL, buckets y fases

### BR-007 — Fecha base del cálculo EOL

`días de descontinuación = primer día del mes actual - fecha EOL`.

La implementación usa la fecha del navegador mediante `primerDiaMes()`. El parámetro `fechaCorte` no interviene actualmente en este cálculo.

### BR-008 — Buckets EOL

- Fecha vencida o actual: `EOL Vencido`.
- De 1 a 27 días para EOL: `EOL Crítico`.
- De 28 a 83 días para EOL: `EOL Próximo`.
- Desde 84 días para EOL: `EOL Planificado`; el código también deja en este bucket valores superiores a 360 días.

La estrategia, descuento base textual y prioridad de cada bucket están en `src/data/datos.json`.

### BR-009 — Fases post-EOL

- Las fases solo se buscan cuando la fecha EOL ya venció.
- Antes de 90 días transcurridos no hay fase activa.
- Se selecciona la mayor fase cuyo `diasMin` sea menor o igual a los días transcurridos.
- La tabla actual contiene únicamente marca `SKULLCANDY` y orígenes `USA`/`CHINA`.
- Umbrales actuales: F0 desde 90 días, F1 desde 120, F2 desde 150 y F3 desde 240.
- Si no existe combinación de marca y origen, no se aplica fase ni descuento.

### BR-010 — Descuento y aportes

- `descuento por unidad = costo aplicado × porcentaje de descuento al consumidor`.
- `aporte IOCA por unidad = descuento por unidad × porcentaje IOCA`.
- `aporte Retail por unidad = descuento por unidad × porcentaje Retail`.
- Los totales multiplican cada valor unitario por Inventario Final.
- Los porcentajes exactos dependen de fase y origen y se leen de `tablaFases`.

## Inventario, merma, rotación y reposición

### BR-011 — Inventario de Seguridad IOCA V1

Cuando Ventas es mayor que cero:

```text
ceil((Ventas / Semanas del período) × (Safety Stock en semanas + Lead Time del origen))
```

- Lead Time usa el parámetro USA o China según el origen.
- Cuando Ventas es cero, se conserva el Inventario de Seguridad del cliente.
- La fuente registrada es `IOCA` al aplicar la fórmula y `Cliente` al usar el valor informado.
- Un período personalizado inválido o no positivo cae en `4.33` semanas; un período no reconocido también cae en `4.33`.

### BR-012 — Reposición y quiebre

- `reposición sugerida = max(0, Inv. Seguridad IOCA - Inv. Final)` únicamente para productos `ACTIVO`.
- La alerta de quiebre ocurre si el Inventario de Seguridad IOCA es mayor que cero y el Inventario Final es menor.
- Un activo en quiebre recomienda reponer la diferencia.
- Un EOL en quiebre no genera reposición: la acción depende del bucket (`rebalanceo`, aceptar quiebre, liquidar o dejar morir).

### BR-013 — Merma

- `merma = Inv. Proyectado - Inv. Final`.
- `merma % = merma / Inv. Inicial` cuando Inv. Inicial es mayor que cero; en otro caso es cero.
- La alerta exige Inv. Inicial mayor que cero y merma estrictamente superior al umbral actual de `10%`.

### BR-014 — Índice de rotación

- `índice de rotación = Inv. Inicial / Ventas`.
- Si Ventas es cero, el índice es `null`.
- Interpretación visual actual: menor que 1, alta; de 1 a 3, normal; mayor que 3 y hasta 10, lenta; mayor que 10, muy lenta.
- El informe considera sobreinventario activo cuando el índice es mayor que 5.

### BR-015 — Valores financieros

- Valor de inventario: costo aplicado por Inventario Final.
- Valor de ventas: costo aplicado por Ventas.
- Valor de reposición: costo aplicado por Reposición Sugerida.

## Análisis de portafolio

Desde Prompt 022, `PortfolioAnalysisService` concentra sin cambiar reglas las clasificaciones de records, agregados EOL y reposición, alertas, métricas generales, snapshot de configuración y estructura final de `resultados`. Recibe records ya ensamblados y dependencias explícitas, y devuelve estructuras inmutables.

Se conservan exactamente los filtros y ordenamientos vigentes: EOL vencidos por días descendentes y luego descuento unitario; EOL futuros por días descendentes; activos por valor de inventario descendente; y `SIN MAESTRO` en su orden de entrada. Los totales y alertas utilizan los mismos campos y operaciones aritméticas caracterizados antes de la extracción.

Distribution y Pareto no forman parte de este Business Service. Application Service mantiene sus cálculos y entrega sus resultados al contrato final. Executive Report, Recommendation Engine y exportaciones tampoco se trasladan.

## Distribuciones y Pareto

### BR-016 — Distribución por Tier y categoría

- Se calculan unidades, valor, cantidad de SKU y porcentajes sobre registros con unidades mayores que cero.
- Se generan vistas para Inventario Final, Ventas y Reposición Sugerida.
- Las categorías nacen dinámicamente del Maestro; los faltantes se agrupan en `SIN CATEGORIA`.

### BR-017 — Pareto 80/20

- Solo participan registros con Ventas mayores que cero.
- Se ordenan de mayor a menor por unidades vendidas.
- Un SKU es clase A si el acumulado anterior a incluirlo aún era menor que `80%`; el resto es B.
- Interpretación por proporción de SKU A: hasta 20% es concentración clásica; más de 20% y hasta 35% es mix balanceado; más de 35% es distribución plana.

## Reglas del informe ejecutivo

### BR-018 — Diagnósticos automáticos

El informe aplica, entre otras, estas condiciones implementadas:

- sin movimiento: Ventas igual a cero e Inventario Final mayor que cero;
- subinventario activo: Inventario Final menor que Inventario de Seguridad IOCA;
- obsolescencia: EOL vencido con Inventario Final mayor que cero;
- activación requerida: activo Tier `BEST`, con inventario y Ventas menores o iguales a 1;
- categoría en obsolescencia: al menos `75%` de sus SKU en piso son EOL;
- desalineación fuerte: diferencia absoluta de al menos 10 puntos porcentuales entre participación de reposición y ventas;
- hallazgo de alto valor EOL: más de `20%` del valor total;
- hallazgo de inventario sin movimiento: más de `10%` del valor total;
- el SKU héroe es el primer SKU del Pareto, es decir, el de mayor venta entre los que tienen ventas.

Las recomendaciones narrativas se generan con reglas fijas en `App.jsx`; no son datos recibidos de una IA ni de un servicio externo.

## Salidas

### BR-019 — CSV

Genera un archivo local con detalle general de EOL, inventario, rotación, descuentos y aportes.

### BR-020 — Excel

Genera un libro local con resumen, hojas condicionales de alertas y segmentos, datos completos, distribuciones, Pareto y referencias EOL/fases.

### BR-021 — Informe imprimible

El informe ejecutivo usa `window.print()` y estilos de impresión del navegador. No se genera un PDF mediante un servicio del proyecto.

## Baseline automatizada de reglas

Prompt 013 caracteriza sin modificar producción los aspectos del alcance contenidos en BR-006 a BR-015 para Inventory Engine y EOL Engine. La suite congela:

- merma, porcentaje y umbral estricto superior a `10%`;
- índice de rotación y `null` cuando Ventas es cero;
- fórmula IOCA con período Mensual `4.33`, safety stock `4` y lead times USA `4`/China `12`;
- fallback al valor del cliente cuando Ventas es cero;
- quiebre, reposición exclusiva de activos y acción EOL;
- selección USA/CHINA, fallback USA, costo por origen y defaults sin Maestro;
- primer día del mes como fecha base, independientemente de `fechaCorte`;
- límites de buckets en 27/28, 83/84 y 360/361 días futuros;
- límites de fases en 89/90, 119/120, 149/150 y 239/240 días transcurridos;
- descuentos y aportes unitarios/totales USA F1 y China F3, además del caso sin fase.

Las pruebas son una baseline de lo implementado; no aprueban reglas nuevas ni sustituyen este catálogo.

## Ubicación de reglas después de Prompt 014

La extracción cambia ubicación, no contenido funcional:

| Reglas protegidas | Módulo/contrato actual |
| --- | --- |
| Período, proyectado, merma y rotación | `inventoryEngine.js`: `obtenerSemanasPeriodo`, `calcularInventarioProyectado`, `calcularMerma`, `calcularIndiceRotacion`. |
| Origen y costo | `inventoryEngine.js`: `seleccionarOrigen`, `seleccionarCostoPorOrigen`. |
| Seguridad IOCA, quiebre y reposición | `inventoryEngine.js`: `calcularInventarioSeguridadIOCA`, `calcularQuiebreYReposicion`, `obtenerAccionQuiebreActivo`. |
| Días, bucket y fase EOL | `eolEngine.js`: `calcularDiasEOL`, `seleccionarBucketEOL`, `seleccionarFaseEOL`. |
| Descuentos, aportes y acciones EOL | `eolEngine.js`: `calcularDescuentoYAportes`, `obtenerAccionQuiebreEOL`. |

Después de Prompt 014, `App.jsx` conservaba parsing, fecha base, lectura de configuración y orquestación. Prompt 016 trasladó parsing, fecha base del caso de uso, ensamblaje y agregaciones al Application Service y a `src/domain/parser/`. Prompt 022 mueve consolidación, alertas, totales, snapshot y estructura final a `PortfolioAnalysisService`; Distribution y Pareto permanecen en Application Service. Las reglas y motores siguen recibiendo tablas y parámetros explícitos sin leer fuentes directamente.

## Baseline automatizada de parsing y ensamblaje

Prompt 015 caracteriza desde el flujo real de `App` los contratos que alimentan estas reglas, sin duplicar fórmulas de dominio:

- delimitadores tab, coma y punto y coma, sin soporte de quoted CSV;
- normalización de encabezados y prioridad de coincidencias exactas sobre parciales;
- último registro del Maestro para SKU duplicado y conservación de todas las filas duplicadas del Inventario;
- omisión de filas con SKU vacío;
- precedencia de modelo, marca, estado, categoría y costos del Maestro, con nombre del Inventario como fallback del modelo;
- defaults de columnas opcionales, columna de Inventario Proyectado ausente frente a celda vacía y registros `SIN MAESTRO`;
- forma y valores base del objeto `record` consumido por dashboard, motores y exportaciones.

La coincidencia parcial opera sobre subcadenas. Si falta una coincidencia exacta, un encabezado no previsto puede contener antes un alias; por ejemplo, `STATUS ACTUAL` normalizado contiene `usa` y puede capturarse como costo USA antes de `EXW MIA USD`. Esta observación es un riesgo congelado, no una regla nueva ni una corrección aprobada.

## Ubicación de contratos después de Prompt 016

| Contrato protegido | Ubicación actual |
| --- | --- |
| BR-001 a BR-003, parsing del Maestro | `masterParser.js` y validación inicial del Application Service. |
| BR-001, BR-002 y BR-004, parsing del Inventario | `inventoryParser.js` y validación inicial del Application Service. |
| BR-005 a BR-015, precedencias y forma de `record` | `recordAssembler.js`, que consume Inventory/EOL Engine. |
| Consolidación, clasificaciones, alertas, totales, snapshot y estructura final de `resultados` | `PortfolioAnalysisService.js`. |
| Distribution por Tier/categoría y Pareto | `sellThroughApplicationService.js`. |
| Presentación, estado, navegación, informe y exportaciones | `App.jsx`. |

La extracción cambia ubicación y contratos internos, no aliases, fórmulas, defaults, errores, ordenamientos, textos o resultados observables.

## Relación con el catálogo de parámetros

Prompt 019 creó `docs/knowledge/BUSINESS_PARAMETERS.md` como fuente oficial del futuro Configuration Center. Ese catálogo vincula valores de JSON, estado React y hardcodes con BR-001 a BR-021, pero no convierte fórmulas, operadores, precedencias, textos ni valores derivados en parámetros editables por defecto.

La creación del catálogo no cambia ninguna regla. En particular, siguen vigentes los límites hardcoded del selector de buckets, el gate de fase de 90 días, el fallback de 4.33 semanas, la fecha base del navegador y los umbrales narrativos de `App.jsx` hasta que exista una decisión funcional específica y pruebas de regresión.
