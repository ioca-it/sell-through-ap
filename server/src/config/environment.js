const REQUIRED_VARIABLES = Object.freeze([
  'AUTH_TENANT_ID',
  'AUTH_API_CLIENT_ID',
  'AUTH_REQUIRED_SCOPE',
  'DV_TENANT_ID',
  'DV_CLIENT_ID',
  'DV_CLIENT_SECRET',
  'DV_BASE_URL',
  'ALLOWED_ORIGINS',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS',
]);

const requiredValue = (environment, key) => {
  const value = environment[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Configuration: falta la variable requerida "${key}".`);
  }
  return value.trim();
};

export const getDataverseOrigin = (baseUrl) => {
  let parsedUrl;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new Error('Configuration: "DV_BASE_URL" debe ser una URL válida.');
  }
  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Configuration: "DV_BASE_URL" debe usar HTTPS.');
  }
  return parsedUrl.origin;
};

export const deriveDataverseScope = (baseUrl) => `${getDataverseOrigin(baseUrl)}/.default`;

const parseAllowedOrigins = (rawOrigins) => rawOrigins.split(',').map((origin) => {
  const value = origin.trim();
  if (!value || value === '*') {
    throw new Error('Configuration: "ALLOWED_ORIGINS" no admite valores vacíos ni "*".');
  }

  let parsedOrigin;
  try {
    parsedOrigin = new URL(value);
  } catch {
    throw new Error(`Configuration: origen CORS inválido "${value}".`);
  }
  if (!['http:', 'https:'].includes(parsedOrigin.protocol)
    || parsedOrigin.origin !== value.replace(/\/$/, '')) {
    throw new Error(`Configuration: origen CORS inválido "${value}".`);
  }
  return parsedOrigin.origin;
});

const parsePort = (value) => {
  const port = value === undefined || value === '' ? 3000 : Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Configuration: "PORT" debe ser un puerto válido.');
  }
  return port;
};

const parsePositiveInteger = (value, key) => {
  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    throw new Error(`Configuration: "${key}" debe ser un entero positivo.`);
  }
  return parsedValue;
};

export const loadEnvironment = (environment = process.env) => {
  const values = Object.fromEntries(
    REQUIRED_VARIABLES.map((key) => [key, requiredValue(environment, key)]),
  );
  const dataverseOrigin = getDataverseOrigin(values.DV_BASE_URL);

  return Object.freeze({
    port: parsePort(environment.PORT),
    allowedOrigins: Object.freeze(parseAllowedOrigins(values.ALLOWED_ORIGINS)),
    auth: Object.freeze({
      tenantId: values.AUTH_TENANT_ID,
      audience: values.AUTH_API_CLIENT_ID,
      requiredScope: values.AUTH_REQUIRED_SCOPE,
    }),
    rateLimit: Object.freeze({
      windowMs: parsePositiveInteger(
        values.RATE_LIMIT_WINDOW_MS,
        'RATE_LIMIT_WINDOW_MS',
      ),
      maxRequests: parsePositiveInteger(
        values.RATE_LIMIT_MAX_REQUESTS,
        'RATE_LIMIT_MAX_REQUESTS',
      ),
    }),
    dataverse: Object.freeze({
      tenantId: values.DV_TENANT_ID,
      clientId: values.DV_CLIENT_ID,
      clientSecret: values.DV_CLIENT_SECRET,
      baseUrl: dataverseOrigin,
      scope: deriveDataverseScope(dataverseOrigin),
    }),
  });
};
