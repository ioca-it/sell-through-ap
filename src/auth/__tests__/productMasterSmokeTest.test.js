import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isProductMasterSmokeTestRequested,
  runProductMasterSmokeTest,
  startProductMasterSmokeTest,
} from '../productMasterSmokeTest.js';

const apiBaseUrl = 'https://product-api.invalid';
const account = Object.freeze({ homeAccountId: 'account-1' });
const sensitiveProduct = Object.freeze({
  sku: 'REAL-SKU-SENSITIVE',
  productName: 'Sensitive Product Name',
  brand: 'Sensitive Brand',
  category: 'Sensitive Category',
  discontinuationDate: '2027-06-30T00:00:00.000Z',
  creationDate: '2026-08-01T00:00:00.000Z',
  level: 'Better',
  status: 'Active',
  imageUrl: 'https://private.invalid/image.png',
  productUrl: 'https://private.invalid/product',
  priceUSA: 0,
  priceChina: null,
});

const createResponse = (status, payload) => ({
  status,
  json: vi.fn(async () => payload),
});

const createDependencies = ({
  brand = 'Smoke Brand',
  authenticatedAccount = account,
  accessToken = 'delegated-sensitive-token',
  response = createResponse(200, { products: [sensitiveProduct] }),
} = {}) => ({
  brand,
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

describe('Phase1-042 real Dataverse Product Master smoke test', () => {
  it('sin trigger no ejecuta el arnés ni afecta la navegación normal', async () => {
    const run = vi.fn();
    const logger = { info: vi.fn(), error: vi.fn() };

    await expect(startProductMasterSmokeTest({ search: '', run, logger }))
      .resolves.toBe(false);
    expect(run).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('se activa exclusivamente con el trigger Product temporal', () => {
    expect(isProductMasterSmokeTestRequested('?phase1-042-product-smoke=1')).toBe(true);
    expect(isProductMasterSmokeTestRequested('?phase1-042-product-smoke=0')).toBe(false);
    expect(isProductMasterSmokeTestRequested('?phase1-010b-smoke=1')).toBe(false);
    expect(isProductMasterSmokeTestRequested('')).toBe(false);
  });

  it('con trigger pero sin sesión no adquiere token ni consulta la API', async () => {
    const dependencies = createDependencies({ authenticatedAccount: null });

    await expect(runProductMasterSmokeTest(dependencies)).resolves.toEqual(
      expect.objectContaining({
        httpStatus: null,
        productsReturned: null,
        renderJwtValidation: 'not_attempted',
        dataverseRequest: 'not_attempted',
        diagnostic: 'SESSION_REQUIRED',
      }),
    );
    expect(dependencies.acquireAccessToken).not.toHaveBeenCalled();
    expect(dependencies.fetchImpl).not.toHaveBeenCalled();
  });

  it('usa sesión válida, token delegado y GET autenticado exclusivamente a Product API', async () => {
    const dependencies = createDependencies();

    const result = await runProductMasterSmokeTest(dependencies);

    expect(dependencies.initialize).toHaveBeenCalledOnce();
    expect(dependencies.acquireAccessToken).toHaveBeenCalledOnce();
    const [url, options] = dependencies.fetchImpl.mock.calls[0];
    expect(url.pathname).toBe('/api/products/master');
    expect(url.searchParams.get('brand')).toBe('Smoke Brand');
    expect(options).toEqual(expect.objectContaining({
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer delegated-sensitive-token',
      },
      signal: expect.any(AbortSignal),
    }));
    expect(result).toEqual({
      httpStatus: 200,
      productsReturned: 1,
      renderJwtValidation: 'accepted',
      dataverseRequest: 'attempted',
      diagnostic: null,
      hasPriceUSA: true,
      hasPriceChina: false,
      hasNullPrice: true,
      hasFormattedLevel: true,
      hasFormattedStatus: true,
    });
  });

  it('sin brand controlada no consulta la API ni permite una carga global', async () => {
    const dependencies = createDependencies({ brand: '   ' });
    await expect(runProductMasterSmokeTest(dependencies)).resolves.toEqual(
      expect.objectContaining({ diagnostic: 'SMOKE_BRAND_REQUIRED' }),
    );
    expect(dependencies.initialize).not.toHaveBeenCalled();
    expect(dependencies.fetchImpl).not.toHaveBeenCalled();
  });

  it('usa 35000 ms por default y limpia el timer si la respuesta llega antes', async () => {
    vi.useFakeTimers();
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const dependencies = createDependencies();
    delete dependencies.requestTimeoutMs;

    const result = await runProductMasterSmokeTest(dependencies);
    const timeoutId = setTimeoutSpy.mock.results[0].value;
    const [, options] = dependencies.fetchImpl.mock.calls[0];

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 35000);
    expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutId);
    expect(options.signal.aborted).toBe(false);
    expect(result).toEqual(expect.objectContaining({
      httpStatus: 200,
      diagnostic: null,
    }));

    await vi.advanceTimersByTimeAsync(35000);
    expect(options.signal.aborted).toBe(false);
  });

  it('respeta el timeout inyectado y aborta el fetch exactamente al vencer', async () => {
    vi.useFakeTimers();
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    let requestSignal;
    const timeoutFailure = Object.assign(new Error('sensitive injected timeout detail'), {
      name: 'AbortError',
    });
    const fetchImpl = vi.fn((url, { signal }) => {
      requestSignal = signal;
      return new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(timeoutFailure), { once: true });
      });
    });
    const dependencies = createDependencies();
    dependencies.fetchImpl = fetchImpl;

    const resultPromise = runProductMasterSmokeTest(dependencies);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    const timeoutId = setTimeoutSpy.mock.results[0].value;
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(requestSignal.aborted).toBe(false);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);

    await vi.advanceTimersByTimeAsync(999);
    expect(requestSignal.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const result = await resultPromise;

    expect(requestSignal.aborted).toBe(true);
    expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutId);
    expect(result).toEqual(expect.objectContaining({
      httpStatus: null,
      productsReturned: null,
      renderJwtValidation: 'not_confirmed',
      dataverseRequest: 'not_confirmed',
      diagnostic: 'REQUEST_TIMEOUT',
    }));
    expect(JSON.stringify(result)).not.toContain('sensitive');
  });

  it('reduce cero productos a conteo y booleanos estructurales falsos', async () => {
    const dependencies = createDependencies({
      response: createResponse(200, { products: [] }),
    });

    await expect(runProductMasterSmokeTest(dependencies)).resolves.toEqual(
      expect.objectContaining({
        httpStatus: 200,
        productsReturned: 0,
        diagnostic: null,
        hasPriceUSA: false,
        hasPriceChina: false,
        hasNullPrice: false,
        hasFormattedLevel: false,
        hasFormattedStatus: false,
      }),
    );
  });

  it.each([
    [401, 'rejected', 'not_attempted', 'AUTHENTICATION_REJECTED'],
    [403, 'rejected', 'not_attempted', 'AUTHORIZATION_REJECTED'],
    [409, 'accepted', 'attempted', 'PRODUCT_MASTER_CONFLICT'],
    [429, 'not_confirmed', 'not_attempted', 'RATE_LIMITED'],
    [500, 'accepted', 'attempted', 'DATAVERSE_REQUEST_FAILED'],
    [502, 'accepted', 'attempted', 'DATAVERSE_REQUEST_FAILED'],
  ])('normaliza HTTP %s sin leer el payload de error', async (
    status,
    renderJwtValidation,
    dataverseRequest,
    diagnostic,
  ) => {
    const response = createResponse(status, {
      error: {
        code: 'SENSITIVE_SERVER_CODE',
        detail: 'JWT secret query payload real SKU',
      },
    });
    const dependencies = createDependencies({ response });

    const result = await runProductMasterSmokeTest(dependencies);

    expect(result).toEqual(expect.objectContaining({
      httpStatus: status,
      productsReturned: null,
      renderJwtValidation,
      dataverseRequest,
      diagnostic,
    }));
    expect(response.json).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(/SENSITIVE|secret|real SKU/);
  });

  it.each([
    ['NETWORK_REQUEST_FAILED', new Error('sensitive network detail')],
    ['REQUEST_TIMEOUT', Object.assign(new Error('sensitive timeout detail'), { name: 'AbortError' })],
  ])('normaliza %s sin exponer el error original', async (diagnostic, failure) => {
    const dependencies = createDependencies();
    dependencies.fetchImpl.mockRejectedValue(failure);

    const result = await runProductMasterSmokeTest(dependencies);

    expect(result).toEqual(expect.objectContaining({
      httpStatus: null,
      productsReturned: null,
      renderJwtValidation: 'not_confirmed',
      dataverseRequest: 'not_confirmed',
      diagnostic,
    }));
    expect(JSON.stringify(result)).not.toContain('sensitive');
  });

  it.each([
    { value: [sensitiveProduct] },
    { products: [null] },
  ])('rechaza una respuesta Product inválida sin publicar su contenido', async (payload) => {
    const dependencies = createDependencies({ response: createResponse(200, payload) });

    await expect(runProductMasterSmokeTest(dependencies)).resolves.toEqual(
      expect.objectContaining({
        httpStatus: 200,
        productsReturned: null,
        renderJwtValidation: 'accepted',
        dataverseRequest: 'attempted',
        diagnostic: 'INVALID_RESPONSE',
      }),
    );
  });

  it('publica únicamente el resultado sanitizado, nunca Product payload, token o URLs', async () => {
    const dependencies = createDependencies();
    const result = await runProductMasterSmokeTest(dependencies);
    const serializedResult = JSON.stringify(result);

    expect(Object.keys(result)).toEqual([
      'httpStatus',
      'productsReturned',
      'renderJwtValidation',
      'dataverseRequest',
      'diagnostic',
      'hasPriceUSA',
      'hasPriceChina',
      'hasNullPrice',
      'hasFormattedLevel',
      'hasFormattedStatus',
    ]);
    expect(serializedResult).not.toContain('delegated-sensitive-token');
    expect(serializedResult).not.toContain(sensitiveProduct.sku);
    expect(serializedResult).not.toContain(sensitiveProduct.productName);
    expect(serializedResult).not.toContain(sensitiveProduct.brand);
    expect(serializedResult).not.toContain(sensitiveProduct.imageUrl);
    expect(serializedResult).not.toContain(sensitiveProduct.productUrl);
    expect(serializedResult).not.toContain('priceUSA');
    expect(serializedResult).not.toContain('priceChina');
  });

  it('registra con trigger sólo el resultado sanitizado del runner', async () => {
    const logger = { info: vi.fn(), error: vi.fn() };
    const result = Object.freeze({ httpStatus: 200, productsReturned: 0 });
    const run = vi.fn(async () => result);

    await expect(startProductMasterSmokeTest({
      search: '?phase1-042-product-smoke=1&brand=Smoke%20Brand',
      run,
      logger,
    })).resolves.toBe(true);
    expect(run).toHaveBeenCalledWith({ brand: 'Smoke Brand' });
    expect(logger.info).toHaveBeenCalledWith(
      'Phase1-042 Real Dataverse Product Master Smoke Test',
      result,
    );
    expect(logger.error).not.toHaveBeenCalled();
  });
});
