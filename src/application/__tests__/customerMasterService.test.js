import { describe, expect, it, vi } from 'vitest';
import {
  applyCustomerSelection,
  createCustomerMasterService,
} from '../customerMasterService.js';

const customer = {
  customerCode: 'C-001',
  customerName: 'Cliente Uno',
  country: 'Guatemala',
  customerType: 'Mayorista',
};

describe('customerMasterService', () => {
  it('mantiene código y nombre sincronizados desde una única selección', () => {
    expect(applyCustomerSelection({
      codigoCliente: 'anterior',
      nombreCliente: 'anterior',
      pais: 'anterior',
      customerType: 'anterior',
      periodoAnalizado: 'Mensual',
    }, customer)).toEqual({
      codigoCliente: 'C-001',
      nombreCliente: 'Cliente Uno',
      pais: 'Guatemala',
      customerType: 'Mayorista',
      periodoAnalizado: 'Mensual',
    });
  });

  it('carga código, nombre, país y tipo al seleccionar por cualquiera de los combobox', () => {
    expect(applyCustomerSelection({}, customer)).toMatchObject({
      codigoCliente: customer.customerCode,
      nombreCliente: customer.customerName,
      pais: customer.country,
      customerType: customer.customerType,
    });
  });

  it('conserva el resto de la configuración para no alterar el flujo actual', () => {
    const config = {
      fechaCorte: '2026-08-10',
      safetyStockSemanas: 4,
      leadTimeUSA: 4,
      leadTimeCHINA: 12,
    };

    expect(applyCustomerSelection(config, customer)).toMatchObject(config);
    expect(config).toEqual({
      fechaCorte: '2026-08-10',
      safetyStockSemanas: 4,
      leadTimeUSA: 4,
      leadTimeCHINA: 12,
    });
  });

  it('orquesta búsquedas por código y nombre mediante Repository', async () => {
    const repository = {
      searchByCode: vi.fn(async () => [customer]),
      searchByName: vi.fn(async () => [customer]),
    };
    const service = createCustomerMasterService({ repository });

    await expect(service.searchByCode('C-')).resolves.toEqual([customer]);
    await expect(service.searchByName('Uno')).resolves.toEqual([customer]);
    expect(repository.searchByCode).toHaveBeenCalledWith('C-');
    expect(repository.searchByName).toHaveBeenCalledWith('Uno');
  });
});
