# Estado vigente de arquitectura

## Fase actual

Foundation 1.0 con reglas funcionales V2 implementadas. AP01 consolida la presentación local del Dashboard, amplía de forma aditiva sus DTO de unidades y presenta importes redondeados sin decimales mediante el formatter común, sin cambiar reglas, fórmulas, fuentes ni Configuration Center.

## Último prompt aprobado

AP01 — Revisión Dashboard.

## Última auditoría aprobada

Claude 004 — Portfolio Analysis Service, ejecutada el 2026-08-06. Verificó 154 pruebas y build aprobados; su hallazgo de congelamiento cruzado fue resuelto por Prompt 023.

## Servicios implementados

- `sellThroughApplicationService`: orquesta Repository, parsers, ensamblaje, Portfolio Analysis, Distribution Tier GOOD/BETTER/BEST/EOL y Pareto A/B/C.
- `PortfolioAnalysisService`: consolidación, tránsito, sin rotación, alertas, temporalidad agregada, KPIs, valorización y estructura final.
- `ExecutiveReportService`: Executive Summary con pares SKU/unidades/valores aplicables, valorización, KPIs, indicadores generales y resumen para Dashboard.
- Inventory Engine y EOL Engine: necesidad/reposición final, seguridad sobre proyectado, temporalidad, ciclo EOL y F4.
- Master Parser, Inventory Parser y Record Assembler: normalización y records procesados.
- `sellThroughRepository` y Local Provider: frontera síncrona vigente de fuentes.
- Configuration Center Foundation: PAR-001, PAR-002 y PAR-003 con schema como fuente única de IDs/keys.

## Servicios pendientes

- Extracción futura de las narrativas consultivas restantes de `App.jsx` y Recommendation Engine: pendientes de alcance específico.
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

Distribution y Pareto permanecen en Application Service. Executive Report consume el DTO de Portfolio Analysis; presentación, narrativas y exportaciones permanecen en `App.jsx` sin acceder directamente a fuentes físicas.

## Siguiente hito

Revisar AP01 localmente contra la base protegida antes de autorizar cualquier commit, push o despliegue; después, definir la auditoría independiente o el siguiente hito mediante alcance separado.

## Decisiones congeladas

- Preservar comportamiento, fórmulas, defaults, ordenamientos y contratos públicos durante refactorizaciones.
- `BUSINESS_PARAMETERS.md` es el catálogo oficial del Configuration Center.
- `CONFIGURATION_SCHEMA` es la fuente única de IDs, keys y metadatos migrados; defaults se declaran una sola vez.
- Repository/Provider son la frontera obligatoria de fuentes; Dataverse no tiene entidades ni campos aprobados.
- El procesamiento vigente es síncrono y local.
- Portfolio Analysis clona estructuras externas y congela únicamente objetos de su propia salida; las referencias originales del llamador nunca se congelan.
- Executive Report sólo consume el DTO de Portfolio Analysis y no accede a UI, Repository, Provider o fuentes físicas.
- Distribution y Pareto no pertenecen actualmente a Portfolio Analysis Service.
- Compra es Inventario en Tránsito y la reposición final la descuenta de la necesidad vigente.
- La seguridad usa Inventario Proyectado; Estado EOL fuerza nivel EOL y temporalidad VENCIDO.
- Pareto A/B/C usa unidades vendidas y cortes acumulados 80%/95%.
- F4 aplica después de 365 días con descuento 50% y umbral de 12 unidades.
- Executive Report, Recommendation Engine y Configuration Center UI requieren prompts separados.
- `sell-through-ap` permanece separado de NEXUS.

## Métricas actuales

- 160 elementos en el catálogo de parámetros: 82 configurables, 26 constantes técnicas, 38 reglas fijas, 12 textos UI y 2 valores derivados.
- Tres parámetros piloto visibles en Configuration Center MVP; todos permanecen no editables según el catálogo aprobado.
- MVP de presentación listo para demo: Dashboard ejecutivo, exportaciones Excel/PDF y metadata/favicons de producción.
- Once archivos de pruebas automatizadas.

## Cantidad de pruebas

190/190 aprobadas.

## Estado del build

Aprobado con Vite 5.4.21 y 1518 módulos transformados. Última validación: AP01, 2026-08-10.
