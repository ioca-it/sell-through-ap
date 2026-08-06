# Prompt 022 — Portfolio Analysis Service

## Objetivo

Extraer la lógica de análisis de portafolio desde `sellThroughApplicationService.js` hacia un Business Service de dominio independiente, sin modificar reglas, fórmulas, resultados ni contratos públicos.

## Nuevo Business Service

`src/domain/portfolio/PortfolioAnalysisService.js` recibe records ya procesados por Parser, Record Assembler, Inventory Engine y EOL Engine. No accede a React, UI, Repository, Provider, `datos.json` o una fuente física.

Su posición en el flujo es:

```text
Application Service
  -> Parsers / Record Assembler
  -> PortfolioAnalysisService.consolidateRecords
  -> Distribution y Pareto en Application Service
  -> PortfolioAnalysisService.analyzePortfolio
  -> { resultados, error }
```

## Responsabilidades extraídas

- clasificación y ordenamiento de EOL vencidos, EOL futuros, activos y SKU sin Maestro;
- consolidación de records procesados;
- agregados de unidades, valor, descuentos y aportes EOL;
- alertas de origen, merma y quiebre;
- indicadores de reposición;
- métricas generales y conteos del portafolio;
- semanas usadas y snapshot de configuración;
- composición de la estructura final consumida por el sistema;
- inmutabilidad profunda de la consolidación y del resultado final.

## Contratos creados

### `PortfolioAnalysisService.consolidateRecords(records)`

Entrada: arreglo de records ya ensamblados.

Salida inmutable:

- `recs`;
- `eolVencidos`;
- `eolFuturos`;
- `activos`;
- `sinMaestro`.

Conserva los filtros y desempates vigentes sin añadir validaciones, reglas o defaults.

### `PortfolioAnalysisService.analyzePortfolio(input)`

Entrada: consolidación previa, fecha de cálculo, configuración validada, umbral de merma, tabla de semanas y resultados ya calculados de Distribution y Pareto.

Salida: el mismo objeto público `resultados`, ahora profundamente inmutable, con records clasificados, distribuciones, Pareto, semanas usadas, snapshot, alertas y totales.

## Responsabilidades que permanecen fuera

- Distribution por Tier y categoría permanece en Application Service.
- Pareto permanece en Application Service.
- Executive Report permanece en `App.jsx`.
- Exportaciones permanecen en `App.jsx`.
- Recommendation Engine no se crea ni se incorpora.

## Dependencias y arquitectura AI-First

El servicio depende únicamente de `obtenerSemanasPeriodo`, función pura del Inventory Engine. Todas las demás entradas son explícitas. Los dos contratos deterministas permiten que una IA inspeccione consolidación y análisis sin navegar UI o fuentes, y preparan una futura integración con Executive Report y Recommendation Engine como consumidores separados.

La futura integración no autoriza mover sus reglas dentro del servicio ni asumir contratos, parámetros o fuentes todavía no aprobados.

## Compatibilidad funcional

- `processSellThrough(repository)` conserva firma y retorno `{ resultados, error }`.
- Repository, Provider y Configuration Center permanecen intactos.
- No cambian Parser, Inventory Engine, EOL Engine, reglas, fórmulas, defaults, parámetros, ordenamientos o errores.
- No se modifica App, JSX o navegación.
- No se agregan dependencias, asincronía, persistencia o acceso a fuentes.

## Pruebas y validaciones

La suite existente caracteriza el pipeline real y compara los mismos resultados del Application Service después de la extracción.

- `npm test -- --run`: 154/154 pruebas aprobadas en ocho archivos.
- `npm run build`: aprobado.
- `git diff --check`: aprobado, sin errores de whitespace.

No se agregan pruebas para conservar exactamente el total solicitado de 154.

## Riesgos

- La inmutabilidad profunda impedirá mutaciones accidentales del resultado; los consumidores actuales son de lectura y la suite completa confirma compatibilidad observable.
- Distribution y Pareto continúan temporalmente dentro de Application Service por restricción expresa, por lo que su extracción futura requiere otro alcance aprobado.
- Executive Report y Recommendation Engine aún no tienen un contrato de consumo dedicado.

## Estrategia de reversión

Restaurar en Application Service los bloques de consolidación, alertas, totales, semanas y composición final, retirar el import y eliminar `PortfolioAnalysisService.js`. No existen datos persistidos, dependencias o migraciones remotas que recuperar.

## Posición dentro del roadmap

Portfolio Analysis Service es un avance técnico de Foundation 1.0 en arquitectura modular y separación de responsabilidades. No crea capacidad funcional nueva ni declara completado un hito AP adicional.

## Recomendación siguiente

Caracterizar explícitamente los consumidores de la estructura final antes de separar Executive Report o Recommendation Engine, manteniendo Distribution y Pareto fuera de alcance hasta un prompt independiente.
