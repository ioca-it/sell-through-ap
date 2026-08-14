import { describe, expect, it, vi } from 'vitest';
import { createCustomerProvider } from '../customerProviderFactory.js';
import { LOCAL_CUSTOMER_FIXTURES } from '../local/customerFixtures.js';

describe('customerProviderFactory', () => {
  it('selecciona LocalCustomerProvider cuando la fuente es local', async () => {
    const provider = createCustomerProvider({ source: 'local' });

    await expect(provider.searchCustomersByName('Demo Pro')).resolves.toEqual([
      LOCAL_CUSTOMER_FIXTURES[2],
    ]);
  });

  it('mantiene LocalCustomerProvider como fallback cuando la fuente está vacía', async () => {
    const provider = createCustomerProvider({ source: '' });

    await expect(provider.searchCustomersByCode('LOCAL-001')).resolves.toHaveLength(1);
  });

  it('selecciona DataverseCustomerProvider cuando la fuente es dataverse', async () => {
    const customer = {
      customerCode: 'DV-001',
      customerName: 'Cliente Dataverse',
      country: 'Guatemala',
      customerType: '',
    };
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ customers: [customer] }),
    }));
    const provider = createCustomerProvider({
      source: 'dataverse',
      apiBaseUrl: 'https://customer-api.invalid',
      fetchImpl,
      getAccessToken: async () => 'delegated-access-token',
    });

    await expect(provider.searchCustomersByCode('DV-')).resolves.toEqual([customer]);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[0][0].searchParams.get('type')).toBe('code');
  });

  it('rechaza una fuente distinta de local o dataverse', () => {
    expect(() => createCustomerProvider({ source: 'otra' })).toThrow(
      'CustomerProviderFactory: "VITE_CUSTOMER_SOURCE" debe ser "local" o "dataverse".',
    );
  });
});
