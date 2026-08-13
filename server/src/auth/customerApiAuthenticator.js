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

const defaultDiagnosticLogger = (reason) => {
  console.warn(`[CustomerApiAuthenticator] ${reason}`);
};

const logDiagnostic = (diagnosticLogger, reason) => {
  try {
    diagnosticLogger(reason);
  } catch {
    // Authentication and authorization behavior must not depend on diagnostics.
  }
};

const normalizeVerificationReason = (error) => {
  if (error?.code === 'ERR_JWT_EXPIRED') return 'JWT_EXPIRED';
  if (error?.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
    return 'JWT_SIGNATURE_REJECTED';
  }
  if (error?.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED') {
    if (error.claim === 'aud') return 'JWT_AUDIENCE_REJECTED';
    if (error.claim === 'iss') return 'JWT_ISSUER_REJECTED';
  }
  return 'JWT_VERIFICATION_REJECTED';
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
  diagnosticLogger = defaultDiagnosticLogger,
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
      let token;
      try {
        token = readBearerToken(request.headers.authorization);
      } catch (error) {
        logDiagnostic(diagnosticLogger, 'JWT_MISSING_BEARER');
        throw error;
      }
      let payload;
      try {
        ({ payload } = await verifyJwt(token, keySet, {
          algorithms: ['RS256'],
          audience: normalizedAudience,
          issuer,
          requiredClaims: ['exp', 'tid'],
        }));
      } catch (error) {
        logDiagnostic(diagnosticLogger, normalizeVerificationReason(error));
        throw new CustomerApiAuthenticationError();
      }

      if (payload.tid !== normalizedTenantId) {
        logDiagnostic(diagnosticLogger, 'JWT_TENANT_MISMATCH');
        throw new CustomerApiAuthenticationError();
      }
      const scopes = typeof payload.scp === 'string'
        ? payload.scp.split(/\s+/).filter(Boolean)
        : [];
      if (!scopes.includes(normalizedScope)) {
        logDiagnostic(diagnosticLogger, 'JWT_SCOPE_MISSING');
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
