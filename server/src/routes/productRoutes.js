const writeJson = (response, statusCode, payload) => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
};

export const handleProductRoutes = async ({
  request,
  response,
  url,
  productService,
  productTrace,
}) => {
  if (url.pathname !== '/api/products/master') return false;
  if (request.method !== 'GET') {
    writeJson(response, 405, {
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Método no permitido.' },
    });
    return true;
  }
  // El contrato Product no admite OData ni parámetros arbitrarios de frontend.
  if ([...url.searchParams.keys()].length > 0) {
    const error = new Error('La carga de Maestro Producto no admite parámetros.');
    error.code = 'INVALID_PRODUCT_REQUEST';
    error.statusCode = 400;
    throw error;
  }
  const products = await productService.loadMaster({ productTrace });
  writeJson(response, 200, { products });
  return true;
};
