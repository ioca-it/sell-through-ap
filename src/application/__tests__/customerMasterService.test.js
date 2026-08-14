import { describe, expect, it, vi } from 'vitest';
import {
  applyCustomerSelection,
  createCustomerMasterService,
  getCustomerSearchErrorMessage,
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

  it('mantiene customerType vacío cuando el campo real aún no está disponible', () => {
    expect(applyCustomerSelection({}, {
      customerCode: 'C-002',
      customerName: 'Cliente Dos',
      country: 'Guatemala',
    })).toMatchObject({ customerType: '' });
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

  it.each([
    ['CUSTOMER_SESSION_REQUIRED', 'Inicia sesión para consultar el Maestro Cliente.'],
    ['CUSTOMER_AUTHENTICATION_REQUIRED', 'Tu sesión no es válida. Inicia sesión nuevamente.'],
    ['CUSTOMER_AUTHORIZATION_DENIED', 'Tu cuenta no tiene permisos para consultar el Maestro Cliente.'],
    ['CUSTOMER_RATE_LIMITED', 'Hay demasiadas consultas. Espera un momento e intenta nuevamente.'],
    ['CUSTOMER_SERVICE_UNAVAILABLE', 'El Maestro Cliente no está disponible temporalmente. Intenta nuevamente.'],
    ['CUSTOMER_NETWORK_ERROR', 'No fue posible conectar con el Maestro Cliente. Revisa tu conexión e intenta nuevamente.'],
    ['CUSTOMER_REQUEST_TIMEOUT', 'La consulta tardó demasiado. Intenta nuevamente.'],
  ])('traduce %s a un mensaje seguro para UI', (code, expectedMessage) => {
    expect(getCustomerSearchErrorMessage({
      code,
      message: 'token, URL y stack sensibles',
    })).toBe(expectedMessage);
  });

  it('oculta detalles de errores desconocidos', () => {
    expect(getCustomerSearchErrorMessage(
      new Error('token, URL y stack sensibles'),
    )).toBe('No fue posible consultar clientes. Intenta nuevamente.');
  });
});
