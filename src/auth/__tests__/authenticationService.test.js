import { describe, expect, it, vi } from 'vitest';
import { logout } from '../authenticationService.js';

describe('servicio de sesión MSAL', () => {
  it('cierra la sesión activa y vuelve al origen configurado', async () => {
    const account = { homeAccountId: 'account-1', name: 'Usuario IOCA' };
    const client = {
      initialize: vi.fn(async () => {}),
      handleRedirectPromise: vi.fn(async () => null),
      getActiveAccount: vi.fn(() => account),
      getAllAccounts: vi.fn(() => [account]),
      setActiveAccount: vi.fn(),
      logoutRedirect: vi.fn(async () => {}),
    };

    await logout({
      client,
      postLogoutRedirectUri: 'https://sell-through.example',
    });

    expect(client.logoutRedirect).toHaveBeenCalledWith({
      account,
      postLogoutRedirectUri: 'https://sell-through.example',
    });
  });
});
