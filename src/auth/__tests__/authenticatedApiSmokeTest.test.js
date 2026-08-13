import { describe, expect, it, vi } from 'vitest';
import {
  isAuthenticatedApiSmokeTestRequested,
  runAuthenticatedApiSmokeTest,
} from '../authenticatedApiSmokeTest.js';

const apiBaseUrl = 'https://customer-api.invalid';
const account = Object.freeze({ homeAccountId: 'account-1' });

const createResponse = (status, code) => ({
  status,
  json: vi.fn(async () => ({ error: { code } })),
});

const createDependencies = ({
  authenticatedAccount = account,
  accessToken = 'test-access-token',
  response = createResponse(400, 'INVALID_CUSTOMER_REQUEST'),
} = {}) => ({
  apiBaseUrl,
  initialize: vi.fn(async () => authenticatedAccount),
  acquireAccessToken: vi.fn(async () => accessToken),
  fetchImpl: vi.fn(async () => response),
});

describe('Phase1-007 authenticated API smoke test', () => {
  it('envía el Bearer y confirma JWT sin solicitar Dataverse', async () => {
    const dependencies = createDependencies();

    const result = await runAuthenticatedApiSmokeTest(dependencies);

    const [url, options] = dependencies.fetchImpl.mock.calls[0];
    expect(url.href).toBe(`${apiBaseUrl}/api/customers/search?type=code`);
    expect(options).toEqual({
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer test-access-token',
      },
    });
    expect(result).toEqual({
      endpoint: `${apiBaseUrl}/api/customers/search?type=code`,
      msalAuthentication: 'authenticated',
      accessTokenAcquisition: 'acquired',
      renderJwtValidation: 'accepted',
      dataverseAccess: 'not_requested',
      httpStatus: 400,
      responseCode: 'INVALID_CUSTOMER_REQUEST',
    });
    expect(JSON.stringify(result)).not.toContain('test-access-token');
  });

  it('distingue el rechazo del JWT por Render', async () => {
    const dependencies = createDependencies({
      response: createResponse(401, 'AUTHENTICATION_REQUIRED'),
    });

    await expect(runAuthenticatedApiSmokeTest(dependencies)).resolves.toEqual(
      expect.objectContaining({
        msalAuthentication: 'authenticated',
        accessTokenAcquisition: 'acquired',
        renderJwtValidation: 'rejected',
        dataverseAccess: 'not_requested',
        httpStatus: 401,
      }),
    );
  });

  it('no adquiere token ni consulta Render sin cuenta autenticada', async () => {
    const dependencies = createDependencies({ authenticatedAccount: null });

    await expect(runAuthenticatedApiSmokeTest(dependencies)).resolves.toEqual(
      expect.objectContaining({
        msalAuthentication: 'not_authenticated',
        accessTokenAcquisition: 'not_attempted',
        renderJwtValidation: 'not_attempted',
        dataverseAccess: 'not_attempted',
      }),
    );
    expect(dependencies.acquireAccessToken).not.toHaveBeenCalled();
    expect(dependencies.fetchImpl).not.toHaveBeenCalled();
  });

  it('distingue un fallo de adquisición del token', async () => {
    const dependencies = createDependencies();
    dependencies.acquireAccessToken.mockRejectedValue(new Error('MSAL unavailable'));

    await expect(runAuthenticatedApiSmokeTest(dependencies)).resolves.toEqual(
      expect.objectContaining({
        msalAuthentication: 'authenticated',
        accessTokenAcquisition: 'failed',
        renderJwtValidation: 'not_attempted',
      }),
    );
    expect(dependencies.fetchImpl).not.toHaveBeenCalled();
  });

  it('se activa exclusivamente con el query parameter temporal', () => {
    expect(isAuthenticatedApiSmokeTestRequested('?phase1-007-smoke=1')).toBe(true);
    expect(isAuthenticatedApiSmokeTestRequested('?phase1-007-smoke=0')).toBe(false);
    expect(isAuthenticatedApiSmokeTestRequested('')).toBe(false);
  });
});
