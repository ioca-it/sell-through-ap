import { describe, expect, it, vi } from 'vitest';
import { acquireCustomerApiAccessToken } from '../customerApiAccessToken.js';

const account = Object.freeze({ homeAccountId: 'account-1', username: 'user@example.com' });
const tokenRequest = Object.freeze({
  scopes: Object.freeze([
    'api://08c8b9e6-336d-496b-8904-08ba9e96ea4b/access_as_user',
  ]),
});

const createClient = ({
  activeAccount = account,
  accounts = activeAccount ? [activeAccount] : [],
  acquireTokenSilent = vi.fn(async () => ({ accessToken: 'access-token' })),
} = {}) => ({
  initialize: vi.fn(async () => {}),
  handleRedirectPromise: vi.fn(async () => null),
  getActiveAccount: vi.fn(() => activeAccount),
  getAllAccounts: vi.fn(() => accounts),
  setActiveAccount: vi.fn(),
  acquireTokenSilent,
  loginRedirect: vi.fn(async () => {}),
});

describe('getAccessToken MSAL', () => {
  it('usa acquireTokenSilent con la cuenta y el scope real de SellThrough-API', async () => {
    const client = createClient();

    await expect(acquireCustomerApiAccessToken({ client, tokenRequest }))
      .resolves.toBe('access-token');
    expect(client.acquireTokenSilent).toHaveBeenCalledWith({
      scopes: tokenRequest.scopes,
      account,
    });
    expect(client.loginRedirect).not.toHaveBeenCalled();
  });

  it('inicia loginRedirect con el scope correcto cuando no hay sesión', async () => {
    const client = createClient({ activeAccount: null, accounts: [] });

    await expect(acquireCustomerApiAccessToken({ client, tokenRequest }))
      .resolves.toBeNull();
    expect(client.acquireTokenSilent).not.toHaveBeenCalled();
    expect(client.loginRedirect).toHaveBeenCalledWith(tokenRequest);
  });

  it('hace fallback a loginRedirect cuando MSAL exige interacción', async () => {
    const acquireTokenSilent = vi.fn(async () => {
      throw { errorCode: 'interaction_required' };
    });
    const client = createClient({ acquireTokenSilent });

    await expect(acquireCustomerApiAccessToken({ client, tokenRequest }))
      .resolves.toBeNull();
    expect(client.loginRedirect).toHaveBeenCalledWith(tokenRequest);
  });

  it('propaga un fallo no interactivo sin iniciar login', async () => {
    const failure = new Error('network failure');
    const client = createClient({
      acquireTokenSilent: vi.fn(async () => { throw failure; }),
    });

    await expect(acquireCustomerApiAccessToken({ client, tokenRequest }))
      .rejects.toBe(failure);
    expect(client.loginRedirect).not.toHaveBeenCalled();
  });
});
