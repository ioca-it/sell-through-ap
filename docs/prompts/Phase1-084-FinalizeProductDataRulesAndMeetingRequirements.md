# Phase1-084 — Finalize Product Data Rules and Meeting Requirements

## Estado

**IMPLEMENTED / FINAL VALIDATION PENDING / NOT DEPLOYED.**

## Objetivo y alcance

Preparar la versión local de presentación con el filtro comercial aprobado de
Product Master y los pendientes funcionales de reunión, sin refactor general,
nuevas fuentes, precedencia de precios o cambios externos.

## Product Master

El Gateway construye en backend el filtro:

```text
(
  crbbe_companiacompradora eq 'IOCA USA INC'
  or crbbe_companiacompradora eq 'SAND SPORTS, CORP.'
)
and crbbe_nombrecompania eq crbbe_companiacompradora
and crbbe_nombremarca eq '<brand escapada>'
```

Dataverse admite comparación entre propiedades de la misma fila mediante
operadores OData cuando sus tipos coinciden. La igualdad se aplica también
dentro del `filter(...)` de Brands antes de agrupar marca. Node repite la
defensa sobre filas retornadas, pero no sustituye el filtrado upstream.

Se preservan `productpricelevels`, `crbbe_urlproducto`, mappings públicos,
FormattedValue, consolidación SKU, pivot USA/CHINA, `0|null`, `fechaStr` y el
bloqueo de cualquier conflicto real residual. No existe "más reciente gana".

## Requerimientos funcionales

- Producto Nuevo reutiliza la regla aprobada y documentada `<90 días` desde
  `Product.creationDate`; no queda umbral pendiente en este proyecto.
- El KPI cuenta SKU nuevos del Maestro ausentes del Inventario, nunca unidades.
- La tabla Nuevos no presentes muestra SKU, modelo, marca, categoría y fecha de
  creación, sin reposición.
- El record analítico conserva `creationDate`; Datos Completos lo exporta en
  formato normalizado.
- Excel añade Tránsito, Reposición sugerida y Nuevos no presentes reutilizando
  datasets calculados.
- SKU Activos documenta `Inv. Inicial / Ventas` y colores vigentes.
- Bucket EOL explica Vencido, Crítico 1–27, Próximo 28–83 y Planificado 84+ con
  un ejemplo matemático; la tabla de descuentos sigue como referencia interna.
- Trimestral permanece soportado por el catálogo/motor actual con 13 semanas.

## Archivos de implementación y pruebas

- Backend: `server/src/integrations/dataverse/productPriceLevelGateway.js`.
- Frontend/domain: `src/App.jsx` y
  `src/domain/parser/recordAssembler.js`.
- Pruebas backend: `server/tests/productPriceLevelGateway.node-test.js` y
  `server/tests/productApi.node-test.js`.
- Pruebas frontend/domain: `src/__tests__/ap01DashboardRevision.test.js`,
  `src/__tests__/inventoryEolCharacterization.test.js`,
  `src/__tests__/parserRecordCharacterization.test.js` y
  `src/domain/product/__tests__/newProduct.test.js`.

## Riesgos y reversión

La comparación OData exige que ambas columnas Dataverse sean comparables; las
pruebas locales validan composición y defensa, mientras la confirmación real
requiere un deploy posterior autorizado. Si quedan duplicados dentro del nuevo
universo, el bloqueo vigente continúa deliberadamente.

Reversión: retirar la condición de compañía y su defensa/pruebas, el campo
`creationDate` del record y las adiciones de presentación/exportación. No hay
migración de datos o estado externo que revertir.

## Validación

- Backend: 125/125 pruebas y syntax build PASS.
- Frontend: 33 archivos, 391/391 pruebas y Vite build PASS.
- `git diff --check`: PASS.
- Evidencia sanitizada:
  `logs/Phase1-084-FinalizeProductDataRulesAndMeetingRequirements.log`.

No hubo commit, push, deploy, cambio de variables, Dataverse, Entra, Vercel,
Render o timeouts.

Prompt ejecutado: Phase1-084 — Finalize Product Data Rules and Meeting Requirements
