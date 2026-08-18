import { createEntraTokenProvider } from '../auth/entraTokenProvider.js';
import { createCustomerApiAuthenticator } from '../auth/customerApiAuthenticator.js';
import { createAccountCustomerGateway } from '../integrations/dataverse/accountCustomerGateway.js';
import { createDataverseClient } from '../integrations/dataverse/dataverseClient.js';
import { createProductPriceLevelGateway } from '../integrations/dataverse/productPriceLevelGateway.js';
import { createCustomerService } from '../modules/customers/customerService.js';
import { createProductService } from '../modules/products/productService.js';
import {
  createProductRequestTrace,
  PRODUCT_TRACE_COMPONENTS,
  PRODUCT_TRACE_OPERATIONS,
  PRODUCT_TRACE_RESULTS,
  PRODUCT_TRACE_STAGES,
} from '../observability/productRequestTrace.js';
import { handleCustomerRoutes } from '../routes/customerRoutes.js';
import { handleProductRoutes } from '../routes/productRoutes.js';
import { createRateLimiter } from '../security/rateLimiter.js';

const writeJson = (response, statusCode, payload) => {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
};

const applyCors = ({ request, response, allowedOrigins }) => {
  const origin = request.headers.origin;
  if (!origin) return true;
  if (!allowedOrigins.includes(origin)) {
    writeJson(response, 403, {
      error: { code: 'CORS_ORIGIN_DENIED', message: 'Origen no autorizado.' },
    });
    return false;
  }

  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.setHeader('Access-Control-Max-Age', '600');
  return true;
};

const readProductTraceOperation = (request) => {
  if (request.method !== 'GET' || typeof request.url !== 'string') return undefined;
  if (request.url === '/api/products/master'
    || request.url.startsWith('/api/products/master?')) {
    return PRODUCT_TRACE_OPERATIONS.MASTER;
  }
  if (request.url === '/api/products/brands'
    || request.url.startsWith('/api/products/brands?')) {
    return PRODUCT_TRACE_OPERATIONS.BRANDS;
  }
  return undefined;
};

const startProductTrace = (factory, operation) => {
  try {
    return factory({ operation });
  } catch {
    return undefined;
  }
};

export const createApp = ({
  customerService,
  productService,
  allowedOrigins,
  authenticator,
  rateLimiter,
  productTraceFactory = createProductRequestTrace,
} = {}) => {
  if (!customerService || !Array.isArray(allowedOrigins) || allowedOrigins.includes('*')
    || typeof authenticator?.authenticate !== 'function'
    || typeof rateLimiter?.check !== 'function') {
    throw new Error('CustomerApi: configuración de aplicación inválida.');
  }

  return async (request, response) => {
    const productTraceOperation = readProductTraceOperation(request);
    const productTrace = productTraceOperation
      ? startProductTrace(productTraceFactory, productTraceOperation)
      : undefined;
    productTrace?.checkpoint({
      component: PRODUCT_TRACE_COMPONENTS.API,
      stage: PRODUCT_TRACE_STAGES.REQUEST_RECEIVED,
      result: PRODUCT_TRACE_RESULTS.REACHED,
    });
    if (productTrace && typeof response.once === 'function') {
      response.once('finish', () => productTrace.checkpoint({
        component: PRODUCT_TRACE_COMPONENTS.API,
        stage: PRODUCT_TRACE_STAGES.RESPONSE_SENT,
        result: PRODUCT_TRACE_RESULTS.REACHED,
      }));
    }

    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (!applyCors({ request, response, allowedOrigins })) return;
    if (request.method === 'OPTIONS') {
      response.statusCode = 204;
      response.end();
      return;
    }

    try {
      const url = new URL(request.url, 'http://customer-api.local');
      if (url.pathname === '/health') {
        if (request.method !== 'GET') {
          writeJson(response, 405, {
            error: { code: 'METHOD_NOT_ALLOWED', message: 'Método no permitido.' },
          });
          return;
        }
        writeJson(response, 200, { status: 'ok' });
        return;
      }

      if (/^\/api\/(?:customers|products)(?:\/|$)/.test(url.pathname)) {
        const forwardedFor = request.headers['x-forwarded-for'];
        const ip = typeof forwardedFor === 'string'
          ? forwardedFor.split(',')[0].trim()
          : request.socket?.remoteAddress;
        const ipRateLimit = await rateLimiter.check({ ip });
        if (!ipRateLimit.allowed) {
          response.setHeader('Retry-After', String(ipRateLimit.retryAfterSeconds));
          writeJson(response, 429, {
            error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Demasiadas solicitudes.' },
          });
          return;
        }

        const principal = await authenticator.authenticate(request);
        productTrace?.checkpoint({
          component: PRODUCT_TRACE_COMPONENTS.API,
          stage: PRODUCT_TRACE_STAGES.AUTH_VALIDATED,
          result: PRODUCT_TRACE_RESULTS.PASS,
        });
        if (principal.subject) {
          const identityRateLimit = await rateLimiter.check({
            identity: principal.subject,
            ip,
          });
          if (!identityRateLimit.allowed) {
            response.setHeader(
              'Retry-After',
              String(identityRateLimit.retryAfterSeconds),
            );
            writeJson(response, 429, {
              error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Demasiadas solicitudes.' },
            });
            return;
          }
        }
      }

      const handled = await handleCustomerRoutes({
        request,
        response,
        url,
        customerService,
      });
      const productHandled = handled ? false : await handleProductRoutes({
        request,
        response,
        url,
        productService,
        productTrace,
      });
      if (!handled && !productHandled) {
        writeJson(response, 404, { error: { code: 'NOT_FOUND', message: 'Ruta no encontrada.' } });
      }
    } catch (error) {
      const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
      writeJson(response, statusCode, {
        error: {
          code: error?.code || 'INTERNAL_ERROR',
          message: statusCode < 500 ? error.message : 'No fue posible procesar la solicitud.',
        },
      });
    }
  };
};

// Composition root portable: no conoce Render ni Azure; ambos alojamientos
// pueden reutilizar el mismo handler e inyectar únicamente variables de entorno.
export const createCustomerApi = ({ config, fetchImpl = globalThis.fetch } = {}) => {
  const authenticator = createCustomerApiAuthenticator({
    tenantId: config.auth.tenantId,
    audience: config.auth.audience,
    requiredScope: config.auth.requiredScope,
  });
  const rateLimiter = createRateLimiter(config.rateLimit);
  const tokenProvider = createEntraTokenProvider({
    tenantId: config.dataverse.tenantId,
    clientId: config.dataverse.clientId,
    clientSecret: config.dataverse.clientSecret,
    dataverseBaseUrl: config.dataverse.baseUrl,
    fetchImpl,
  });
  const dataverseClient = createDataverseClient({
    baseUrl: config.dataverse.baseUrl,
    tokenProvider,
    fetchImpl,
  });
  const customerGateway = createAccountCustomerGateway({ dataverseClient });
  const productGateway = createProductPriceLevelGateway({ dataverseClient });
  const customerService = createCustomerService({ customerGateway });
  const productService = createProductService({ productGateway });
  return createApp({
    customerService,
    productService,
    allowedOrigins: config.allowedOrigins,
    authenticator,
    rateLimiter,
  });
};
