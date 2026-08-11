# Especificación funcional de negocio V2

## Propósito y vigencia

Esta especificación consolida los acuerdos funcionales Astrid–Jesús implementados por Prompt 031. Complementa `BUSINESS_RULES.md` y prevalece sobre la baseline V1 únicamente en las reglas descritas aquí.

## Entradas y precedencias

- `Estado` y Fecha de Descontinuación proceden del Maestro.
- `Tier`, `Compra`, Ventas e inventarios proceden del Inventario del Cliente.
- `Compra` es Inventario en Tránsito; ausencia, celda vacía o valor nulo equivale a `0`.
- Origen China usa costo China. USA, otros y vacío conservan el fallback USA vigente.
- Un SKU sin correspondencia en Maestro conserva costo y valorización en cero.

## Clasificación operativa y temporal

### Nivel operativo

1. Si Estado es EOL, Nivel es `EOL` sin importar el Tier informado.
2. Si existe en Maestro y no es EOL, se conserva GOOD/BETTER/BEST; un valor vacío o desconocido usa el fallback GOOD vigente.
3. `SIN CATEGORIA` se reserva a SKU sin Maestro. Una categoría vacía en Maestro se presenta como `—`.

### Temporalidad

`Días restantes = Fecha Descontinuación - Fecha de Procesamiento`.

| Condición | Clasificación |
| --- | --- |
| Estado EOL | VENCIDO |
| No EOL con fecha vacía o inválida | ACTIVO |
| No EOL con días restantes > 31 | ACTIVO / no por vencer |
| No EOL con días restantes entre 0 y 31 inclusive | POR VENCER |
| No EOL con días restantes < 0 | VENCIDO |

La fecha de procesamiento conserva la fecha base mensual que el caso de uso ya exponía como `fechaCalculo`.

## Inventario, seguridad, reposición y tránsito

El Inventario Proyectado conserva el valor informado, incluso si es negativo. Si falta toda la columna, mantiene el fallback vigente `Inv. Inicial + Compra - Ventas`.

Un producto está bajo nivel de seguridad cuando:

```text
Inventario Proyectado < Inventario de Seguridad IOCA
```

La reposición se calcula en dos pasos:

```text
NecesidadReposicion = max(0, Inventario Seguridad IOCA - Inventario Final)
ReposicionFinal = max(0, NecesidadReposicion - Compra)
```

EOL y SKU sin Maestro siempre tienen `ReposicionFinal = 0`.

El Dashboard lista todos los SKU con `Compra > 0`, agregados por SKU, con unidades en tránsito y total general. No muestra valor monetario e incluye EOL.

## Rotación y EOL Fase 4

- Sin rotación significa exclusivamente `Ventas = 0`.
- F4 aplica con más de 365 días desde descontinuación.
- F4 usa descuento consumidor `15%` e inventario mínimo reconocido de 12 unidades.
- Con Inventario Final menor que 12, IOCA aporta `0%` y Retail `100%`.
- Con 12 o más unidades, F4 conserva los porcentajes de aporte de la última fase configurada para la marca/origen; si no existe combinación previa, no se inventa un reparto.
- F4 nunca genera reposición.

## Distribución y Pareto

El Mix Balanceado presenta GOOD, BETTER, BEST y EOL en ese orden. Los SKU sin Maestro pueden aparecer como `SIN CATEGORIA`; el total conserva todas las unidades positivas y las participaciones internas suman `100%`.

Pareto se calcula por unidades vendidas y orden descendente:

- A: acumulado anterior menor que `80%`.
- B: acumulado anterior desde `80%` y menor que `95%`.
- C: acumulado anterior desde `95%`.

La vista técnica presenta A/B/C. La vista ejecutiva presenta A como Pocos Vitales y B/C como Cola Larga. Cantidades de SKU y porcentajes son resultados calculados, no etiquetas fijas.

## KPIs y valorización

| KPI de SKU | Homólogo debajo |
| --- | --- |
| Total SKU | Total Unidades |
| SKU Activos | Total Unidades Activas |
| SKU Vencidos | Total Unidades Vencidas |
| SKU por Vencer | Total Unidades por Vencer |
| SKU Maestro | Total Unidades Maestro |

`Total Unidades Maestro` suma Inventario Final de registros con correspondencia en Maestro.

La valorización cumple:

```text
Valor Total Inventario =
  Valor Activo +
  Valor EOL +
  Valor EOL Futuro +
  Valor Sin Maestro
```

Dashboard Ejecutivo, Informe Ejecutivo y resumen Excel muestran total y desglose.

## Presentación y exportación

- Unidades, cantidades, porcentajes y KPI se muestran sin decimales.
- Los importes mantienen dos decimales y símbolo/formato monetario.
- Las etiquetas `Absorbe IOCA` y `Absorbe Retail` omiten `(20%)` y `(80%)`; las fórmulas y porcentajes de aporte no cambian salvo la excepción F4 menor a 12.
- Excel refleja temporalidad, necesidad, Compra, reposición final, Tier EOL, Pareto A/B/C, KPIs y valorización.

## Arquitectura y fuentes

Las reglas se calculan en Inventory Engine, EOL Engine, Record Assembler, Portfolio Analysis, Executive Report y Application Service. `App.jsx` presenta los DTOs y mantiene las exportaciones. Repository, Provider, Configuration Center, `datos.json` y fuentes físicas no cambian.

## Validación y reversión

- Cobertura: `src/__tests__/astridJesusFunctionalRules.test.js` y caracterizaciones existentes.
- Validación obligatoria: `npm test -- --run`, `npm run build`, `git diff --check`.
- Reversión: revertir el commit de Prompt 031 restaura en bloque código, pruebas y documentación; el log local permanece fuera de Git.
