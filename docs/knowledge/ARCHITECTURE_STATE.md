# Estado vigente de arquitectura

## Fase actual

Foundation 1.0, Refactorización Fase 9 completada para Executive Report MVP. Portfolio Analysis fue endurecido por Prompt 023 y Prompt 022.5 optimizó el flujo documental de IA.

## Último prompt aprobado

Prompt 029 — Corrección final de impresión PDF. El informe ejecutivo se imprime aislado del shell.

## Última auditoría aprobada

Claude 004 — Portfolio Analysis Service, ejecutada el 2026-08-06. Verificó 154 pruebas y build aprobados; su hallazgo de congelamiento cruzado fue resuelto por Prompt 023.

## Servicios implementados

- `sellThroughApplicationService`: orquesta Repository, parsers, ensamblaje, Portfolio Analysis, Distribution y Pareto.
- `PortfolioAnalysisService`: consolidación, alertas, agregados, métricas, snapshot y estructura final.
- `ExecutiveReportService`: Executive Summary, KPIs, totales, indicadores generales y resumen para Dashboard desde el DTO de Portfolio Analysis.
- Inventory Engine y EOL Engine: reglas puras de inventario, reposición y ciclo EOL.
- Master Parser, Inventory Parser y Record Assembler: normalización y records procesados.
- `sellThroughRepository` y Local Provider: frontera síncrona vigente de fuentes.
- Configuration Center Foundation: PAR-001, PAR-002 y PAR-003 con schema como fuente única de IDs/keys.

## Servicios pendientes

- Executive Report completo, integración visual y Recommendation Engine: pendientes de alcance específico.
- Extracción futura de Distribution y Pareto: pendiente de prompt independiente.
- DataverseProvider, persistencia, autenticación y asincronía: no implementados.
- Configuration Center completo: pendiente migrar parámetros adicionales; el MVP visual y local está habilitado solo para el schema actual.

## Arquitectura vigente

```text
UI (App.jsx)
  -> Application Service
    -> Domain: Parsers / Record Assembler / Inventory / EOL / Portfolio / Executive Report
    -> Repository
      -> Local Provider
        -> fuentes locales y datos de sesión

Configuration Schema -> Configuration Service -> Repository
```

Distribution y Pareto permanecen en Application Service. Executive Report MVP se genera desde el DTO de Portfolio Analysis; su integración visual y exportaciones permanecen en `App.jsx`. React no accede directamente a fuentes físicas.

## Siguiente hito

Definir persistencia remota y migración controlada de parámetros adicionales; Recommendation Engine permanece pendiente.

## Decisiones congeladas

- Preservar comportamiento, fórmulas, defaults, ordenamientos y contratos públicos durante refactorizaciones.
- `BUSINESS_PARAMETERS.md` es el catálogo oficial del Configuration Center.
- `CONFIGURATION_SCHEMA` es la fuente única de IDs, keys y metadatos migrados; defaults se declaran una sola vez.
- Repository/Provider son la frontera obligatoria de fuentes; Dataverse no tiene entidades ni campos aprobados.
- El procesamiento vigente es síncrono y local.
- Portfolio Analysis clona estructuras externas y congela únicamente objetos de su propia salida; las referencias originales del llamador nunca se congelan.
- Executive Report sólo consume el DTO de Portfolio Analysis y no accede a UI, Repository, Provider o fuentes físicas.
- Distribution y Pareto no pertenecen actualmente a Portfolio Analysis Service.
- Executive Report, Recommendation Engine y Configuration Center UI requieren prompts separados.
- `sell-through-ap` permanece separado de NEXUS.

## Métricas actuales

- 160 elementos en el catálogo de parámetros: 82 configurables, 26 constantes técnicas, 38 reglas fijas, 12 textos UI y 2 valores derivados.
- Tres parámetros piloto visibles en Configuration Center MVP; todos permanecen no editables según el catálogo aprobado.
- MVP de presentación listo para demo: Dashboard ejecutivo, exportaciones Excel/PDF y metadata/favicons de producción.
- Ocho archivos de pruebas automatizadas.

## Cantidad de pruebas

161/161 aprobadas.

## Estado del build

Aprobado con Vite 5.4.21 y 1518 módulos transformados. Última validación: Prompt 029, 2026-08-06.
