// Regla pura de Producto Nuevo y cruce contra el inventario del cliente.
// No calcula reposición ni conoce UI, Repository, Provider o fuentes físicas.

import { diasEntre } from '../../utils/dateUtils.js';

const isValidDate = (value) => (
  value instanceof Date && !Number.isNaN(value.getTime())
);

// Producto Nuevo aplica únicamente cuando creationDate es válida y su antigüedad
// respecto de la fecha oficial de procesamiento es estrictamente menor a 90 días.
export const isNewProduct = ({ creationDate, processingDate }) => {
  if (!isValidDate(creationDate) || !isValidDate(processingDate)) return false;
  return diasEntre(processingDate, creationDate) < 90;
};

// Nuevos no presentes cruza SKUs del Maestro contra presencia, no unidades, en
// Inventario del Cliente. Deliberadamente no deriva una reposición sugerida.
export const findNewProductsMissingInventory = ({
  masterBySku,
  inventoryRecords,
  processingDate,
}) => {
  const inventorySkus = new Set(inventoryRecords.map((record) => record.sku));

  return Object.values(masterBySku).filter((product) => (
    !inventorySkus.has(product.sku)
    && isNewProduct({ creationDate: product.creationDate, processingDate })
  ));
};
