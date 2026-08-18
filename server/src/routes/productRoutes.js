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
  if (!['/api/products/brands', '/api/products/master'].includes(url.pathname)) return false;
  if (request.method !== 'GET') {
    writeJson(response, 405, {
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Método no permitido.' },
    });
    return true;
  }

  if (url.pathname === '/api/products/brands') {
    if ([...url.searchParams.keys()].length > 0) {
      const error = new Error('La consulta de marcas no admite parámetros.');
      error.code = 'INVALID_PRODUCT_REQUEST';
      error.statusCode = 400;
      throw error;
    }
    const brands = await productService.listBrands({ productTrace });
    writeJson(response, 200, { brands });
    return true;
  }

  // El único parámetro funcional aceptado es brand; OData y parámetros
  // arbitrarios permanecen encapsulados fuera del frontend.
  const keys = [...url.searchParams.keys()];
  if (keys.length !== 1 || keys[0] !== 'brand'
    || url.searchParams.getAll('brand').length !== 1) {
    const error = new Error('La carga de Maestro Producto requiere únicamente la marca.');
    error.code = 'INVALID_PRODUCT_REQUEST';
    error.statusCode = 400;
    throw error;
  }
  const products = await productService.loadMaster({
    brand: url.searchParams.get('brand'),
    productTrace,
  });
  writeJson(response, 200, { products });
  return true;
};
