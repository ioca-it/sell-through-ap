const FORBIDDEN_QUERY_PARAMETERS = Object.freeze([
  '$filter',
  '$select',
  '$orderby',
  '$top',
]);

const writeJson = (response, statusCode, payload) => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
};

const ensureAllowedSearchParameters = (searchParams) => {
  const keys = [...searchParams.keys()];
  if (keys.some((key) => FORBIDDEN_QUERY_PARAMETERS.includes(key))
    || keys.some((key) => !['type', 'q'].includes(key))) {
    const error = new Error('La consulta contiene parámetros no permitidos.');
    error.code = 'INVALID_CUSTOMER_REQUEST';
    error.statusCode = 400;
    throw error;
  }
};

export const handleCustomerRoutes = async ({ request, response, url, customerService }) => {
  if (url.pathname === '/api/customers/search') {
    if (request.method !== 'GET') {
      writeJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Método no permitido.' } });
      return true;
    }
    ensureAllowedSearchParameters(url.searchParams);
    const customers = await customerService.search(
      url.searchParams.get('type'),
      url.searchParams.get('q'),
    );
    writeJson(response, 200, { customers });
    return true;
  }

  const match = url.pathname.match(/^\/api\/customers\/([^/]+)$/);
  if (!match) return false;
  if (request.method !== 'GET') {
    writeJson(response, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Método no permitido.' } });
    return true;
  }

  let customerCode;
  try {
    customerCode = decodeURIComponent(match[1]);
  } catch {
    const error = new Error('El código de cliente contiene una codificación inválida.');
    error.code = 'INVALID_CUSTOMER_REQUEST';
    error.statusCode = 400;
    throw error;
  }
  const customer = await customerService.getByCode(customerCode);
  if (!customer) {
    writeJson(response, 404, { error: { code: 'CUSTOMER_NOT_FOUND', message: 'Cliente no encontrado.' } });
    return true;
  }
  writeJson(response, 200, { customer });
  return true;
};
