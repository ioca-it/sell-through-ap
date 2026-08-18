import { describe, expect, it, vi } from 'vitest';
import {
  CUSTOMER_API_ERROR_CODES,
  createDataverseCustomerProvider,
  CustomerApiError,
} from '../dataverseCustomerProvider.js';

const apiBaseUrl = 'https://customer-api.invalid';
const customer = {
  customerCode: 'C-001',
  customerName: 'Cliente Uno',
  country: 'Guatemala',
  customerType: '',
};

const createProvider = ({
  payload = { customers: [customer] },
  ok = true,
  status = ok ? 200 : 500,
} = {}) => {
  const fetchImpl = vi.fn(async () => ({
    ok,
    status,
    json: async () => payload,
  }));
  const getAccessToken = vi.fn(async () => 'delegated-access-token');
  return {
    provider: createDataverseCustomerProvider({
      apiBaseUrl,
      fetchImpl,
      getAccessToken,
    }),
    fetchImpl,
    getAccessToken,
  };
};

describe('dataverseCustomerProvider vía backend API', () => {
  it('busca por código exclusivamente mediante Customer API', async () => {
    const { provider, fetchImpl } = createProvider();

    await expect(provider.searchCustomersByCode(' C- ')).resolves.toEqual([customer]);
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url.origin).toBe(apiBaseUrl);
    expect(url.pathname).toBe('/api/customers/search');
    expect(url.searchParams.get('type')).toBe('code');
    expect(url.searchParams.get('q')).toBe('C-');
    expect(options).toEqual({
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer delegated-access-token',
      },
      signal: expect.any(AbortSignal),
    });
  });

  it('busca por nombre y codifica el valor sin construir OData', async () => {
    const { provider, fetchImpl } = createProvider();

    await provider.searchCustomersByName("O'Brien & Hijos");
    const [url] = fetchImpl.mock.calls[0];
    expect(url.searchParams.get('type')).toBe('name');
    expect(url.searchParams.get('q')).toBe("O'Brien & Hijos");
    expect(url.href).not.toContain('$filter');
    expect(url.href).not.toContain('$select');
  });

  it('normaliza la respuesta al contrato Customer y descarta campos extra', async () => {
    const { provider } = createProvider({
      payload: { customers: [{ ...customer, internalField: 'no-debe-salir' }] },
    });

    await expect(provider.searchCustomersByCode('C')).resolves.toEqual([customer]);
  });

  it('mantiene customerType vacío cuando la API no entrega el campo real', async () => {
    const { provider } = createProvider({
      payload: { customers: [{
        customerCode: 'C-002',
        customerName: 'Cliente Dos',
        country: 'Guatemala',
      }] },
    });

    await expect(provider.searchCustomersByCode('C-002')).resolves.toEqual([{
      customerCode: 'C-002',
      customerName: 'Cliente Dos',
      country: 'Guatemala',
      customerType: '',
    }]);
  });

  it('devuelve un arreglo vacío controlado cuando no hay coincidencias', async () => {
    const { provider } = createProvider({ payload: { customers: [] } });

    await expect(provider.searchCustomersByName('Ausente')).resolves.toEqual([]);
  });

  it('no consulta la API con término vacío', async () => {
    const { provider, fetchImpl, getAccessToken } = createProvider();

    await expect(provider.searchCustomersByCode('   ')).resolves.toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(getAccessToken).not.toHaveBeenCalled();
  });

  it.each([
    [401, CUSTOMER_API_ERROR_CODES.AUTHENTICATION_REQUIRED],
    [403, CUSTOMER_API_ERROR_CODES.AUTHORIZATION_DENIED],
    [429, CUSTOMER_API_ERROR_CODES.RATE_LIMITED],
    [503, CUSTOMER_API_ERROR_CODES.SERVICE_UNAVAILABLE],
  ])('normaliza HTTP %s sin mostrar detalles técnicos', async (status, code) => {
    const { provider } = createProvider({ ok: false, status });

    await expect(provider.searchCustomersByCode('C')).rejects.toEqual(
      expect.objectContaining({
        name: 'CustomerApiError',
        code,
        message: 'No fue posible consultar el Maestro Cliente.',
      }),
    );
  });

  it('normaliza errores de red sin exponer el error original', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('URL interna y stack sensible');
    });
    const provider = createDataverseCustomerProvider({
      apiBaseUrl,
      fetchImpl,
      getAccessToken: async () => 'delegated-access-token',
    });

    await expect(provider.searchCustomersByCode('C')).rejects.toEqual(
      expect.objectContaining({ code: CUSTOMER_API_ERROR_CODES.NETWORK_ERROR }),
    );
  });

  it('clasifica timeout sin exponer detalles del transporte', async () => {
    const fetchImpl = vi.fn(async () => {
      const error = new Error('timeout técnico');
      error.name = 'AbortError';
      throw error;
    });
    const provider = createDataverseCustomerProvider({
      apiBaseUrl,
      fetchImpl,
      getAccessToken: async () => 'delegated-access-token',
    });

    await expect(provider.searchCustomersByName('Cliente')).rejects.toEqual(
      expect.objectContaining({ code: CUSTOMER_API_ERROR_CODES.REQUEST_TIMEOUT }),
    );
  });

  it('conserva el timeout Customer default de 10000 ms', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { provider } = createProvider();

    await provider.searchCustomersByCode('C');

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 10000);
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });

  it('no consulta la API y orienta la capa superior cuando no hay sesión', async () => {
    const fetchImpl = vi.fn();
    const provider = createDataverseCustomerProvider({
      apiBaseUrl,
      fetchImpl,
      getAccessToken: async () => null,
    });

    await expect(provider.searchCustomersByCode('C')).rejects.toEqual(
      expect.objectContaining({ code: CUSTOMER_API_ERROR_CODES.SESSION_REQUIRED }),
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rechaza respuestas con forma inválida', async () => {
    const { provider } = createProvider({ payload: { value: [customer] } });

    await expect(provider.searchCustomersByName('Cliente')).rejects.toBeInstanceOf(
      CustomerApiError,
    );
  });

  it('adjunta solo el Bearer delegado sin secretos ni nombres Dataverse', async () => {
    const { provider, fetchImpl } = createProvider();

    await provider.searchCustomersByCode('C');
    const [url, options] = fetchImpl.mock.calls[0];
    const request = `${url.href}${JSON.stringify(options)}`;
    expect(options.headers.Authorization).toBe('Bearer delegated-access-token');
    expect(request).not.toMatch(/client_secret|DV_CLIENT_SECRET/);
    expect(request).not.toMatch(/new_codigocliente|crbbe_nombrepais|accounts/);
  });

  it('requiere VITE_API_BASE_URL al crear el Provider', () => {
    expect(() => createDataverseCustomerProvider({ apiBaseUrl: '' })).toThrow(
      'DataverseCustomerProvider: falta "VITE_API_BASE_URL".',
    );
  });

  it('requiere la abstracción getAccessToken', () => {
    expect(() => createDataverseCustomerProvider({ apiBaseUrl })).toThrow(
      'DataverseCustomerProvider: falta "getAccessToken".',
    );
  });

  it('normaliza fallos al adquirir token sin consultar la API', async () => {
    const fetchImpl = vi.fn();
    const provider = createDataverseCustomerProvider({
      apiBaseUrl,
      fetchImpl,
      getAccessToken: async () => {
        throw new Error('detalle técnico MSAL');
      },
    });

    await expect(provider.searchCustomersByCode('C')).rejects.toEqual(
      expect.objectContaining({
        code: CUSTOMER_API_ERROR_CODES.AUTHENTICATION_UNAVAILABLE,
      }),
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
