import { createRemoteJWKSet, jwtVerify } from 'jose';

export class CustomerApiAuthenticationError extends Error {
  constructor() {
    super('Se requiere autenticación válida.');
    this.name = 'CustomerApiAuthenticationError';
    this.code = 'AUTHENTICATION_REQUIRED';
    this.statusCode = 401;
  }
}

export class CustomerApiAuthorizationError extends Error {
  constructor() {
    super('La identidad no tiene el permiso requerido.');
    this.name = 'CustomerApiAuthorizationError';
    this.code = 'INSUFFICIENT_SCOPE';
    this.statusCode = 403;
  }
}

const requiredText = (value, field) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`CustomerApiAuthenticator: falta "${field}".`);
  }
  return value.trim();
};

const readBearerToken = (authorizationHeader) => {
  if (typeof authorizationHeader !== 'string') {
    throw new CustomerApiAuthenticationError();
  }
  const match = authorizationHeader.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) throw new CustomerApiAuthenticationError();
  return match[1];
};

export const createCustomerApiAuthenticator = ({
  tenantId,
  audience,
  requiredScope,
  jwks,
  verifyJwt = jwtVerify,
} = {}) => {
  const normalizedTenantId = requiredText(tenantId, 'tenantId');
  const normalizedAudience = requiredText(audience, 'audience');
  const normalizedScope = requiredText(requiredScope, 'requiredScope');
  const issuer = `https://login.microsoftonline.com/${normalizedTenantId}/v2.0`;
  const keySet = jwks ?? createRemoteJWKSet(
    new URL(`https://login.microsoftonline.com/${normalizedTenantId}/discovery/v2.0/keys`),
    { timeoutDuration: 10000 },
  );

  return Object.freeze({
    async authenticate(request) {
      const token = readBearerToken(request.headers.authorization);
      let payload;
      try {
        ({ payload } = await verifyJwt(token, keySet, {
          algorithms: ['RS256'],
          audience: normalizedAudience,
          issuer,
          requiredClaims: ['exp', 'tid'],
        }));
      } catch {
        throw new CustomerApiAuthenticationError();
      }

      if (payload.tid !== normalizedTenantId) {
        throw new CustomerApiAuthenticationError();
      }
      const scopes = typeof payload.scp === 'string'
        ? payload.scp.split(/\s+/).filter(Boolean)
        : [];
      if (!scopes.includes(normalizedScope)) {
        throw new CustomerApiAuthorizationError();
      }

      return Object.freeze({
        subject: typeof payload.oid === 'string' && payload.oid
          ? payload.oid
          : payload.sub,
        tenantId: payload.tid,
        scopes: Object.freeze(scopes),
      });
    },
  });
};
