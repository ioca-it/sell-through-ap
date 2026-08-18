import { afterEach, describe, expect, it, vi } from 'vitest';
import { isAuthenticatedApiSmokeTestRequested } from '../authenticatedApiSmokeTest.js';
import {
  isProductBrandsSmokeTestRequested,
  runProductBrandsSmokeTest,
  startProductBrandsSmokeTest,
} from '../productBrandsSmokeTest.js';
import { isProductMasterSmokeTestRequested } from '../productMasterSmokeTest.js';

const apiBaseUrl = 'https://product-api.invalid';
const account = Object.freeze({
  homeAccountId: 'sensitive-account-id',
  username: 'sensitive-user@example.invalid',
});
const sensitiveBrands = Object.freeze([
  'Sensitive Brand Alpha',
  'Sensitive Brand Beta',
]);

const createResponse = (status, payload) => ({
  status,
  json: vi.fn(async () => payload),
});

const createDependencies = ({
  authenticatedAccount = account,
  accessToken = 'delegated-sensitive-token',
  response = createResponse(200, { brands: [...sensitiveBrands] }),
} = {}) => ({
  apiBaseUrl,
  initialize: vi.fn(async () => authenticatedAccount),
  acquireAccessToken: vi.fn(async () => accessToken),
  fetchImpl: vi.fn(async () => response),
  requestTimeoutMs: 1000,
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Phase1-075 authenticated Product Brands smoke test', () => {
  it('sin trigger exacto no ejecuta ni produce side effects', async () => {
    const run = vi.fn();
    const logger = { info: vi.fn(), error: vi.fn(), log: vi.fn() };

    await expect(startProductBrandsSmokeTest({ search: '', run, logger }))
      .resolves.toBe(false);
    expect(run).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.log).not.toHaveBeenCalled();
  });

  it('se activa exclusivamente con phase1-075-brands-smoke=1', () => {
    expect(isProductBrandsSmokeTestRequested('?phase1-075-brands-smoke=1')).toBe(true);
    expect(isProductBrandsSmokeTestRequested('?phase1-075-brands-smoke=0')).toBe(false);
    expect(isProductBrandsSmokeTestRequested('?phase1-075-brands-smoke=01')).toBe(false);
    expect(isProductBrandsSmokeTestRequested('?phase1-042-product-smoke=1')).toBe(false);
    expect(isProductBrandsSmokeTestRequested('?phase1-010b-smoke=1')).toBe(false);
  });

  it('el trigger Brands no activa los smokes Product Master o Customer', () => {
    const search = '?phase1-075-brands-smoke=1';

    expect(isProductMasterSmokeTestRequested(search)).toBe(false);
    expect(isAuthenticatedApiSmokeTestRequested(search)).toBe(false);
  });

  it('con trigger exacto intenta el smoke y publica sólo el resultado recibido', async () => {
    const logger = { info: vi.fn(), error: vi.fn(), log: vi.fn() };
    const result = Object.freeze({
      httpStatus: 200,
      renderJwtValidation: 'accepted',
      dataverseRequest: 'attempted',
      diagnostic: null,
      brandsReturned: 0,
    });
    const run = vi.fn(async () => result);

    await expect(startProductBrandsSmokeTest({
      search: '?phase1-075-brands-smoke=1',
      run,
      logger,
    })).resolves.toBe(true);
    expect(run).toHaveBeenCalledOnce();
    expect(run).toHaveBeenCalledWith();
    expect(logger.info).toHaveBeenCalledWith(
      'Phase1-075 Authenticated Product Brands Smoke Test',
      result,
    );
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.log).not.toHaveBeenCalled();
  });

  it('sin sesión devuelve SESSION_REQUIRED sin token ni request', async () => {
    const dependencies = createDependencies({ authenticatedAccount: null });

    await expect(runProductBrandsSmokeTest(dependencies)).resolves.toEqual({
      httpStatus: null,
      renderJwtValidation: 'not_attempted',
      dataverseRequest: 'not_attempted',
      diagnostic: 'SESSION_REQUIRED',
      brandsReturned: null,
    });
    expect(dependencies.initialize).toHaveBeenCalledOnce();
    expect(dependencies.acquireAccessToken).not.toHaveBeenCalled();
    expect(dependencies.fetchImpl).not.toHaveBeenCalled();
  });

  it('adquiere token delegado y envía GET autenticado sólo a /api/products/brands', async () => {
    const dependencies = createDependencies();

    const result = await runProductBrandsSmokeTest(dependencies);

    expect(dependencies.initialize).toHaveBeenCalledOnce();
    expect(dependencies.acquireAccessToken).toHaveBeenCalledOnce();
    const [url, options] = dependencies.fetchImpl.mock.calls[0];
    expect(url.origin).toBe(apiBaseUrl);
    expect(url.pathname).toBe('/api/products/brands');
    expect(url.search).toBe('');
    expect(options).toEqual({
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer delegated-sensitive-token',
      },
      signal: expect.any(AbortSignal),
    });
    expect(result).toEqual({
      httpStatus: 200,
      renderJwtValidation: 'accepted',
      dataverseRequest: 'attempted',
      diagnostic: null,
      brandsReturned: 2,
    });
  });

  it('usa 35000 ms por default, AbortController y cleanup al completar', async () => {
    vi.useFakeTimers();
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const dependencies = createDependencies();
    delete dependencies.requestTimeoutMs;

    const result = await runProductBrandsSmokeTest(dependencies);
    const timeoutId = setTimeoutSpy.mock.results[0].value;
    const [, options] = dependencies.fetchImpl.mock.calls[0];

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 35000);
    expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutId);
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.signal.aborted).toBe(false);
    expect(result).toEqual(expect.objectContaining({ httpStatus: 200, diagnostic: null }));

    await vi.advanceTimersByTimeAsync(35000);
    expect(options.signal.aborted).toBe(false);
  });

  it('aborta exactamente al vencer y devuelve REQUEST_TIMEOUT sanitizado', async () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    let requestSignal;
    const sensitiveFailure = Object.assign(new Error('sensitive timeout detail'), {
      name: 'AbortError',
    });
    const fetchImpl = vi.fn((url, { signal }) => {
      requestSignal = signal;
      return new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(sensitiveFailure), { once: true });
      });
    });
    const dependencies = createDependencies();
    dependencies.fetchImpl = fetchImpl;

    const resultPromise = runProductBrandsSmokeTest(dependencies);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(requestSignal.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(999);
    expect(requestSignal.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const result = await resultPromise;

    expect(requestSignal.aborted).toBe(true);
    expect(clearTimeoutSpy).toHaveBeenCalledOnce();
    expect(result).toEqual({
      httpStatus: null,
      renderJwtValidation: 'not_confirmed',
      dataverseRequest: 'not_confirmed',
      diagnostic: 'REQUEST_TIMEOUT',
      brandsReturned: null,
    });
    expect(JSON.stringify(result)).not.toContain('sensitive');
  });

  it('reduce brands=[] exclusivamente a brandsReturned=0', async () => {
    const dependencies = createDependencies({
      response: createResponse(200, { brands: [] }),
    });

    await expect(runProductBrandsSmokeTest(dependencies)).resolves.toEqual({
      httpStatus: 200,
      renderJwtValidation: 'accepted',
      dataverseRequest: 'attempted',
      diagnostic: null,
      brandsReturned: 0,
    });
  });

  it('cuenta únicamente strings del array brands sin conservar sus valores', async () => {
    const dependencies = createDependencies({
      response: createResponse(200, {
        brands: [sensitiveBrands[0], null, 42, sensitiveBrands[1]],
      }),
    });

    const result = await runProductBrandsSmokeTest(dependencies);

    expect(result.brandsReturned).toBe(2);
    expect(JSON.stringify(result)).not.toContain(sensitiveBrands[0]);
    expect(JSON.stringify(result)).not.toContain(sensitiveBrands[1]);
  });

  it.each([
    [401, 'rejected', 'not_attempted', 'AUTHENTICATION_REJECTED'],
    [403, 'rejected', 'not_attempted', 'AUTHORIZATION_REJECTED'],
    [429, 'not_confirmed', 'not_attempted', 'RATE_LIMITED'],
    [500, 'accepted', 'attempted', 'DATAVERSE_REQUEST_FAILED'],
    [503, 'accepted', 'attempted', 'DATAVERSE_REQUEST_FAILED'],
  ])('normaliza HTTP %s sin leer el payload de error', async (
    status,
    renderJwtValidation,
    dataverseRequest,
    diagnostic,
  ) => {
    const response = createResponse(status, {
      error: {
        detail: 'sensitive backend payload token URL query OData',
      },
    });
    const dependencies = createDependencies({ response });

    const result = await runProductBrandsSmokeTest(dependencies);

    expect(result).toEqual({
      httpStatus: status,
      renderJwtValidation,
      dataverseRequest,
      diagnostic,
      brandsReturned: null,
    });
    expect(response.json).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(/sensitive|payload|query OData/);
  });

  it('normaliza un error de red sin exponer el error original', async () => {
    const dependencies = createDependencies();
    dependencies.fetchImpl.mockRejectedValue(new Error('sensitive network URL detail'));

    const result = await runProductBrandsSmokeTest(dependencies);

    expect(result).toEqual({
      httpStatus: null,
      renderJwtValidation: 'not_confirmed',
      dataverseRequest: 'not_confirmed',
      diagnostic: 'NETWORK_REQUEST_FAILED',
      brandsReturned: null,
    });
    expect(JSON.stringify(result)).not.toContain('sensitive');
  });

  it('normaliza JSON inválido como INVALID_RESPONSE', async () => {
    const response = createResponse(200, null);
    response.json.mockRejectedValue(new SyntaxError('sensitive response body'));
    const dependencies = createDependencies({ response });

    await expect(runProductBrandsSmokeTest(dependencies)).resolves.toEqual({
      httpStatus: 200,
      renderJwtValidation: 'accepted',
      dataverseRequest: 'attempted',
      diagnostic: 'INVALID_RESPONSE',
      brandsReturned: null,
    });
  });

  it.each([
    null,
    {},
    { brands: 'Sensitive Brand Alpha' },
  ])('rechaza shape inválido sin publicar contenido', async (payload) => {
    const dependencies = createDependencies({ response: createResponse(200, payload) });

    const result = await runProductBrandsSmokeTest(dependencies);

    expect(result).toEqual({
      httpStatus: 200,
      renderJwtValidation: 'accepted',
      dataverseRequest: 'attempted',
      diagnostic: 'INVALID_RESPONSE',
      brandsReturned: null,
    });
    expect(JSON.stringify(result)).not.toContain('Sensitive Brand Alpha');
  });

  it('construye y registra sólo los cinco campos allowlisted', async () => {
    const dependencies = createDependencies();
    const logger = { info: vi.fn(), error: vi.fn(), log: vi.fn() };
    const run = vi.fn(async () => runProductBrandsSmokeTest(dependencies));

    await startProductBrandsSmokeTest({
      search: '?phase1-075-brands-smoke=1',
      run,
      logger,
    });

    const [, result] = logger.info.mock.calls[0];
    const serializedLog = JSON.stringify(logger.info.mock.calls);
    expect(Object.keys(result)).toEqual([
      'httpStatus',
      'renderJwtValidation',
      'dataverseRequest',
      'diagnostic',
      'brandsReturned',
    ]);
    expect(serializedLog).not.toContain('delegated-sensitive-token');
    expect(serializedLog).not.toContain('Authorization');
    expect(serializedLog).not.toContain(sensitiveBrands[0]);
    expect(serializedLog).not.toContain(sensitiveBrands[1]);
    expect(serializedLog).not.toContain(account.homeAccountId);
    expect(serializedLog).not.toContain(account.username);
    expect(serializedLog).not.toContain(apiBaseUrl);
    expect(logger.log).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
