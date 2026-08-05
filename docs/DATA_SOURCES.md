# Fuentes de información — sell-through-ap

## DS-001 — Configuración local

- Ubicación actual: src/data/datos.json
- Acceso actual: src/services/dataService.js
- Contenido: períodos, países, lead time, safety stock, merma, fases y buckets EOL.
- Estado: temporal.
- Fuente futura: Dataverse.

## DS-002 — Maestro de Productos

- Fuente actual: archivo o texto cargado por el usuario.
- Campos principales: SKU, marca, modelo, categoría, estado, fecha EOL, costo USA y costo China.
- Fuente futura: Dataverse.

## DS-003 — Inventario del Cliente

- Fuente actual: archivo o texto cargado por el usuario.
- Campos principales: tienda, SKU, tier, origen, inventarios, compras y ventas.
- Fuente futura: Dataverse o integración autorizada.

## DS-004 — Configuración de usuario

- Fuente actual: estado React.
- Fuente futura: Configuration Center y Dataverse.

## DS-005 — Dataverse

- Estado: fuente futura principal.
- No inventar entidades ni columnas.
- Todo mapeo deberá confirmarse y documentarse.

## Regla obligatoria

La UI y la lógica de negocio no deberán depender directamente de ninguna fuente.
