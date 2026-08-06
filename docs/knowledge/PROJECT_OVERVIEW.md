# Descripción general del proyecto

## Identidad

- Proyecto: `sell-through-ap`.
- Producto visible: IOCA Sell-Through Intelligence V1.
- Versión declarada en `package.json`: `1.0.0`.
- Tipo: aplicación web React ejecutada en el navegador.
- Enfoque: análisis consultivo B2B de inventario y sell-through.
- Restricción permanente: no mezclar este proyecto con NEXUS.

## Objetivo aprobado

Analizar inventario, ventas, reposición, fin de vida de producto (EOL), Pareto, Tier, categorías, merma, quiebres e impacto financiero para apoyar la gestión del portafolio y la conversación consultiva con el cliente.

## Capacidades implementadas

- Configuración en memoria del cliente, país, fecha de corte, período y parámetros operativos.
- Carga por pegado de texto del Maestro de Productos y del Inventario del Cliente.
- Carga de datos de ejemplo embebidos.
- Cruce de ambas entradas por SKU.
- Cálculo del Inventario de Seguridad IOCA V1.
- Identificación de inventario activo, EOL vencido, EOL futuro y SKU sin maestro.
- Buckets pre-EOL y fases post-EOL con cálculo de descuentos y aportes.
- Alertas por origen faltante, merma y quiebre.
- Reposición sugerida para SKU activos.
- Distribución de inventario, ventas y reposición por Tier y categoría.
- Análisis Pareto 80/20 por unidades vendidas.
- Dashboard y reporte ejecutivo consultivo imprimible.
- Exportación de resultados a CSV y libro Excel.

## Flujo actual del usuario

1. Completa código y nombre del cliente, país y parámetros del análisis.
2. Pega el Maestro de Productos y el Inventario del Cliente, o carga el ejemplo local.
3. Ejecuta el cálculo.
4. Revisa dashboard, alertas, distribuciones, EOL y Pareto.
5. Exporta CSV/Excel o imprime el informe ejecutivo.

## Límites actuales

- No hay backend, autenticación ni persistencia remota implementados.
- Los datos pegados, la configuración del usuario y los resultados viven en estado React y se pierden al recargar.
- No existe importación directa de archivos en la UI; la entrada visible actual son dos áreas de texto.
- Dataverse y Business Central no están conectados.
- Application Service y Domain Service están implementados parcialmente para parsing, ensamblaje, Inventory Engine, EOL Engine y agregaciones; la primera versión de Repository y Local Provider encapsula las fuentes actuales.
- DataverseProvider, Configuration Center y contratos asíncronos todavía no existen.
- UI, estado, informe ejecutivo y exportaciones permanecen concentrados en `src/App.jsx`.
- La fecha de corte se muestra y exporta, pero el cálculo EOL usa actualmente el primer día del mes del navegador.

## Tecnologías actuales

- React 18 y React DOM 18.
- Vite 5 con plugin React.
- Vitest 3 para pruebas de caracterización ejecutadas en entorno Node.
- `xlsx` para exportación de libros Excel.
- `lucide-react` para iconografía.
- Tailwind CSS cargado en tiempo de ejecución desde CDN en `index.html`.

## Fuentes documentales utilizadas

Esta descripción se deriva de `AGENTS.md`, la documentación raíz de `docs/`, los prompts históricos, `package.json`, `index.html`, `vite.config.js`, `src/App.jsx`, Application Service, Repository, Local Provider, `src/services/dataService.js` y `src/data/datos.json`.
