# Glosario

| Término | Definición en el proyecto |
| --- | --- |
| AI-First | Metodología en la que IA realiza cambios apoyándose en contexto, acuerdos, trazabilidad, validación y documentación obligatoria. |
| Sell-through | Análisis de cómo las ventas y el inventario del cliente reflejan el movimiento del portafolio. |
| AP | Identificador usado por el roadmap funcional del proyecto. |
| SKU | Identificador de producto usado para cruzar Maestro e Inventario. |
| Maestro de Productos | Entrada con atributos de producto, estado, fecha EOL y costos por origen. |
| Inventario del Cliente | Entrada con tienda, SKU, Tier, origen, inventarios, compras y ventas. |
| EOL | End of Life; estado de producto descontinuado o con fecha de descontinuación. |
| EOL Vencido | Producto cuya fecha EOL ya pasó respecto de la fecha base del cálculo. |
| EOL Crítico | Producto a 1–27 días de EOL. |
| EOL Próximo | Producto a 28–83 días de EOL. |
| EOL Planificado | Producto a 84 días o más de EOL en la implementación actual. |
| F0–F3 | Fases post-EOL seleccionadas por marca, origen y días transcurridos. |
| Inventario de Seguridad del cliente | Piso reportado en el archivo/texto del Inventario. |
| Inventario de Seguridad IOCA | Piso calculado por el motor V1 a partir de ventas, período, safety stock y lead time. |
| Safety stock | Semanas de cobertura mínima configuradas para evitar quiebres. |
| Lead time | Semanas configuradas según origen USA o China. |
| Quiebre | Inventario Final menor que el Inventario de Seguridad aplicable. |
| Reposición sugerida | Diferencia positiva entre Inventario de Seguridad IOCA e Inventario Final para productos activos. |
| Merma | Diferencia entre Inventario Proyectado e Inventario Final. |
| Índice de rotación | Inventario Inicial dividido entre Ventas; no se calcula si no hay ventas. |
| Tier | Clasificación GOOD, BETTER o BEST; valores faltantes/desconocidos se agrupan como GOOD en distribuciones. |
| Pareto A | SKU que participa en el tramo acumulado hasta que el acumulado anterior alcanza 80% de ventas. |
| Pareto B | Resto de SKU con ventas después del tramo A. |
| SKU héroe | SKU con mayor cantidad de unidades vendidas dentro del análisis Pareto. |
| Configuration Center | Componente objetivo aún no implementado para centralizar parámetros modificables. |
| Application Service | Capa implementada parcialmente que coordina parsers, ensamblaje, motores, agregaciones y el objeto de resultados sin depender de React. |
| Repository | Frontera implementada que ofrece contratos estables de acceso a datos y es el único consumidor autorizado de Provider. |
| Provider | Adaptador de una fuente física; existe Local Provider para las fuentes actuales y DataverseProvider permanece pendiente. |
| Dataverse | Fuente futura principal prevista, sin esquema aprobado ni conexión implementada. |
| Business Central | Fuente potencial mencionada en restricciones arquitectónicas; sin acceso ni contrato implementados. |
| KAM | Rol comercial mencionado en textos consultivos y validaciones operativas del informe. |
| IOCA | Organización y fuente institucional de reglas/configuración identificadas como IOCA. |
| Retail | Parte del descuento atribuida al cliente/retailer según la tabla de fases. |
| NEXUS | Proyecto que debe permanecer separado de sell-through-ap. |
