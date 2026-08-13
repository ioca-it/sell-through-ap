const requiredValue = (name, value) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`MSAL: falta "${name}".`);
  }
  return value.trim();
};

const normalizeRedirectUri = (value) => {
  const redirectUri = requiredValue('redirectUri', value);
  const parsedUri = new URL(redirectUri);
  if (!['http:', 'https:'].includes(parsedUri.protocol)) {
    throw new Error('MSAL: "redirectUri" debe usar HTTP o HTTPS.');
  }
  return redirectUri.replace(/\/+$/, '');
};

const browserOrigin = () => globalThis.location?.origin;

export const createMsalConfiguration = ({
  tenantId,
  clientId,
  apiScope,
  redirectUri = browserOrigin(),
} = {}) => {
  const normalizedTenantId = requiredValue('VITE_AUTH_TENANT_ID', tenantId);
  const normalizedClientId = requiredValue('VITE_AUTH_CLIENT_ID', clientId);
  const normalizedApiScope = requiredValue('VITE_AUTH_API_SCOPE', apiScope);
  const normalizedRedirectUri = normalizeRedirectUri(redirectUri);

  return Object.freeze({
    clientConfig: Object.freeze({
      auth: Object.freeze({
        clientId: normalizedClientId,
        authority: `https://login.microsoftonline.com/${normalizedTenantId}`,
        redirectUri: normalizedRedirectUri,
        postLogoutRedirectUri: normalizedRedirectUri,
      }),
      cache: Object.freeze({
        cacheLocation: 'sessionStorage',
        storeAuthStateInCookie: false,
      }),
    }),
    apiRequest: Object.freeze({
      scopes: Object.freeze([normalizedApiScope]),
    }),
  });
};

export const getMsalConfiguration = () => createMsalConfiguration({
  tenantId: import.meta.env.VITE_AUTH_TENANT_ID,
  clientId: import.meta.env.VITE_AUTH_CLIENT_ID,
  apiScope: import.meta.env.VITE_AUTH_API_SCOPE,
});
