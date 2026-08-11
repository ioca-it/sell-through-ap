import { deriveDataverseScope } from '../config/environment.js';

export class EntraAuthenticationError extends Error {
  constructor(message = 'No fue posible autenticar la integración Dataverse.') {
    super(message);
    this.name = 'EntraAuthenticationError';
    this.code = 'ENTRA_AUTHENTICATION_FAILED';
    this.statusCode = 502;
  }
}

const positiveNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;

export const createEntraTokenProvider = ({
  tenantId,
  clientId,
  clientSecret,
  dataverseBaseUrl,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  timeoutMs = 10000,
  safetyMarginSeconds = 60,
} = {}) => {
  if (![tenantId, clientId, clientSecret, dataverseBaseUrl]
    .every((value) => typeof value === 'string' && value.trim() !== '')) {
    throw new Error('EntraTokenProvider: configuración incompleta.');
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('EntraTokenProvider: fetch no está disponible.');
  }

  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;
  const scope = deriveDataverseScope(dataverseBaseUrl);
  let cachedToken = null;
  let validUntil = 0;
  let pendingToken = null;

  const requestToken = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
        scope,
      });
      const response = await fetchImpl(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: controller.signal,
      });
      if (!response.ok) throw new EntraAuthenticationError();

      const payload = await response.json();
      if (typeof payload?.access_token !== 'string' || payload.access_token === ''
        || !positiveNumber(payload.expires_in)) {
        throw new EntraAuthenticationError();
      }

      const lifetimeMs = payload.expires_in * 1000;
      const marginMs = Math.min(safetyMarginSeconds * 1000, lifetimeMs / 2);
      cachedToken = payload.access_token;
      validUntil = now() + lifetimeMs - marginMs;
      return cachedToken;
    } catch (error) {
      if (error instanceof EntraAuthenticationError) throw error;
      throw new EntraAuthenticationError();
    } finally {
      clearTimeout(timeout);
    }
  };

  return Object.freeze({
    getToken() {
      if (cachedToken && now() < validUntil) return Promise.resolve(cachedToken);
      if (!pendingToken) {
        pendingToken = requestToken().finally(() => {
          pendingToken = null;
        });
      }
      return pendingToken;
    },
  });
};
