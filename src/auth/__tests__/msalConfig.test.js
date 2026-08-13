import { describe, expect, it } from 'vitest';
import { createMsalConfiguration } from '../msalConfig.js';

const apiScope = 'api://08c8b9e6-336d-496b-8904-08ba9e96ea4b/access_as_user';

describe('configuración MSAL frontend', () => {
  it('construye autoridad, cliente, redirect y scope desde variables inyectadas', () => {
    const configuration = createMsalConfiguration({
      tenantId: 'tenant-id',
      clientId: 'web-client-id',
      apiScope,
      redirectUri: 'http://localhost:5173/',
    });

    expect(configuration.clientConfig).toEqual({
      auth: {
        clientId: 'web-client-id',
        authority: 'https://login.microsoftonline.com/tenant-id',
        redirectUri: 'http://localhost:5173',
        postLogoutRedirectUri: 'http://localhost:5173',
      },
      cache: {
        cacheLocation: 'sessionStorage',
        storeAuthStateInCookie: false,
      },
    });
    expect(configuration.apiRequest.scopes).toEqual([apiScope]);
  });

  it.each([
    ['VITE_AUTH_TENANT_ID', { tenantId: '', clientId: 'client', apiScope }],
    ['VITE_AUTH_CLIENT_ID', { tenantId: 'tenant', clientId: '', apiScope }],
    ['VITE_AUTH_API_SCOPE', { tenantId: 'tenant', clientId: 'client', apiScope: '' }],
  ])('rechaza la variable requerida ausente %s', (variable, values) => {
    expect(() => createMsalConfiguration({
      ...values,
      redirectUri: 'https://sell-through.example',
    })).toThrow(variable);
  });
});
