# Phase1-105 — Consolidate Tier KPIs, EOL Discount Scope, Pack-Rounded Replenishment and Export Reconciliation

## Objetivo aprobado

Consolidar los seis KPI de Distribución por Tier sobre sus datasets canónicos,
incorporar Master Pack e Inner Pack al contrato Product Dataverse, ajustar la
reposición únicamente después de preservar el Pedido Sugerido Base, limitar la
tabla operativa EOL a SKU con inventario y descuento realmente aplicable, y
reconciliar UI, Excel y CSV sin alterar reglas históricas no autorizadas.

## Contratos protegidos

- Flujo Product: `UI -> Application -> Repository -> Provider -> Backend API -> Dataverse`.
- Product Master Dataverse permanece read-only y conserva filtros comerciales,
  marca previa a paginación, `MAX(crbbe_validodesde)` por SKU/origen/comprador,
  resolución independiente USA/CHINA, conflictos y semántica de precios `0|null`.
- `Product.creationDate` procede exclusivamente de `crbbe_validodesde`; no se
  restaura `createdon` ni se cambia Producto Nuevo `<90 días`.
- Se preservan Inventario Proyectado, Safety Stock, fórmula base de reposición,
  Pareto, Rotación, fases/porcentajes/aportes EOL, URLs e imágenes.
- Configuration Center permanece pendiente y detenido. No se implementa
  Phase1-101 ni se modifican sus dos archivos pendientes.

## Implementación autorizada

1. Agregar al `$select` y propagar `crbbe_aplicaamasterpack`,
   `crbbe_cantidadenmasterpack`, `crbbe_aplicaainnerpack` y
   `crbbe_cantidadinnerpack` como contrato Product normalizado nullable.
2. Conservar el resultado actual como Pedido Sugerido Base. Calcular después el
   Pedido Sugerido Final con precedencia Master válido, Inner válido y sin
   ajuste; usar `CEIL(Base / Cantidad Pack) * Cantidad Pack`.
3. Mantener `reposicionSugerida` como valor operativo final y exponer Base,
   flags/cantidades, tipo y cantidad aplicada para trazabilidad.
4. Derivar los seis KPI Tier directamente de los tres datasets de distribución:
   SKU/unidades de Inventario, Ventas y Reposición final.
5. Crear el subconjunto canónico EOL con `estado=EOL`, `invFinal>0` y descuento
   vigente mayor que cero. El KPI EOL general continúa usando `eolTodos`.
6. Hacer que Excel y CSV reutilicen resultados canónicos, con columnas de pack
   solo donde aportan valor y definiciones compartidas.

## Validación y límites

Agregar cobertura Product, pack, Tier, EOL y reconciliación UI/export; ejecutar
backend y frontend completos, builds, `git diff --check` y estado final. No
crear commit, push, deploy ni modificar Dataverse, Vercel, Render, Entra,
variables, timeouts, App Registration o roles.

Prompt ejecutado: Phase1-105 — Consolidate Tier KPIs, EOL Discount Scope, Pack-Rounded Replenishment and Export Reconciliation
