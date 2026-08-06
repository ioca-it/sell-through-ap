# Roadmap aprobado

## Hito Prompt 031 — Reglas funcionales Astrid–Jesús

Se implementan como alcance aprobado Inventario en Tránsito, reposición descontando Compra, EOL F4, Mix GOOD/BETTER/BEST/EOL, Pareto A/B/C, temporalidad, KPIs de unidades y valorización completa. Repository, Provider, Configuration Center y fuentes permanecen sin cambios.

Estado funcional después del hito:

- AP-1.2 Inventario en Tránsito: implementado en DTO y Dashboard sin valorización.
- AP-1.3 Reposición Inteligente: implementada la deducción de Compra y los bloqueos EOL/Sin Maestro.
- AP-1.5 Pareto y Tier: implementado Pareto A/B/C por unidades y EOL como cuarta categoría.
- AP-1.6 Motor EOL Fase 4: implementado para más de 365 días.
- KPIs, temporalidad y valorización V2: implementados en Dashboard/Informe y exportación Excel.

## Hito Prompt 028 — MVP Final

La versión de presentación ejecutiva queda lista para demo con Dashboard ejecutivo basado en DTOs, Configuration Center MVP, exportación Excel/PDF, navegación responsive, estados UX y metadata/favicón para despliegue. No se altera la arquitectura ni se migran parámetros adicionales.

Este documento consolida únicamente las líneas ya registradas en `docs/ROADMAP.md`. La documentación existente no asigna estado individual de completado a cada ítem; por lo tanto, aquí no se infiere uno.

## Línea Foundation 1.0

- Arquitectura modular.
- Registro de fuentes.
- Configuration Center.
- Repositorios y proveedores.
- Catálogo de parámetros.
- Catálogo de reglas.
- Trazabilidad.
- Documentación AI-First.

## Roadmap funcional registrado

1. AP-1.0: base actual.
2. AP-1.1: Dashboard Ejecutivo.
3. AP-1.2: Inventario en Tránsito.
4. AP-1.3: Reposición Inteligente.
5. AP-1.4: Maestro de Productos.
6. AP-1.5: Pareto y Tier.
7. AP-1.6: Motor EOL Fase 4.
8. AP-1.7: Dashboard Operativo.

## Lectura del estado actual

- El código V1 ya contiene dashboard, informe ejecutivo, reposición sugerida, Maestro de Productos, Pareto, Tier y motor EOL hasta F3.
- No se observa una capacidad separada de Inventario en Tránsito.
- No se observa Fase 4 en la tabla de fases actual.
- Application Service y Domain Service están implementados parcialmente; desde Prompt 022 existe Portfolio Analysis y desde Prompt 024 Executive Report MVP como Business Services separados. Repository y Local Provider tienen una primera versión síncrona; Configuration Center posee una foundation limitada a tres pilotos y DataverseProvider no está implementado.

### Posición de Portfolio Analysis Service

El servicio pertenece a Foundation 1.0 como avance de arquitectura modular y separación de Domain/Application. Su contrato síncrono e inmutable prepara consumidores futuros como Executive Report y Recommendation Engine, pero no declara entregados nuevos hitos funcionales ni mueve las reglas actuales de Distribution, Pareto o exportaciones.

### Optimización del flujo de IA

Prompt 022.5 establece `INDEX.md` como índice documental único y `ARCHITECTURE_STATE.md` como resumen vigente por hito. El contexto fijo deja de incluir toda la Knowledge Base y todo el historial: cada IA usa estado, roadmap y únicamente el prompt, log y archivos relacionados.

### Executive Report MVP

Prompt 024 crea un Business Service de presentación que consume exclusivamente el DTO de Portfolio Analysis y construye Executive Summary, KPIs, totales, indicadores generales y resumen para Dashboard. No modifica App.jsx ni presenta el DTO en UI; no crea hallazgos, recomendaciones, exportaciones, Pareto o Distribution.

### Siguiente hito técnico

Integrar el DTO `executiveReport` en Dashboard mediante un prompt aprobado; después definir Recommendation Engine sin asumir reglas o fuentes nuevas.

La presencia parcial de nombres del roadmap en el código no equivale a declarar entregado un hito. Solo un acuerdo o prompt aprobado puede cambiar su estado formal.

## Restricciones para avanzar

- No inventar alcance funcional para ningún hito.
- Definir criterios de aceptación antes de implementar.
- Identificar reglas, fuentes y parámetros afectados.
- Mantener compatibilidad con el comportamiento actual salvo cambio funcional aprobado.
- Actualizar este documento, `DECISIONS.md`, `CHANGELOG.md` y el prompt correspondiente cuando cambie el roadmap.
