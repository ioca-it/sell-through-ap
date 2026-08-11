import { describe, expect, it } from 'vitest';
import { LOCAL_CUSTOMER_FIXTURES } from '../customerFixtures.js';
import { createLocalCustomerProvider } from '../localCustomerProvider.js';

const customers = [
  { customerCode: 'GT-001', customerName: 'Cliente Norte', country: 'Guatemala', customerType: 'Mayorista' },
  { customerCode: 'SV-002', customerName: 'Cliente Sur', country: 'El Salvador', customerType: 'Retail' },
  { customerCode: 'GT-003', customerName: 'Mercado Central', country: 'Guatemala', customerType: '' },
];

describe('localCustomerProvider temporal', () => {
  it('usa por defecto los fixtures locales con el contrato Customer completo', async () => {
    const provider = createLocalCustomerProvider();

    await expect(provider.searchCustomersByCode('LOCAL-004')).resolves.toEqual([
      LOCAL_CUSTOMER_FIXTURES[3],
    ]);
    expect(LOCAL_CUSTOMER_FIXTURES).toHaveLength(5);
    expect(LOCAL_CUSTOMER_FIXTURES.map(({ customerType }) => customerType)).toEqual([
      'Enterprise',
      'Premium',
      'Pro',
      'Regular',
      'Premium',
    ]);
  });

  it('busca por código sin distinguir mayúsculas', async () => {
    const provider = createLocalCustomerProvider({ customers });

    await expect(provider.searchCustomersByCode('gt-')).resolves.toEqual([
      customers[0],
      customers[2],
    ]);
  });

  it('busca por nombre de forma parcial', async () => {
    const provider = createLocalCustomerProvider({ customers });

    await expect(provider.searchCustomersByName('sur')).resolves.toEqual([customers[1]]);
  });

  it('devuelve arreglo vacío para un cliente inexistente', async () => {
    const provider = createLocalCustomerProvider({ customers });

    await expect(provider.searchCustomersByCode('NO-EXISTE')).resolves.toEqual([]);
  });

  it('permite fixtures incompletos conservando campos vacíos', async () => {
    const provider = createLocalCustomerProvider({
      customers: [{ customerName: 'Cliente Incompleto' }],
    });

    await expect(provider.searchCustomersByName('incompleto')).resolves.toEqual([{
      customerCode: '',
      customerName: 'Cliente Incompleto',
      country: '',
      customerType: '',
    }]);
  });

  it('no ejecuta una búsqueda masiva cuando el término está vacío', async () => {
    const provider = createLocalCustomerProvider({ customers });

    await expect(provider.searchCustomersByName('   ')).resolves.toEqual([]);
  });
});
