# Roadmap aprobado

## Hito Astrid 2026-08-11 — Cambios confirmados de Dashboard

Implementado sin ampliar fuentes ni infraestructura:

- Sin ventas sustituye únicamente la presentación Por Vencer en Dashboard y Resumen Ejecutivo, usando la clasificación existente `Ventas = 0`.
- Resumen Dashboard y alertas/tablas de bajo inventario muestran solo quiebres ACTIVO.
- Pareto conserva su cálculo y presenta Vitales/Complementarios con A verde, B azul y C rojo.
- Reposición Sugerida totaliza SKU incluidos y unidades ya calculadas; Inventario en Tránsito agrega valor por SKU y total con el costo aplicado vigente.
- Maestro Producto incorpora `creationDate`; Producto Nuevo aplica con antigüedad estrictamente menor a 90 días y Nuevos no presentes cruza Maestro contra Inventario sin generar reposición.
- Customer incorpora `customerType` con fallback vacío y presentación en Configuración, sin mapping físico Dataverse.

Pendientes no implementados: significado de Sin origen, redefinición de buckets o fases EOL, reposición de productos nuevos, fórmula por Tipo de Cliente, mapping Dataverse de `customerType`, MSAL, Entra, Render, Azure y conexiones reales.

## Fase 1.1B — Phase1-003 Real Customer Transport

Se implementa una Customer API Node portable entre Vercel y Dataverse, con
OAuth client_credentials en backend, cache de token, timeout, errores
normalizados, CORS allowlist y rutas específicas sin OData libre. El Entity Set
confirmado es `accounts`; el mapping físico queda encapsulado en el gateway
Dataverse y el frontend conserva Customer Repository, Application Service,
combobox y protección de respuestas obsoletas.

Render queda como hosting temporal configurable y Azure como migración futura;
ninguno forma parte de la lógica Customer. Despliegue, secretos, permisos y smoke
test real continúan pendientes de autorización/ejecución manual.

## Fase 1.1 — Phase1-002 Dataverse Maestro Cliente

Se implementó la primera frontera Dataverse exclusivamente para Maestro Cliente:
contrato normalizado `Customer`, Dataverse Customer Provider configurable,
Customer Repository, servicio de aplicación y búsqueda UI por código/nombre con
selección única. Phase1-003 confirma tabla/campos e implementa el transporte real
backend; el Provider local inyectable se conserva como fallback de desarrollo.

No se modifica Maestro Producto, Inventario Cliente, motores, fórmulas,
parámetros ni el Repository histórico de sell-through.

## Hito Prompt 031 — Reglas funcionales Astrid–Jesús

Se implementan como alcance aprobado Inventario en Tránsito, reposición descontando Compra, EOL F4, Mix GOOD/BETTER/BEST/EOL, Pareto A/B/C, temporalidad, KPIs de unidades y valorización completa. Repository, Provider, Configuration Center y fuentes permanecen sin cambios.

Estado funcional después del hito:

- AP-1.2 Inventario en Tránsito: implementado en DTO y Dashboard con valorización por costo aplicado vigente.
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
- Application Service y Domain Service están implementados parcialmente; desde Prompt 022 existe Portfolio Analysis y desde Prompt 024 Executive Report MVP como Business Services separados. Repository y Local Provider de sell-through conservan su versión síncrona; Configuration Center posee una foundation limitada a tres pilotos. Phase1-002 agregó la frontera asíncrona de Maestro Cliente y Phase1-003 su API/transport real portable, pendiente únicamente de configuración, despliegue y validación contra el entorno real.

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
