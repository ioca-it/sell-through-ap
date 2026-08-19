const defineMetric = (id, name, definition, formula, unit, source, interpretation) =>
  Object.freeze({ id, name, definition, formula, unit, source, interpretation });

// Fuente única para leyendas UI y salidas Excel/CSV. Las fórmulas describen el
// motor ejecutado; no recalculan datos ni sustituyen resultados del dominio.
export const METRIC_DEFINITIONS = Object.freeze([
  defineMetric('sku', 'SKU', 'Código del producto o registro procesado.', 'Dato fuente; sin cálculo.', 'SKU', 'Inventario del Cliente / Product Master', 'Identifica el producto analizado.'),
  defineMetric('model', 'Modelo', 'Nombre o descripción comercial del producto.', 'Dato fuente; sin cálculo.', 'Texto', 'Product Master; fallback Inventario para Sin Maestro', 'Facilita reconocer el SKU.'),
  defineMetric('productUrl', 'Enlace de producto', 'Hipervínculo seguro asociado al SKU cuando Product Master aporta productUrl.', 'Solo URL absoluta con protocolo http: o https:.', 'URL', 'Product Master', 'Abre el producto en una pestaña nueva; ausencia o URL inválida queda sin enlace.'),
  defineMetric('imageUrl', 'Imagen de producto', 'Miniatura/lightbox en UI y enlace “Ver imagen” en Excel.', 'Solo URL absoluta con protocolo http: o https:.', 'URL/imagen', 'Product Master', 'SheetJS CE no inserta binarios; el enlace conserva la imagen sin arriesgar la exportación.'),
  defineMetric('state', 'Estado', 'Condición ACTIVO, EOL o SIN MAESTRO usada por el motor.', 'Normalización del estado del Product Master; ausencia de cruce = SIN MAESTRO.', 'Clasificación', 'Product Master + cruce', 'EOL y Sin Maestro bloquean reposición normal.'),
  defineMetric('origin', 'Origen', 'Origen aplicable informado en el Inventario.', 'CHINA → CHINA; cualquier otro valor → USA; vacío genera alerta y usa USA.', 'Origen', 'Inventario del Cliente', 'Selecciona precio y lead time sin fallback entre precios.'),
  defineMetric('applicablePrice', 'Precio aplicable', 'Precio unitario del Product Master seleccionado por origen.', 'USA → priceUSA; CHINA → priceChina.', 'USD/unidad', 'Product Master', 'Cero es precio real; ausencia permanece no disponible.'),
  defineMetric('inventoryUnits', 'Inventario Final', 'Unidades finales reportadas por el cliente.', 'Dato fuente normalizado.', 'Unidades', 'Inventario del Cliente', 'Base de valorización y necesidad de reposición.'),
  defineMetric('inventoryValue', 'Valor Inventario', 'Valor de inventario calculable para el bloque.', 'Σ(precio aplicable × Inventario Final) sobre SKU con precio disponible.', 'USD', 'Product Master + Inventario del Cliente', 'No convierte precios ausentes en cero; un total puede ser parcial válido.'),
  defineMetric('salesValue', 'Valor Ventas', 'Valor equivalente de las unidades vendidas del período.', 'Σ(precio aplicable × Ventas) sobre SKU con precio disponible.', 'USD', 'Product Master + Inventario del Cliente', 'Permite comparar el mix monetario de ventas.'),
  defineMetric('replenishmentValue', 'Valor Reposición', 'Valor equivalente de la reposición final sugerida.', 'Σ(precio aplicable × Reposición Final) sobre SKU con precio disponible.', 'USD', 'Product Master + motor de reposición', 'No incluye EOL ni Sin Maestro.'),
  defineMetric('valueShare', '% Valor', 'Participación monetaria de una categoría o Tier.', 'Valor USD del segmento ÷ valor USD total válido del bloque × 100.', '%', 'Agregación del análisis', 'No suma categorías superpuestas ni usa precios ausentes como cero.'),
  defineMetric('unitShare', '% Unidades', 'Participación de unidades de un segmento dentro del bloque.', 'Unidades del segmento ÷ unidades totales del bloque × 100.', '%', 'Inventario del Cliente', 'Compara mix de inventario, ventas o reposición.'),
  defineMetric('rotationPercentage', 'Porcentaje de Rotación', 'Ventas del período respecto al inventario inicial.', 'Ventas en unidades ÷ Inventario inicial en unidades × 100.', '%', 'Inventario del Cliente', 'Inventario inicial 0 = no calculable. Bandas equivalentes: alta >100%; normal 33.33%–100%; lenta 10%–<33.33%; crítica <10%.'),
  defineMetric('merma', 'Merma', 'Diferencia entre inventario proyectado operativo e inventario final.', 'Inventario Proyectado − Inventario Final.', 'Unidades', 'Inventario del Cliente + Inventory Engine', 'La alerta aplica si Inv. Inicial > 0 y Merma % supera estrictamente el umbral.'),
  defineMetric('mermaPct', 'Merma %', 'Merma relativa al inventario inicial.', 'Merma ÷ Inventario Inicial × 100 cuando Inventario Inicial > 0.', '%', 'Inventory Engine', 'Ayuda a detectar pérdidas o ajustes operativos.'),
  defineMetric('safetyClient', 'Inv. Seg. Cliente', 'Piso de inventario informado por el cliente.', 'Dato fuente normalizado.', 'Unidades', 'Inventario del Cliente', 'Se conserva como fallback cuando Ventas = 0.'),
  defineMetric('safetyIoca', 'Inv. Seg. IOCA', 'Cobertura mínima calculada por el motor V1.', 'ceil((Ventas ÷ semanas del período) × (Safety Stock + Lead Time del origen)); con Ventas = 0 usa Inv. Seg. Cliente.', 'Unidades', 'Inventory Engine + configuración', 'Compara el piso declarado con velocidad, cobertura y lead time reales.'),
  defineMetric('safetyDelta', 'Δ IOCA-Cliente', 'Diferencia entre seguridad calculada e informada.', 'Inv. Seg. IOCA − Inv. Seg. Cliente.', 'Unidades', 'Inventory Engine', 'Positivo indica cobertura IOCA superior a la declarada.'),
  defineMetric('safetySource', 'Fuente', 'Origen de la cifra de Inv. Seg. IOCA.', 'IOCA si Ventas > 0; Cliente si Ventas = 0.', 'Clasificación', 'Inventory Engine', 'Aclara si hubo cálculo o fallback controlado.'),
  defineMetric('projectedInventory', 'Inventario Proyectado', 'Posición operativa reportada; si falta toda la columna, el motor la calcula.', 'Valor informado; sin columna: Inv. Inicial + Compra − Ventas.', 'Unidades', 'Inventario del Cliente + Inventory Engine', 'Se usa en alerta de bajo inventario y merma; puede ser negativo.'),
  defineMetric('purchaseTransit', 'Compra / Tránsito', 'Unidades compradas o en tránsito.', 'Dato fuente; ausencia = 0 unidades.', 'Unidades', 'Inventario del Cliente', 'Se descuenta de la necesidad para obtener la reposición final.'),
  defineMetric('need', 'Necesidad', 'Brecha bruta frente al piso IOCA antes de descontar tránsito.', 'MAX(0, Inv. Seg. IOCA − Inventario Final).', 'Unidades', 'Inventory Engine', 'Es la etapa adicional aprobada del motor vigente.'),
  defineMetric('finalReplenishment', 'Reposición Final', 'Unidades adicionales después de considerar Compra/Tránsito.', 'ACTIVO con Maestro: MAX(0, Necesidad − Compra); EOL/Sin Maestro: 0.', 'Unidades', 'Inventory Engine', 'EOL tiene prioridad y nunca recibe reposición normal.'),
  defineMetric('suggestedAction', 'Acción Sugerida', 'Acción operativa derivada del estado, quiebre, bucket EOL y Pareto.', 'Matriz vigente; EOL siempre termina en no reponer.', 'Recomendación', 'Inventory/EOL Engine + Pareto', 'Distingue reponer, rebalancear, reducir o liquidar.'),
  defineMetric('eolDefined', 'SKU con EOL definido', 'Producto con información EOL válida utilizada por el motor.', 'Conteo de registros con Estado = EOL en el universo analizado.', 'SKU', 'Product Master', 'El KPI y el detalle usan el mismo universo, unidades y valorización EOL.'),
  defineMetric('eolExpired', 'SKU EOL vencido/descontinuado', 'SKU EOL con fecha igual o anterior a la fecha base del cálculo.', 'Estado = EOL y días de descontinuación ≥ 0.', 'SKU', 'Product Master + EOL Engine', 'Participa en tabla de EOL vencidos y fases post-EOL.'),
  defineMetric('eolBucket', 'FASE EOL', 'Clasificación según días respecto a Fecha base EOL.', 'VENCIDO: fecha EOL pasada o actual; CRÍTICO: 1–27 días; PRÓXIMO: 28–83 días; PLANIFICADO: 84+ días.', 'Clasificación', 'EOL Engine + Fecha base EOL', 'Ordena la gestión por vencimiento, criticidad y proximidad.'),
  defineMetric('eolRecommendation', 'Recomendación EOL', 'Acción que preserva la prioridad EOL sobre reposición.', 'Vencido/Crítico → liquidar; futuro A → rebalancear/agotar; futuro B → reducción/rebalanceo selectivo; resto → liquidar selectivamente; siempre no reponer.', 'Recomendación', 'EOL Engine + Pareto real', 'Evita que alta venta active reposición normal de un EOL.'),
  defineMetric('paretoA', 'Pareto A / Vitales', 'Productos de mayor contribución a unidades vendidas.', 'Orden descendente; clase A mientras el acumulado anterior sea <80%.', 'SKU / %', 'Ventas del Cliente', 'Prioridad de disponibilidad para productos activos.'),
  defineMetric('paretoB', 'Pareto B', 'Productos de contribución intermedia.', 'Clase B cuando el acumulado anterior es ≥80% y <95%.', 'SKU / %', 'Ventas del Cliente', 'Complementan la concentración principal.'),
  defineMetric('paretoC', 'Pareto C', 'Productos de contribución restante o menor.', 'Clase C cuando el acumulado anterior es ≥95%.', 'SKU / %', 'Ventas del Cliente', 'Candidatos a racionalización según estado y movimiento.'),
  defineMetric('tier', 'Tier', 'Nivel comercial GOOD, BETTER, BEST o EOL.', 'Product Master/Inventario; Estado EOL fuerza Tier EOL.', 'Clasificación', 'Product Master + Inventario del Cliente', 'Permite comparar el mix comercial.'),
  defineMetric('newProduct', 'Producto nuevo', 'Producto creado recientemente en Product Master.', 'Fecha de procesamiento − creationDate < 90 días; 90 días no clasifica.', 'SKU', 'Product Master', 'Si no aparece en Inventario se informa sin calcular reposición.'),
  defineMetric('transit', 'Inventario en tránsito', 'Compra agregada por SKU.', 'Σ Compra; Valor = Σ(Compra × precio aplicable válido).', 'Unidades / USD', 'Inventario del Cliente + Product Master', 'Incluye EOL aunque su reposición final sea cero.'),
  defineMetric('noMaster', 'Sin Maestro', 'SKU presente en Inventario sin coincidencia en Product Master.', 'Cruce por SKU sin resultado.', 'SKU / unidades', 'Inventario del Cliente', 'Precio y valorización no disponibles; requiere completar Maestro.'),
  defineMetric('comparison', 'Análisis comparativo', 'Contrasta participaciones de inventario, ventas y reposición.', 'Δ puntos porcentuales = % Reposición − % Ventas o % Inventario.', 'Puntos porcentuales', 'Distribuciones calculadas', 'Muestra si la reposición sigue la demanda o el inventario.'),
]);

const DEFINITIONS_BY_ID = new Map(METRIC_DEFINITIONS.map((definition) => [
  definition.id,
  definition,
]));

export const getMetricDefinitions = (ids) => ids.map((id) => {
  const definition = DEFINITIONS_BY_ID.get(id);
  if (!definition) throw new Error(`Definición de métrica no registrada: ${id}`);
  return definition;
});

export const metricDefinitionsAsRows = () => METRIC_DEFINITIONS.map((definition) => [
  definition.name,
  definition.definition,
  definition.formula,
  definition.unit,
  definition.source,
  definition.interpretation,
]);

export const DEFINITION_GROUPS = Object.freeze({
  executive: Object.freeze(['sku', 'inventoryUnits', 'inventoryValue', 'salesValue', 'replenishmentValue', 'valueShare']),
  alerts: Object.freeze(['merma', 'mermaPct', 'safetyIoca', 'finalReplenishment']),
  safety: Object.freeze(['sku', 'model', 'state', 'origin', 'safetyClient', 'safetyIoca', 'safetyDelta', 'safetySource', 'projectedInventory', 'purchaseTransit', 'need', 'finalReplenishment', 'suggestedAction']),
  distributions: Object.freeze(['tier', 'inventoryUnits', 'salesValue', 'replenishmentValue', 'unitShare', 'valueShare', 'comparison']),
  pareto: Object.freeze(['paretoA', 'paretoB', 'paretoC']),
  replenishment: Object.freeze(['projectedInventory', 'purchaseTransit', 'need', 'finalReplenishment', 'replenishmentValue']),
  eol: Object.freeze(['eolDefined', 'eolBucket', 'eolRecommendation', 'inventoryValue']),
  active: Object.freeze(['rotationPercentage', 'tier', 'inventoryValue']),
  newProducts: Object.freeze(['newProduct']),
  transit: Object.freeze(['transit', 'applicablePrice']),
  noMaster: Object.freeze(['noMaster']),
  report: Object.freeze(['inventoryValue', 'valueShare', 'rotationPercentage', 'merma', 'safetyIoca', 'projectedInventory', 'need', 'finalReplenishment', 'eolDefined', 'eolExpired', 'eolRecommendation', 'paretoA', 'paretoB', 'paretoC', 'tier', 'newProduct', 'transit', 'noMaster']),
});
