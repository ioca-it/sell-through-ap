// Transporte HTTP autenticado compartido por los Providers frontend.
// MSAL continúa siendo el único responsable de adquirir y cachear el token.

const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

const normalizeApiBaseUrl = (value, consumerName) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${consumerName}: falta "VITE_API_BASE_URL".`);
  }
  const parsedUrl = new URL(value.trim());
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error(`${consumerName}: "VITE_API_BASE_URL" debe usar HTTP o HTTPS.`);
  }
  return value.trim().replace(/\/+$/, '');
};

const validateRequestTimeout = (value, consumerName) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${consumerName}: timeout inválido.`);
  }
  return value;
};

const defaultClassifyHttpStatus = (status, codes) => {
  if (status === 401) return codes.AUTHENTICATION_REQUIRED;
  if (status === 403) return codes.AUTHORIZATION_DENIED;
  if (status === 429) return codes.RATE_LIMITED;
  if (status >= 500) return codes.SERVICE_UNAVAILABLE;
  return codes.INVALID_RESPONSE;
};

export const createAuthenticatedApiClient = ({
  apiBaseUrl,
  fetchImpl = globalThis.fetch,
  getAccessToken,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  consumerName,
  codes,
  createError,
  classifyHttpStatus = defaultClassifyHttpStatus,
} = {}) => {
  const normalizedApiBaseUrl = normalizeApiBaseUrl(apiBaseUrl, consumerName);
  const normalizedRequestTimeout = validateRequestTimeout(requestTimeoutMs, consumerName);
  if (typeof fetchImpl !== 'function') {
    throw new Error(`${consumerName}: fetch no está disponible.`);
  }
  if (typeof getAccessToken !== 'function') {
    throw new Error(`${consumerName}: falta "getAccessToken".`);
  }
  if (!codes || typeof createError !== 'function' || typeof classifyHttpStatus !== 'function') {
    throw new Error(`${consumerName}: configuración de errores inválida.`);
  }

  return Object.freeze({
    async getJson(pathname) {
      const url = new URL(pathname, `${normalizedApiBaseUrl}/`);

      let accessToken;
      try {
        accessToken = await getAccessToken();
      } catch {
        throw createError(codes.AUTHENTICATION_UNAVAILABLE);
      }
      if (typeof accessToken !== 'string' || accessToken.trim() === '') {
        throw createError(codes.SESSION_REQUIRED);
      }

      const abortController = new AbortController();
      const timeoutId = globalThis.setTimeout(
        () => abortController.abort(),
        normalizedRequestTimeout,
      );

      try {
        let response;
        try {
          response = await fetchImpl(url, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            signal: abortController.signal,
          });
        } catch (error) {
          if (abortController.signal.aborted || error?.name === 'AbortError') {
            throw createError(codes.REQUEST_TIMEOUT);
          }
          throw createError(codes.NETWORK_ERROR);
        }

        if (!response.ok) {
          throw createError(classifyHttpStatus(response.status, codes));
        }

        try {
          return await response.json();
        } catch (error) {
          if (abortController.signal.aborted || error?.name === 'AbortError') {
            throw createError(codes.REQUEST_TIMEOUT);
          }
          throw createError(codes.INVALID_RESPONSE);
        }
      } finally {
        globalThis.clearTimeout(timeoutId);
      }
    },
  });
};
