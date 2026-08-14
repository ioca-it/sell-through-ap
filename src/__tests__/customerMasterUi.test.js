import { beforeEach, describe, expect, it, vi } from 'vitest';

const stateHarness = vi.hoisted(() => ({
  values: [],
  nextIndex: 0,
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    useState: (initialValue) => {
      const index = stateHarness.nextIndex++;
      if (!Object.prototype.hasOwnProperty.call(stateHarness.values, index)) {
        stateHarness.values[index] = typeof initialValue === 'function'
          ? initialValue()
          : initialValue;
      }

      const setter = (nextValue) => {
        stateHarness.values[index] = typeof nextValue === 'function'
          ? nextValue(stateHarness.values[index])
          : nextValue;
      };

      return [stateHarness.values[index], setter];
    },
  };
});

import App from '../App.jsx';

const customer = Object.freeze({
  customerCode: 'UI-001',
  customerName: 'Cliente UI',
  country: 'Guatemala',
  customerType: 'Mayorista',
});

const customerMasterService = {
  searchByCode: vi.fn(async () => [customer]),
  searchByName: vi.fn(async () => [customer]),
  selectCustomer: vi.fn((config, selectedCustomer) => ({
    ...config,
    codigoCliente: selectedCustomer.customerCode,
    nombreCliente: selectedCustomer.customerName,
    pais: selectedCustomer.country,
    customerType: selectedCustomer.customerType,
  })),
};

const findElement = (node, predicate) => {
  if (node === null || node === undefined || typeof node === 'boolean') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElement(child, predicate);
      if (match) return match;
    }
    return null;
  }
  if (typeof node !== 'object' || !node.props) return null;
  if (predicate(node)) return node;
  return findElement(node.props.children, predicate);
};

const textContent = (node) => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textContent).join('');
  return node.props ? textContent(node.props.children) : '';
};

const renderApp = () => {
  stateHarness.nextIndex = 0;
  return App({ customerMasterService });
};

const findInput = (tree, controls) => findElement(
  tree,
  (node) => node.type === 'input' && node.props['aria-controls'] === controls,
);

const selectFirstResult = async (controls, searchValue) => {
  let tree = renderApp();
  findInput(tree, controls).props.onChange({ target: { value: searchValue } });
  await vi.waitFor(() => {
    tree = renderApp();
    expect(findElement(tree, (node) => node.props?.role === 'option')).not.toBeNull();
  });
  findElement(tree, (node) => node.props?.role === 'option').props.onClick();
  return renderApp();
};

const createDeferred = () => {
  let resolve;
  const promise = new Promise((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
};

beforeEach(() => {
  stateHarness.values = [];
  customerMasterService.searchByCode.mockClear();
  customerMasterService.searchByName.mockClear();
  customerMasterService.selectCustomer.mockClear();
});

describe('Maestro Cliente en Configuración', () => {
  it('seleccionar desde Código sincroniza Nombre y carga País', async () => {
    const tree = await selectFirstResult('customer-code-options', 'UI-');

    expect(findInput(tree, 'customer-code-options').props.value).toBe('UI-001');
    expect(findInput(tree, 'customer-name-options').props.value).toBe('Cliente UI');
    expect(findElement(tree, (node) => (
      node.type === 'input' && node.props.readOnly === true
    )).props.value).toBe('Guatemala');
    expect(findElement(tree, (node) => (
      node.type === 'input' && node.props['aria-label'] === 'Tipo de cliente'
    )).props.value).toBe('Mayorista');
    expect(customerMasterService.searchByCode).toHaveBeenCalledWith('UI-');
  });

  it('seleccionar desde Nombre sincroniza Código y carga País', async () => {
    const tree = await selectFirstResult('customer-name-options', 'Cliente');

    expect(findInput(tree, 'customer-name-options').props.value).toBe('Cliente UI');
    expect(findInput(tree, 'customer-code-options').props.value).toBe('UI-001');
    expect(customerMasterService.searchByName).toHaveBeenCalledWith('Cliente');
    expect(customerMasterService.selectCustomer).toHaveBeenCalledWith(
      expect.any(Object),
      customer,
    );
  });

  it('muestra loading mientras la búsqueda está pendiente', () => {
    customerMasterService.searchByCode.mockImplementationOnce(() => new Promise(() => {}));
    let tree = renderApp();

    findInput(tree, 'customer-code-options').props.onChange({ target: { value: 'UI' } });
    tree = renderApp();

    expect(textContent(tree)).toContain('Buscando clientes…');
  });

  it('muestra un estado controlado cuando no hay resultados', async () => {
    customerMasterService.searchByName.mockResolvedValueOnce([]);
    let tree = renderApp();
    findInput(tree, 'customer-name-options').props.onChange({ target: { value: 'Ausente' } });

    await vi.waitFor(() => {
      tree = renderApp();
      expect(textContent(tree)).toContain('No se encontraron clientes.');
    });
  });

  it('limpia la selección anterior ante cero resultados y permite seguir buscando', async () => {
    let tree = await selectFirstResult('customer-code-options', 'UI-');
    customerMasterService.searchByName.mockResolvedValueOnce([]);

    findInput(tree, 'customer-name-options').props.onChange({
      target: { value: 'Ausente' },
    });

    await vi.waitFor(() => {
      tree = renderApp();
      expect(textContent(tree)).toContain('No se encontraron clientes.');
    });
    expect(findInput(tree, 'customer-code-options').props.value).toBe('');
    expect(findInput(tree, 'customer-name-options').props.value).toBe('Ausente');
    expect(findElement(tree, (node) => (
      node.type === 'input' && node.props['aria-label'] === 'Tipo de cliente'
    )).props.value).toBe('');

    findInput(tree, 'customer-name-options').props.onChange({
      target: { value: 'Cliente' },
    });
    await vi.waitFor(() => {
      tree = renderApp();
      expect(findElement(tree, (node) => node.props?.role === 'option')).not.toBeNull();
    });
  });

  it('mantiene customerType vacío cuando la selección no tiene mapping real', async () => {
    customerMasterService.searchByCode.mockResolvedValueOnce([{
      ...customer,
      customerType: '',
    }]);

    const tree = await selectFirstResult('customer-code-options', 'UI-');

    expect(findElement(tree, (node) => (
      node.type === 'input' && node.props['aria-label'] === 'Tipo de cliente'
    )).props.value).toBe('');
  });

  it('no consulta el servicio con un término vacío', () => {
    const tree = renderApp();

    findInput(tree, 'customer-code-options').props.onChange({ target: { value: '   ' } });

    expect(customerMasterService.searchByCode).not.toHaveBeenCalled();
  });

  it('no duplica una solicitud idéntica mientras continúa pendiente', () => {
    customerMasterService.searchByCode.mockImplementation(() => new Promise(() => {}));
    let tree = renderApp();

    findInput(tree, 'customer-code-options').props.onChange({ target: { value: 'UI' } });
    tree = renderApp();
    findInput(tree, 'customer-code-options').props.onChange({ target: { value: 'UI' } });

    expect(customerMasterService.searchByCode).toHaveBeenCalledTimes(1);
  });

  it('ignora una respuesta obsoleta incluso si otra búsqueda ya terminó', async () => {
    const oldRequest = createDeferred();
    const currentRequest = createDeferred();
    const obsoleteCustomer = {
      customerCode: 'OLD-001',
      customerName: 'Cliente Obsoleto',
      country: 'Guatemala',
      customerType: '',
    };
    customerMasterService.searchByCode
      .mockImplementationOnce(() => oldRequest.promise)
      .mockImplementationOnce(() => currentRequest.promise);
    let tree = renderApp();

    findInput(tree, 'customer-code-options').props.onChange({ target: { value: 'OLD' } });
    tree = renderApp();
    findInput(tree, 'customer-code-options').props.onChange({ target: { value: 'UI' } });
    currentRequest.resolve([customer]);

    await vi.waitFor(() => {
      tree = renderApp();
      expect(textContent(tree)).toContain('Cliente UI');
    });
    oldRequest.resolve([obsoleteCustomer]);
    await Promise.resolve();
    tree = renderApp();

    expect(textContent(tree)).toContain('Cliente UI');
    expect(textContent(tree)).not.toContain('Cliente Obsoleto');
  });

  it('orienta a iniciar sesión sin intentar mostrar detalles sensibles', async () => {
    customerMasterService.searchByCode.mockRejectedValueOnce(Object.assign(
      new Error('JWT y URL interna sensibles'),
      { code: 'CUSTOMER_SESSION_REQUIRED' },
    ));
    let tree = renderApp();

    findInput(tree, 'customer-code-options').props.onChange({ target: { value: 'UI' } });

    await vi.waitFor(() => {
      tree = renderApp();
      expect(textContent(tree)).toContain(
        'Inicia sesión para consultar el Maestro Cliente.',
      );
    });
    expect(textContent(tree)).not.toContain('JWT');
    expect(textContent(tree)).not.toContain('URL interna');
  });

  it('oculta mensajes técnicos cuando la API falla', async () => {
    customerMasterService.searchByCode.mockRejectedValueOnce(
      new Error('access_token y detalle técnico Dataverse'),
    );
    let tree = renderApp();
    findInput(tree, 'customer-code-options').props.onChange({ target: { value: 'ERROR' } });

    await vi.waitFor(() => {
      tree = renderApp();
      expect(textContent(tree)).toContain(
        'No fue posible consultar clientes. Intenta nuevamente.',
      );
    });
    expect(textContent(tree)).not.toContain('access_token');
    expect(textContent(tree)).not.toContain('Dataverse');
  });
});
