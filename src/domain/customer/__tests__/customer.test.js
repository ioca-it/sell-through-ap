import { describe, expect, it } from 'vitest';
import { isCustomer, normalizeCustomer } from '../customer.js';

describe('Customer normalizado', () => {
  it('expone únicamente el contrato mínimo con textos normalizados', () => {
    expect(normalizeCustomer({
      customerCode: ' C-001 ',
      customerName: ' Cliente Uno ',
      country: ' Guatemala ',
      customerType: ' Mayorista ',
      dataverseInternalId: 'no-debe-salir',
    })).toEqual({
      customerCode: 'C-001',
      customerName: 'Cliente Uno',
      country: 'Guatemala',
      customerType: 'Mayorista',
    });
  });

  it('normaliza datos incompletos sin inventar valores', () => {
    expect(normalizeCustomer({ customerCode: 'C-002' })).toEqual({
      customerCode: 'C-002',
      customerName: '',
      country: '',
      customerType: '',
    });
  });

  it('reconoce solo objetos con los cuatro campos normalizados', () => {
    expect(isCustomer(normalizeCustomer({}))).toBe(true);
    expect(isCustomer({
      customerCode: 'C-001', customerName: 'Cliente', country: 'Guatemala',
    })).toBe(false);
  });
});
