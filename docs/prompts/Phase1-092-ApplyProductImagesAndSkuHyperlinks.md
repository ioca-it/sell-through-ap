# Phase1-092 — Apply Product Images and SKU Hyperlinks Across Detail Tables

## Estado

**PASS — IMPLEMENTED LOCALLY / VALIDATED / NOT DEPLOYED.**

## Objetivo y alcance

Aplicar transversalmente en la presentación el contrato Product normalizado:

- `imageUrl` como miniatura compacta con proporción preservada y fallback neutro;
- `productUrl` como enlace del SKU en nueva pestaña;
- rechazo silencioso de URLs que no sean `http:` o `https:`.

No se reconstruyen URLs, no se consulta Dataverse desde React y no cambian
precios, filtros, clasificación New, EOL, reposición, Customer, Brands,
backend, fuentes, variables o exportación gráfica de Excel.

## Contrato y flujo

Los mappings autorizados permanecen únicos en el Gateway backend:

- `crbbe_imagenproducto` → `imageUrl`.
- `crbbe_urlproducto` → `productUrl`.

Ambos campos ya sobrevivían Provider → Repository → Application Service →
record analítico. El único gap encontrado estaba en el agregado de tránsito;
`PortfolioAnalysisService` preserva ahora ambos campos al construir
`alertas.productosEnTransito`. Providers local y Dataverse mantienen el mismo
contrato normalizado; local entrega strings vacíos cuando su fuente no contiene
esas columnas.

## Presentación implementada

`ProductSkuCell` concentra validación de protocolo, miniatura, alt accesible,
fallback, SKU enlazado y atributos `target="_blank"` / 
`rel="noopener noreferrer"`. Imagen y SKU comparten una sola celda compacta
para no añadir ancho innecesario a las tablas.

Se modificaron estas vistas de detalle SKU:

- Dashboard: Sin Origen, Merma operativa, Bajo Inventario Seguridad IOCA,
  Nuevos no presentes, Inventario en tránsito, Pareto A/B/C, Productos de
  Reposición Sugerida, EOL vencidos, EOL futuros, Sin Maestro y SKU Activos.
- Informe Ejecutivo: prioritarios a Reponer, Liquidar y Eliminar, además de la
  ficha de Producto Héroe.

Se auditaron sin modificación las tablas agregadas de distribución Tier y
Categoría, diagnóstico, causas raíz y referencias institucionales porque no
presentan filas de producto/SKU. `Datos Completos` es una hoja Excel, no una
sección UI; conserva su exportación vigente y no recibe imágenes binarias.

## Seguridad y fallbacks

Solo URLs absolutas parseables con protocolo `http:` o `https:` habilitan
imagen/enlace. `javascript:`, `data:`, `file:`, `ftp:`, URLs relativas y texto
inválido producen SKU normal y fallback neutro, sin URL cruda ni excepción.
Un error de carga de imagen reemplaza únicamente esa miniatura por el fallback.

## Pruebas focalizadas

La cobertura agregada verifica miniatura válida/vacía/insegura, hyperlink
válido/vacío/inseguro, nueva pestaña, `noopener noreferrer`, las once tablas
SKU del Dashboard, las tres tablas SKU del Informe, Producto Héroe, tránsito,
limpieza de media al cambiar marca, Provider Dataverse y Provider local
existente. Customer conserva su suite sin cambios funcionales.

## Validación

- `npm test -- --run`: **PASS**, 34 archivos y 405/405 pruebas.
- `npm run build`: **PASS**, Vite 5.4.21 y 1.685 módulos transformados.
- Backend: no ejecutado porque ningún archivo backend fue modificado.
- `git diff --check`: **PASS**, sin errores de whitespace.

## Riesgos, reversión y pendiente externo

Riesgo residual: disponibilidad/CORS de imágenes remotas en el navegador; el
fallback evita imagen rota. Reversión local: retirar `ProductSkuCell`, restaurar
las celdas SKU y eliminar los dos campos del agregado de tránsito junto con sus
pruebas/documentación. No existe estado externo que revertir.

Pendiente: validación visual manual en desktop/mobile con URLs reales y, bajo
autorización separada, build/deploy del frontend con Product Dataverse activo.
Este hito no ejecuta deploy ni cambios externos.

Prompt ejecutado: Phase1-092 — Apply Product Images and SKU Hyperlinks Across Detail Tables
