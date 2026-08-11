import { describe, expect, it, vi } from 'vitest';
import {
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

const createProvider = ({ payload = { customers: [customer] }, ok = true } = {}) => {
  const fetchImpl = vi.fn(async () => ({
    ok,
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

  it('no consulta la API con término vacío', async () => {
    const { provider, fetchImpl, getAccessToken } = createProvider();

    await expect(provider.searchCustomersByCode('   ')).resolves.toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(getAccessToken).not.toHaveBeenCalled();
  });

  it('normaliza errores HTTP sin mostrar detalles técnicos', async () => {
    const { provider } = createProvider({ ok: false });

    await expect(provider.searchCustomersByCode('C')).rejects.toEqual(
      expect.objectContaining({
        name: 'CustomerApiError',
        message: 'No fue posible consultar el Maestro Cliente.',
      }),
    );
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

    await expect(provider.searchCustomersByCode('C')).rejects.toBeInstanceOf(
      CustomerApiError,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
