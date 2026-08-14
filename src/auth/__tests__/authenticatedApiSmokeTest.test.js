import { describe, expect, it, vi } from 'vitest';
import {
  isAuthenticatedApiSmokeTestRequested,
  runAuthenticatedApiSmokeTest,
} from '../authenticatedApiSmokeTest.js';

const apiBaseUrl = 'https://customer-api.invalid';
const account = Object.freeze({ homeAccountId: 'account-1' });

const customerPayload = Object.freeze({
  customerCode: 'controlled-customer-code',
  customerName: 'sensitive-customer-name',
  country: 'sensitive-country',
});

const createResponse = (status, payload) => ({
  status,
  json: vi.fn(async () => payload),
});

const createDependencies = ({
  authenticatedAccount = account,
  accessToken = 'test-access-token',
  response = createResponse(200, { customers: [customerPayload] }),
} = {}) => ({
  apiBaseUrl,
  initialize: vi.fn(async () => authenticatedAccount),
  acquireAccessToken: vi.fn(async () => accessToken),
  fetchImpl: vi.fn(async () => response),
});

describe('Phase1-010B real Dataverse Customer smoke test', () => {
  it('envía el Bearer, intenta Dataverse y conserva sólo el conteo', async () => {
    const dependencies = createDependencies();

    const result = await runAuthenticatedApiSmokeTest(dependencies);

    const [url, options] = dependencies.fetchImpl.mock.calls[0];
    expect(url.href).toBe(
      `${apiBaseUrl}/api/customers/search?type=code&q=CL0000041`,
    );
    expect(options).toEqual({
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer test-access-token',
      },
    });
    expect(result).toEqual({
      endpoint: `${apiBaseUrl}/api/customers/search?type=code&q=CL0000041`,
      msalAuthentication: 'authenticated',
      accessTokenAcquisition: 'acquired',
      renderJwtValidation: 'accepted',
      dataverseRequest: 'attempted',
      httpStatus: 200,
      customersReturned: 1,
      diagnostic: null,
    });
    const serializedResult = JSON.stringify(result);
    expect(serializedResult).not.toContain('test-access-token');
    expect(serializedResult).not.toContain(customerPayload.customerCode);
    expect(serializedResult).not.toContain(customerPayload.customerName);
    expect(serializedResult).not.toContain(customerPayload.country);
  });

  it.each([
    [401, 'AUTHENTICATION_REJECTED'],
    [403, 'AUTHORIZATION_REJECTED'],
  ])('normaliza rechazo HTTP %s sin intentar Dataverse', async (status, diagnostic) => {
    const response = createResponse(status, {
      error: { code: 'server-code', detail: 'sensitive-server-detail' },
    });
    const dependencies = createDependencies({ response });

    await expect(runAuthenticatedApiSmokeTest(dependencies)).resolves.toEqual(
      expect.objectContaining({
        msalAuthentication: 'authenticated',
        accessTokenAcquisition: 'acquired',
        renderJwtValidation: 'rejected',
        dataverseRequest: 'not_attempted',
        httpStatus: status,
        customersReturned: null,
        diagnostic,
      }),
    );
    expect(response.json).not.toHaveBeenCalled();
  });

  it('normaliza un fallo Dataverse sin leer ni exponer su payload', async () => {
    const response = createResponse(502, {
      error: { detail: 'DV_CLIENT_SECRET=sensitive access_token=sensitive-token' },
    });
    const dependencies = createDependencies({ response });

    const result = await runAuthenticatedApiSmokeTest(dependencies);

    expect(result).toEqual(expect.objectContaining({
      renderJwtValidation: 'accepted',
      dataverseRequest: 'attempted',
      httpStatus: 502,
      customersReturned: null,
      diagnostic: 'DATAVERSE_REQUEST_FAILED',
    }));
    expect(response.json).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(/DV_CLIENT_SECRET|sensitive-token/);
  });

  it('no adquiere token ni consulta Render sin cuenta autenticada', async () => {
    const dependencies = createDependencies({ authenticatedAccount: null });

    await expect(runAuthenticatedApiSmokeTest(dependencies)).resolves.toEqual(
      expect.objectContaining({
        msalAuthentication: 'not_authenticated',
        accessTokenAcquisition: 'not_attempted',
        renderJwtValidation: 'not_attempted',
        dataverseRequest: 'not_attempted',
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

  it('normaliza un fallo de red sin afirmar acceso Dataverse', async () => {
    const dependencies = createDependencies();
    dependencies.fetchImpl.mockRejectedValue(new Error('network detail'));

    await expect(runAuthenticatedApiSmokeTest(dependencies)).resolves.toEqual(
      expect.objectContaining({
        renderJwtValidation: 'not_confirmed',
        dataverseRequest: 'not_confirmed',
        httpStatus: null,
        customersReturned: null,
        diagnostic: 'NETWORK_REQUEST_FAILED',
      }),
    );
  });

  it('se activa exclusivamente con el query parameter temporal', () => {
    expect(isAuthenticatedApiSmokeTestRequested('?phase1-010b-smoke=1')).toBe(true);
    expect(isAuthenticatedApiSmokeTestRequested('?phase1-010b-smoke=0')).toBe(false);
    expect(isAuthenticatedApiSmokeTestRequested('?phase1-007-smoke=1')).toBe(false);
    expect(isAuthenticatedApiSmokeTestRequested('')).toBe(false);
  });
});
