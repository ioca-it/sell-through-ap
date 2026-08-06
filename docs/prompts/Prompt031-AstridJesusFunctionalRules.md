# Prompt 031 — Reglas funcionales Astrid–Jesús

## Objetivo aprobado

Implementar los acuerdos funcionales confirmados de la reunión Astrid–Jesús sin cambiar Repository, Provider, Configuration Center, fuentes ni dependencias, y preservando la arquitectura `UI -> Application Service -> Domain -> Repository -> Provider`.

## Alcance ejecutable

- Reclasificar todo Estado EOL a nivel EOL antes de distribuciones y reportes.
- Descontar Compra de la necesidad vigente para producir la reposición final, con piso cero y bloqueos EOL/Sin Maestro.
- Comparar Inventario Proyectado contra Inventario de Seguridad IOCA y conservar proyectados negativos.
- Consolidar y presentar Inventario en Tránsito sin valorización.
- Definir sin rotación por Ventas igual a cero.
- Clasificar temporalidad con prioridad EOL y límites -1, 0, 31 y 32 días.
- Incorporar EOL F4 para más de 365 días, descuento 50%, umbral 12 y absorción exclusiva Retail bajo el umbral.
- Extender Tier a GOOD/BETTER/BEST/EOL y reservar Sin Categoría a SKU sin Maestro.
- Extender Pareto técnico a A/B/C por unidades y vista ejecutiva Pocos Vitales/Cola Larga.
- Presentar pares SKU/unidades, valorización completa y formatos sin decimales salvo moneda.
- Retirar `(20%)` y `(80%)` solo de etiquetas de aportes.

## Decisiones de implementación

- La necesidad base conserva la fórmula vigente contra Inventario Final; Compra se descuenta después.
- La alerta de seguridad usa Inventario Proyectado, pero no altera la necesidad base aprobada.
- Pareto usa cortes acumulados A `<80%`, B `<95%` y C para el resto, siempre sobre unidades vendidas.
- La fecha de procesamiento conserva `primerDiaMes()` como fecha base vigente del caso de uso.
- F4 obtiene los aportes de la última fase configurada de marca/origen; bajo 12 unidades aplica IOCA 0% / Retail 100%. No se agregan filas a `datos.json` ni parámetros al Configuration Center.
- Una categoría vacía de un SKU con Maestro se presenta como `—`; `SIN CATEGORIA` se reserva al SKU sin Maestro.

## Archivos de producción previstos

- `src/domain/inventory/inventoryEngine.js`
- `src/domain/eol/eolEngine.js`
- `src/domain/parser/masterParser.js`
- `src/domain/parser/recordAssembler.js`
- `src/domain/portfolio/PortfolioAnalysisService.js`
- `src/domain/report/ExecutiveReportService.js`
- `src/application/sellThroughApplicationService.js`
- `src/utils/formatters.js`
- `src/App.jsx`

Repository, Provider, Configuration Center y `src/data/datos.json` quedan fuera del cambio.

## Pruebas y aceptación

Agregar cobertura para reposición/tránsito, seguridad proyectada, temporalidad, F4, Pareto, Mix, KPIs, valorización y formato, preservando todas las pruebas existentes.

El hito solo puede cerrarse si aprueban:

```text
npm test -- --run
npm run build
git diff --check
```

## Riesgos controlados

- Diferenciar Estado EOL, temporalidad y segmento EOL futuro sin mezclar sus propósitos.
- Evitar doble descuento de Compra al conservar la necesidad base contra Inventario Final.
- Mantener el total de distribución y la ecuación financiera completos.
- No convertir F4, cortes Pareto o etiquetas en configuración editable sin prompt posterior.
- Excluir el cambio preexistente de `.gitignore` del commit.

## Reversión

Revertir el commit de Prompt 031. No existe migración de datos, cambio de fuente ni persistencia que requiera reversión adicional.
