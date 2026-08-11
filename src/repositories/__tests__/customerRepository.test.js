import { describe, expect, it, vi } from 'vitest';
import { createCustomerRepository } from '../customerRepository.js';

const customer = Object.freeze({
  customerCode: 'C-001',
  customerName: 'Cliente Uno',
  country: 'Guatemala',
  customerType: 'Mayorista',
});

const createProvider = () => ({
  searchCustomersByCode: vi.fn(async () => [customer]),
  searchCustomersByName: vi.fn(async () => [customer]),
});

describe('customerRepository', () => {
  it.each([
    ['searchByCode', 'searchCustomersByCode'],
    ['searchByName', 'searchCustomersByName'],
  ])('expone %s y delega en %s', async (repositoryMethod, providerMethod) => {
    const provider = createProvider();
    const repository = createCustomerRepository({ provider });

    await expect(repository[repositoryMethod]('Cliente')).resolves.toEqual([customer]);
    expect(provider[providerMethod]).toHaveBeenCalledWith('Cliente');
  });

  it('rechaza Providers que no implementan ambas búsquedas', () => {
    expect(() => createCustomerRepository({
      provider: { searchCustomersByCode: async () => [] },
    })).toThrow(
      'CustomerRepository: falta el método requerido "searchCustomersByName" en el Provider.',
    );
  });

  it('impide que un Provider filtre nombres físicos sin normalizar', async () => {
    const provider = createProvider();
    provider.searchCustomersByCode = vi.fn(async () => [{ raw_customer_code: 'C-001' }]);
    const repository = createCustomerRepository({ provider });

    await expect(repository.searchByCode('C-001')).rejects.toThrow(
      'CustomerRepository: el Provider devolvió un Customer sin normalizar.',
    );
  });
});
