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
  defineMetric('inventoryValue', 'Valor Inventario', 'Valor monetario de las unidades aplicables con precio disponible.', 'Unidades aplicables × precio aplicable según origen: USA → priceUSA; CHINA → priceChina.', 'USD', 'Product Master + Inventario del Cliente', 'Precio 0 produce $0 real; precio ausente produce N/D para el SKU y nunca se convierte arbitrariamente en $0. Los agregados suman solo importes calculables.'),
  defineMetric('salesValue', 'Valor Ventas', 'Valor equivalente de las unidades vendidas del período.', 'Σ(precio aplicable × Ventas) sobre SKU con precio disponible.', 'USD', 'Product Master + Inventario del Cliente', 'Permite comparar el mix monetario de ventas.'),
  defineMetric('replenishmentValue', 'Valor Reposición', 'Valor equivalente de la reposición final sugerida.', 'Σ(precio aplicable × Reposición Final) sobre SKU con precio disponible.', 'USD', 'Product Master + motor de reposición', 'No incluye EOL ni Sin Maestro.'),
  defineMetric('valueShare', '% Valor', 'Participación monetaria de una categoría o Tier.', 'Valor USD del segmento ÷ valor USD total válido del bloque × 100.', '%', 'Agregación del análisis', 'No suma categorías superpuestas ni usa precios ausentes como cero.'),
  defineMetric('unitShare', '% Unidades', 'Participación de unidades de un segmento dentro del bloque.', 'Unidades del segmento ÷ unidades totales del bloque × 100.', '%', 'Inventario del Cliente', 'Compara mix de inventario, ventas o reposición.'),
  defineMetric('rotationPercentage', 'Porcentaje de Rotación', 'Porcentaje del inventario inicial vendido en el período.', 'Ventas en unidades del período ÷ Inventario inicial en unidades del período × 100.', '%', 'Inventario del Cliente', 'Inventario inicial = 0: N/D. Bandas equivalentes: alta >100%; normal 33.33%–100%; lenta 10%–<33.33%; crítica <10%.'),
  defineMetric('merma', 'Merma', 'Diferencia entre inventario proyectado operativo e inventario final.', 'Inventario Proyectado − Inventario Final.', 'Unidades', 'Inventario del Cliente + Inventory Engine', 'La alerta aplica si Inv. Inicial > 0 y Merma % supera estrictamente el umbral.'),
  defineMetric('mermaPct', 'Merma %', 'Merma relativa al inventario inicial.', 'Merma ÷ Inventario Inicial × 100 cuando Inventario Inicial > 0.', '%', 'Inventory Engine', 'Ayuda a detectar pérdidas o ajustes operativos.'),
  defineMetric('safetyClient', 'Inv. Seg. Cliente', 'Piso de inventario informado por el cliente.', 'Dato fuente normalizado.', 'Unidades', 'Inventario del Cliente', 'Se conserva como fallback cuando Ventas = 0.'),
  defineMetric('safetyIoca', 'Inv. Seg. IOCA', 'Cobertura mínima calculada por el motor V1.', 'ceil((Ventas ÷ semanas del período) × (Safety Stock + Lead Time del origen)); con Ventas = 0 usa Inv. Seg. Cliente.', 'Unidades', 'Inventory Engine + configuración', 'Compara el piso declarado con velocidad, cobertura y lead time reales.'),
  defineMetric('safetyDelta', 'Δ IOCA-Cliente', 'Diferencia entre seguridad calculada e informada.', 'Inv. Seg. IOCA − Inv. Seg. Cliente.', 'Unidades', 'Inventory Engine', 'Positivo indica cobertura IOCA superior a la declarada.'),
  defineMetric('safetySource', 'Fuente', 'Origen de la cifra de Inv. Seg. IOCA.', 'IOCA si Ventas > 0; Cliente si Ventas = 0.', 'Clasificación', 'Inventory Engine', 'Aclara si hubo cálculo o fallback controlado.'),
  defineMetric('projectedInventory', 'Inventario Proyectado', 'Posición operativa reportada; si falta toda la columna, el motor la calcula.', 'Valor informado; sin columna: Inv. Inicial + Compra − Ventas.', 'Unidades', 'Inventario del Cliente + Inventory Engine', 'Se usa en alerta de bajo inventario y merma; puede ser negativo.'),
  defineMetric('purchaseTransit', 'Compra / Tránsito', 'Unidades compradas o en tránsito.', 'Dato fuente; ausencia = 0 unidades.', 'Unidades', 'Inventario del Cliente', 'Se descuenta de la necesidad para obtener la reposición final.'),
  defineMetric('need', 'Necesidad', 'Brecha bruta frente al piso IOCA antes de descontar tránsito.', 'MAX(0, Inv. Seg. IOCA − Inventario Final).', 'Unidades', 'Inventory Engine', 'Es la etapa adicional aprobada del motor vigente.'),
  defineMetric('baseReplenishment', 'Pedido Sugerido Base', 'Resultado histórico del motor antes de aplicar múltiplos logísticos.', 'ACTIVO con Maestro: MAX(0, Necesidad − Compra); EOL/Sin Maestro: 0.', 'Unidades', 'Inventory Engine', 'La fórmula base se preserva; los packs se evalúan después.'),
  defineMetric('masterPack', 'Master Pack', 'Múltiplo logístico prioritario del Product Master cuando la bandera es true y la cantidad es válida.', 'Si aplica: CEIL(Pedido Base ÷ Cantidad Master Pack) × Cantidad Master Pack.', 'Unidades por pack', 'Product Master', 'Tiene prioridad absoluta sobre Inner Pack.'),
  defineMetric('innerPack', 'Inner Pack', 'Múltiplo logístico de fallback cuando Master Pack no aplica o su cantidad es inválida.', 'Si aplica: CEIL(Pedido Base ÷ Cantidad Inner Pack) × Cantidad Inner Pack.', 'Unidades por pack', 'Product Master', 'Solo se usa si no existe Master Pack válido.'),
  defineMetric('finalReplenishment', 'Pedido Sugerido Final', 'Valor operativo después de aplicar la precedencia Master Pack, Inner Pack o sin ajuste.', 'Master válido → CEIL(Base ÷ Master) × Master; si no, Inner válido → CEIL(Base ÷ Inner) × Inner; si no, Base.', 'Unidades', 'Inventory Engine + Product Master', 'Nunca redondea hacia abajo; EOL y Sin Maestro permanecen en cero.'),
  defineMetric('suggestedAction', 'Acción Sugerida', 'Acción operativa derivada del estado, quiebre, bucket EOL y Pareto.', 'Matriz vigente; EOL siempre termina en no reponer.', 'Recomendación', 'Inventory/EOL Engine + Pareto', 'Distingue reponer, rebalancear, reducir o liquidar.'),
  defineMetric('eolDefined', 'SKU EOL', 'SKU clasificado como EOL en Product Master.', 'Conteo de registros con Estado = EOL en el universo analizado.', 'SKU', 'Product Master', 'Universo total EOL; puede incluir SKU sin Fecha EOL válida o sin descuento aplicable. No se reduce al subconjunto operativo de descuento.'),
  defineMetric('eolDiscountApplicable', 'SKU EOL que aplica regla de descuento', 'Subconjunto operativo de SKU EOL con inventario real y una regla de descuento vigente mayor que cero.', 'Estado = EOL e Inventario Final > 0 y Descuento consumidor > 0%.', 'SKU', 'Product Master + Inventario del Cliente + EOL Engine', 'No modifica el KPI EOL general; excluye inventario cero/null y reglas sin descuento aplicable.'),
  defineMetric('eolDate', 'Fecha EOL', 'Fecha de descontinuación informada para el producto.', 'Dato fuente; sin cálculo.', 'Fecha', 'Product Master', 'Cuando es válida permite calcular Días EOL y Fase EOL; ausencia o invalidez se presenta como N/D.'),
  defineMetric('eolDays', 'Días EOL', 'Diferencia en días entre la Fecha EOL y la Fecha base EOL.', 'Fecha EOL − Fecha base EOL.', 'días', 'Product Master + EOL Engine', '≤ 0 = vencido; > 0 = días restantes. Solo calculable si la Fecha EOL es válida; de lo contrario, N/D.'),
  defineMetric('eolExpired', 'SKU EOL vencido/descontinuado', 'SKU EOL con fecha igual o anterior a la Fecha base EOL.', 'Estado = EOL y Días EOL ≤ 0.', 'SKU', 'Product Master + EOL Engine', 'Participa en el subconjunto vencido sin dejar de pertenecer al universo total EOL.'),
  defineMetric('eolBucket', 'Fase EOL', 'Clasificación temporal calculada desde una Fecha EOL válida.', 'VENCIDO: Días EOL ≤ 0; CRÍTICO: 1–27 días; PRÓXIMO: 28–83 días; PLANIFICADO: 84+ días.', 'Clasificación', 'Product Master + EOL Engine + Fecha base EOL', 'Sin Fecha EOL válida se presenta “Sin fecha EOL” y la fase no se calcula.'),
  defineMetric('eolRecommendation', 'Recomendación EOL', 'Acción comercial determinada por Fase EOL, Pareto y reglas vigentes.', 'VENCIDO/CRÍTICO → liquidar; otras fases con Pareto A → rebalancear/agotar; con Pareto B → reducción/rebalanceo; PRÓXIMO/PLANIFICADO restante → liquidar selectivamente; sin fecha y sin A/B → revisar Maestro; siempre no reponer.', 'Recomendación', 'EOL Engine + Pareto real', 'EOL mantiene prioridad sobre la reposición normal.'),
  defineMetric('paretoA', 'Pareto A / Vitales', 'Productos de mayor contribución a unidades vendidas.', 'Orden descendente; clase A mientras el acumulado anterior sea <80%.', 'SKU / %', 'Ventas del Cliente', 'Prioridad de disponibilidad para productos activos.'),
  defineMetric('paretoB', 'Pareto B', 'Productos de contribución intermedia.', 'Clase B cuando el acumulado anterior es ≥80% y <95%.', 'SKU / %', 'Ventas del Cliente', 'Complementan la concentración principal.'),
  defineMetric('paretoC', 'Pareto C', 'Productos de contribución restante o menor.', 'Clase C cuando el acumulado anterior es ≥95%.', 'SKU / %', 'Ventas del Cliente', 'Candidatos a racionalización según estado y movimiento.'),
  defineMetric('tier', 'Tier', 'Nivel comercial GOOD, BETTER, BEST o EOL.', 'Product Master/Inventario; Estado EOL fuerza Tier EOL.', 'Clasificación', 'Product Master + Inventario del Cliente', 'Permite comparar el mix comercial.'),
  defineMetric('tierInventorySku', 'Cantidad Total SKU Inventario', 'Cantidad de filas SKU del mismo universo que alimenta el bloque Tier de Inventario.', 'Conteo de registros con Inventario Final > 0 incluidos en Distribución Tier Inventario.', 'SKU', 'Dataset canónico Distribución Tier Inventario', 'Excluye filas sin unidades; no equivale al conteo técnico completo del cruce.'),
  defineMetric('tierInventoryUnits', 'Cantidad Total Unidades Inventario', 'Unidades del mismo universo que alimenta el bloque Tier de Inventario.', 'Σ Inventario Final de registros con Inventario Final > 0.', 'Unidades', 'Dataset canónico Distribución Tier Inventario', 'Coincide con el total inferior del bloque.'),
  defineMetric('tierSalesSku', 'Cantidad Total SKU Ventas', 'Cantidad de filas SKU del mismo universo que alimenta el bloque Tier de Ventas.', 'Conteo de registros con Ventas > 0 incluidos en Distribución Tier Ventas.', 'SKU', 'Dataset canónico Distribución Tier Ventas', 'Cuenta únicamente SKU con venta en el bloque.'),
  defineMetric('tierSalesUnits', 'Cantidad Total Unidades Ventas', 'Unidades vendidas del mismo universo que alimenta el bloque Tier de Ventas.', 'Σ Ventas de registros con Ventas > 0.', 'Unidades', 'Dataset canónico Distribución Tier Ventas', 'Coincide con el total inferior del bloque.'),
  defineMetric('tierReplenishmentSku', 'Cantidad Total SKU Reposición', 'Cantidad de filas SKU del mismo universo que alimenta el bloque Tier de Reposición.', 'Conteo de activos con Pedido Sugerido Final > 0.', 'SKU', 'Dataset canónico Distribución Tier Reposición', 'Usa el pedido final ajustado por pack.'),
  defineMetric('tierReplenishmentUnits', 'Cantidad Total Unidades Reposición', 'Unidades del mismo universo que alimenta el bloque Tier de Reposición.', 'Σ Pedido Sugerido Final de activos con valor > 0.', 'Unidades', 'Dataset canónico Distribución Tier Reposición', 'No suma Pedido Base después de aplicar packs.'),
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
  safety: Object.freeze(['sku', 'model', 'state', 'origin', 'safetyClient', 'safetyIoca', 'safetyDelta', 'safetySource', 'projectedInventory', 'purchaseTransit', 'need', 'baseReplenishment', 'masterPack', 'innerPack', 'finalReplenishment', 'suggestedAction']),
  distributions: Object.freeze(['tier', 'tierInventorySku', 'tierInventoryUnits', 'tierSalesSku', 'tierSalesUnits', 'tierReplenishmentSku', 'tierReplenishmentUnits', 'unitShare', 'valueShare', 'comparison']),
  pareto: Object.freeze(['paretoA', 'paretoB', 'paretoC']),
  replenishment: Object.freeze(['projectedInventory', 'purchaseTransit', 'need', 'baseReplenishment', 'masterPack', 'innerPack', 'finalReplenishment', 'replenishmentValue']),
  eol: Object.freeze(['eolDefined', 'eolDiscountApplicable', 'eolDate', 'eolDays', 'eolBucket', 'eolRecommendation', 'rotationPercentage', 'inventoryValue']),
  active: Object.freeze(['rotationPercentage', 'tier', 'inventoryValue']),
  newProducts: Object.freeze(['newProduct']),
  transit: Object.freeze(['transit', 'applicablePrice']),
  noMaster: Object.freeze(['noMaster']),
  report: Object.freeze(['inventoryValue', 'valueShare', 'rotationPercentage', 'merma', 'safetyIoca', 'projectedInventory', 'need', 'finalReplenishment', 'eolDefined', 'eolExpired', 'eolRecommendation', 'paretoA', 'paretoB', 'paretoC', 'tier', 'newProduct', 'transit', 'noMaster']),
});
