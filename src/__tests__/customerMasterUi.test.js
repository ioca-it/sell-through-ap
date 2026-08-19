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
import { createProductMasterService } from '../application/productMasterService.js';
import { createProductProvider } from '../providers/productProviderFactory.js';
import { createProductRepository } from '../repositories/productRepository.js';

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

const productMasterService = {
  loadBrands: vi.fn(async () => ['ANKER', 'SKULLCANDY']),
  loadProducts: vi.fn(async () => []),
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

const findElements = (node, predicate, matches = []) => {
  if (node === null || node === undefined || typeof node === 'boolean') return matches;
  if (Array.isArray(node)) {
    node.forEach((child) => findElements(child, predicate, matches));
    return matches;
  }
  if (typeof node !== 'object' || !node.props) return matches;
  if (predicate(node)) matches.push(node);
  findElements(node.props.children, predicate, matches);
  return matches;
};

const textContent = (node) => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textContent).join('');
  return node.props ? textContent(node.props.children) : '';
};

const renderApp = (overrides = {}) => {
  stateHarness.nextIndex = 0;
  return App({ customerMasterService, productMasterService, ...overrides });
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
  productMasterService.loadBrands.mockReset();
  productMasterService.loadBrands.mockResolvedValue(['ANKER', 'SKULLCANDY']);
  productMasterService.loadProducts.mockReset();
  productMasterService.loadProducts.mockResolvedValue([]);
});

describe('Carga de Información simplificada', () => {
  const openDataLoad = () => {
    let tree = renderApp();
    findElement(tree, (node) => node.type === 'button'
      && textContent(node).includes('Carga de Información')).props.onClick();
    tree = renderApp();
    return tree;
  };

  it('oculta la carga manual Product, centra Inventario y conserva ejemplo y parsing', async () => {
    let tree = openDataLoad();
    const textareas = findElements(tree, (node) => node.type === 'textarea');
    const inventoryBlock = findElement(
      tree,
      (node) => node.type === 'div'
        && node.props.className?.includes('max-w-5xl')
        && textContent(node).includes('1. Inventario del Cliente'),
    );

    expect(textContent(tree)).not.toContain('Maestro de Productos IOCA');
    expect(textContent(tree)).not.toContain('Pega aquí el Maestro');
    expect(textContent(tree)).toContain('1. Inventario del Cliente');
    expect(textContent(tree)).toContain('Product Master Dataverse');
    expect(textareas).toHaveLength(1);
    expect(inventoryBlock.props.className).toContain('w-full');
    expect(textareas[0].props.placeholder).toBe('Pega aquí el inventario del cliente...');

    textareas[0].props.onChange({ target: { value: 'SKU\tINV FINAL\nMANUAL-1\t2' } });
    tree = renderApp();
    expect(findElement(tree, (node) => node.type === 'textarea').props.value)
      .toContain('MANUAL-1');

    findElement(tree, (node) => node.type === 'button'
      && textContent(node).includes('Cargar ejemplo')).props.onClick();
    tree = renderApp();
    expect(findElement(tree, (node) => node.type === 'textarea').props.value.trim()).not.toBe('');
    const calculate = findElement(tree, (node) => node.type === 'button'
      && textContent(node).includes('Calcular y ver dashboard'));
    expect(calculate.props.disabled).toBe(false);

    await calculate.props.onClick();
    tree = renderApp();
    expect(textContent(tree)).toContain('Executive Dashboard');
  });
});

describe('Pre-filtro Marca en Configuración', () => {
  const renderDataverseApp = () => renderApp({ productSource: 'dataverse' });
  const brandInput = (tree) => findInput(tree, 'product-brand-options');
  const brandOption = (tree, brand) => findElement(
    tree,
    (node) => node.props?.role === 'option' && textContent(node) === brand,
  );

  const loadBrandOptions = async () => {
    let tree = renderDataverseApp();
    brandInput(tree).props.onFocus();
    await vi.waitFor(() => {
      tree = renderDataverseApp();
      expect(brandOption(tree, 'ANKER')).not.toBeNull();
    });
    return tree;
  };

  it('muestra el ComboBox Marca y su loading sin duplicar la carga pendiente', () => {
    productMasterService.loadBrands.mockImplementation(() => new Promise(() => {}));
    let tree = renderDataverseApp();
    const input = brandInput(tree);

    input.props.onFocus();
    tree = renderDataverseApp();
    brandInput(tree).props.onFocus();

    expect(textContent(tree)).toContain('Cargando marcas…');
    expect(productMasterService.loadBrands).toHaveBeenCalledTimes(1);
  });

  it('carga, busca y selecciona una marca explícitamente', async () => {
    let tree = await loadBrandOptions();
    brandInput(tree).props.onChange({ target: { value: 'skull' } });
    tree = renderDataverseApp();

    expect(brandOption(tree, 'SKULLCANDY')).not.toBeNull();
    expect(brandOption(tree, 'ANKER')).toBeNull();
    brandOption(tree, 'SKULLCANDY').props.onClick();
    tree = renderDataverseApp();

    expect(brandInput(tree).props.value).toBe('SKULLCANDY');
    expect(textContent(tree)).toContain('Marca seleccionada: SKULLCANDY');
    expect(productMasterService.loadProducts).toHaveBeenCalledWith({ brand: 'SKULLCANDY' });
  });

  it('permite selección por teclado', async () => {
    let tree = await loadBrandOptions();
    brandInput(tree).props.onKeyDown({ key: 'ArrowDown', preventDefault: vi.fn() });
    tree = renderDataverseApp();
    brandInput(tree).props.onKeyDown({ key: 'Enter', preventDefault: vi.fn() });
    tree = renderDataverseApp();

    expect(brandInput(tree).props.value).toBe('ANKER');
  });

  it('muestra cero resultados y errores sanitizados', async () => {
    productMasterService.loadBrands.mockResolvedValueOnce([]);
    let tree = renderDataverseApp();
    brandInput(tree).props.onFocus();
    await vi.waitFor(() => {
      tree = renderDataverseApp();
      expect(textContent(tree)).toContain('No se encontraron marcas.');
    });

    stateHarness.values = [];
    productMasterService.loadBrands.mockRejectedValueOnce(Object.assign(
      new Error('URL Dataverse y token sensibles'),
      { code: 'PRODUCT_SESSION_REQUIRED' },
    ));
    tree = renderDataverseApp();
    brandInput(tree).props.onFocus();
    await vi.waitFor(() => {
      tree = renderDataverseApp();
      expect(textContent(tree)).toContain('Inicia sesión para consultar el Maestro Producto.');
    });
    expect(textContent(tree)).not.toMatch(/URL Dataverse|token sensibles/);
  });

  it('sin marca no carga Product Master Dataverse', async () => {
    let tree = renderDataverseApp();
    findElement(tree, (node) => node.type === 'button'
      && textContent(node).includes('Carga de Información')).props.onClick();
    tree = renderDataverseApp();
    const calculate = findElement(tree, (node) => node.type === 'button'
      && textContent(node).includes('Calcular y ver dashboard'));
    await calculate.props.onClick();
    tree = renderDataverseApp();

    expect(productMasterService.loadProducts).not.toHaveBeenCalled();
    expect(textContent(tree)).toContain(
      'Selecciona una marca antes de cargar el Maestro Producto.',
    );
  });

  it('pasa solo brand funcional y usa exclusivamente la nueva selección al cambiar', async () => {
    let tree = await loadBrandOptions();
    brandOption(tree, 'ANKER').props.onClick();
    tree = renderDataverseApp();
    findElement(tree, (node) => node.type === 'button'
      && textContent(node).includes('Carga de Información')).props.onClick();
    tree = renderDataverseApp();
    await findElement(tree, (node) => node.type === 'button'
      && textContent(node).includes('Calcular y ver dashboard')).props.onClick();

    tree = renderDataverseApp();
    findElement(tree, (node) => node.type === 'button'
      && textContent(node).includes('Configuración')).props.onClick();
    tree = renderDataverseApp();
    brandInput(tree).props.onChange({ target: { value: 'SKULL' } });
    tree = renderDataverseApp();
    brandOption(tree, 'SKULLCANDY').props.onClick();
    tree = renderDataverseApp();
    findElement(tree, (node) => node.type === 'button'
      && textContent(node).includes('Carga de Información')).props.onClick();
    tree = renderDataverseApp();
    await findElement(tree, (node) => node.type === 'button'
      && textContent(node).includes('Calcular y ver dashboard')).props.onClick();

    expect(productMasterService.loadProducts.mock.calls).toEqual([
      [{ brand: 'ANKER' }],
      [{ brand: 'SKULLCANDY' }],
    ]);
    expect(JSON.stringify(productMasterService.loadProducts.mock.calls)).not.toMatch(
      /\$filter|\$select|crbbe_/,
    );
  });

  it('invalida A inmediatamente e ignora su respuesta si B ya fue seleccionada', async () => {
    const brandA = createDeferred();
    const brandB = createDeferred();
    productMasterService.loadProducts.mockImplementation(({ brand }) => (
      brand === 'ANKER' ? brandA.promise : brandB.promise
    ));
    let tree = await loadBrandOptions();

    brandOption(tree, 'ANKER').props.onClick();
    tree = renderDataverseApp();
    expect(textContent(tree)).toContain('Cargando Maestro Producto');

    brandInput(tree).props.onChange({ target: { value: 'SKULL' } });
    tree = renderDataverseApp();
    brandOption(tree, 'SKULLCANDY').props.onClick();
    tree = renderDataverseApp();
    expect(productMasterService.loadProducts.mock.calls).toEqual([
      [{ brand: 'ANKER' }],
      [{ brand: 'SKULLCANDY' }],
    ]);

    brandA.resolve([{ sku: 'A-1' }]);
    await Promise.resolve();
    tree = renderDataverseApp();
    expect(textContent(tree)).toContain('Cargando Maestro Producto');
    expect(textContent(tree)).not.toContain('Maestro Producto listo');

    brandB.resolve([{ sku: 'B-1' }]);
    await vi.waitFor(() => {
      tree = renderDataverseApp();
      expect(textContent(tree)).toContain('Maestro Producto listo');
    });
    expect(brandInput(tree).props.value).toBe('SKULLCANDY');
  });

  it('cambiar de marca elimina imageUrl/productUrl anteriores antes de aceptar el nuevo dataset', async () => {
    const productsByBrand = {
      ANKER: [{
        sku: 'ANKER-1',
        imageUrl: 'https://images.example.test/anker-1.png',
        productUrl: 'https://products.example.test/anker-1',
      }],
      SKULLCANDY: [{
        sku: 'SKULL-1',
        imageUrl: 'https://images.example.test/skull-1.png',
        productUrl: 'https://products.example.test/skull-1',
      }],
    };
    productMasterService.loadProducts.mockImplementation(async ({ brand }) => productsByBrand[brand]);
    let tree = await loadBrandOptions();

    brandOption(tree, 'ANKER').props.onClick();
    await vi.waitFor(() => {
      tree = renderDataverseApp();
      expect(stateHarness.values[21]).toMatchObject({
        status: 'ready',
        brand: 'ANKER',
        products: productsByBrand.ANKER,
      });
    });

    brandInput(tree).props.onChange({ target: { value: 'SKULL' } });
    expect(stateHarness.values[21]).toMatchObject({ status: 'idle', brand: '', products: [] });
    expect(JSON.stringify(stateHarness.values[21])).not.toMatch(/anker-1/);

    tree = renderDataverseApp();
    brandOption(tree, 'SKULLCANDY').props.onClick();
    await vi.waitFor(() => {
      tree = renderDataverseApp();
      expect(stateHarness.values[21]).toMatchObject({
        status: 'ready',
        brand: 'SKULLCANDY',
        products: productsByBrand.SKULLCANDY,
      });
    });
    expect(JSON.stringify(stateHarness.values[21])).not.toMatch(/anker-1/);
  });

  it('recorre Factory Dataverse, Repository y Service hasta mostrar las 33 marcas', async () => {
    const brands = [
      ...Array.from({ length: 32 }, (_, index) => `MARCA-${String(index + 1).padStart(2, '0')}`),
      'SKULLCANDY',
    ];
    const fetchImpl = vi.fn(async (url) => ({
      ok: true,
      status: 200,
      json: async () => (
        url.pathname === '/api/products/brands' ? { brands } : { products: [] }
      ),
    }));
    const integratedProductService = createProductMasterService({
      repository: createProductRepository({
        provider: createProductProvider({
          source: 'dataverse',
          apiBaseUrl: 'https://backend.invalid',
          fetchImpl,
          getAccessToken: async () => 'delegated-token',
        }),
      }),
    });
    const renderIntegratedApp = () => renderApp({
      productSource: 'dataverse',
      productMasterService: integratedProductService,
    });
    let tree = renderIntegratedApp();

    brandInput(tree).props.onFocus();
    await vi.waitFor(() => {
      tree = renderIntegratedApp();
      expect(findElements(tree, (node) => node.props?.role === 'option')).toHaveLength(33);
    });
    expect(brandOption(tree, 'SKULLCANDY')).not.toBeNull();
    expect(fetchImpl.mock.calls[0][0].pathname).toBe('/api/products/brands');

    brandOption(tree, 'SKULLCANDY').props.onClick();
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(2));
    expect(fetchImpl.mock.calls[1][0].pathname).toBe('/api/products/master');
    expect(fetchImpl.mock.calls[1][0].searchParams.get('brand')).toBe('SKULLCANDY');
  });

  it('mantiene el flujo local de marcas disponible sin exigir la selección UI', async () => {
    let tree = renderApp({ productSource: 'local' });
    expect(brandInput(tree)).not.toBeNull();
    expect(textContent(tree)).toContain(
      'La selección se aplicará al Product Provider cuando corresponda.',
    );
    brandInput(tree).props.onFocus();
    await vi.waitFor(() => {
      tree = renderApp({ productSource: 'local' });
      expect(brandOption(tree, 'ANKER')).not.toBeNull();
    });
    brandOption(tree, 'ANKER').props.onClick();
    expect(productMasterService.loadProducts).not.toHaveBeenCalled();
  });
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
