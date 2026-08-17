// Caso de uso de carga de Maestro Producto; no conoce Dataverse, HTTP ni el
// parser físico seleccionado por el Repository.

const DEFAULT_LOAD_ERROR_MESSAGE = 'No fue posible cargar el Maestro Producto.';

const LOAD_ERROR_MESSAGES = Object.freeze({
  PRODUCT_SESSION_REQUIRED: 'Inicia sesión para consultar el Maestro Producto.',
  PRODUCT_AUTHENTICATION_REQUIRED: 'Tu sesión no es válida. Inicia sesión nuevamente.',
  PRODUCT_AUTHENTICATION_UNAVAILABLE: 'No fue posible validar tu sesión. Intenta nuevamente.',
  PRODUCT_AUTHORIZATION_DENIED: 'Tu cuenta no tiene permisos para consultar el Maestro Producto.',
  PRODUCT_RATE_LIMITED: 'Hay demasiadas consultas. Espera un momento e intenta nuevamente.',
  PRODUCT_SERVICE_UNAVAILABLE: 'El Maestro Producto no está disponible temporalmente. Intenta nuevamente.',
  PRODUCT_NETWORK_ERROR: 'No fue posible conectar con el Maestro Producto. Revisa tu conexión e intenta nuevamente.',
  PRODUCT_REQUEST_TIMEOUT: 'La consulta del Maestro Producto tardó demasiado. Intenta nuevamente.',
  PRODUCT_INVALID_RESPONSE: DEFAULT_LOAD_ERROR_MESSAGE,
  PRODUCT_MASTER_CONFLICT: 'El Maestro Producto contiene precios duplicados en conflicto. Requiere definición funcional.',
});

export const getProductMasterErrorMessage = (error) => (
  LOAD_ERROR_MESSAGES[error?.code] ?? error?.message ?? DEFAULT_LOAD_ERROR_MESSAGE
);

export const createProductMasterService = ({ repository } = {}) => {
  if (!repository || typeof repository.getProducts !== 'function') {
    throw new Error('ProductMasterService: Repository inválido.');
  }
  return Object.freeze({
    loadProducts() {
      return repository.getProducts();
    },
  });
};
