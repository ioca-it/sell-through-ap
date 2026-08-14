import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAccountCustomerGateway,
  CUSTOMER_SEARCH_LIMIT,
  mapAccountToCustomer,
} from '../src/integrations/dataverse/accountCustomerGateway.js';
import { escapeODataString } from '../src/integrations/dataverse/odata.js';

const CUSTOMER_BASE_FILTER = 'customertypecode eq 3 and statecode eq 0 and crbbe_estadodelcliente eq 4';
const FORMATTED_VALUE_ANNOTATION = 'OData.Community.Display.V1.FormattedValue';
const CUSTOMER_TYPE_FORMATTED_VALUE_PROPERTY =
  `new_tipocliente@${FORMATTED_VALUE_ANNOTATION}`;

const rawAccount = {
  new_codigocliente: ' C-001 ',
  name: ' Cliente Uno ',
  crbbe_nombrepais: ' Guatemala ',
  new_tipocliente: 100000000,
  [CUSTOMER_TYPE_FORMATTED_VALUE_PROPERTY]: ' Distribuidor ',
  accountid: 'internal-id',
};

const createGateway = (rows = [rawAccount]) => {
  const calls = [];
  const dataverseClient = {
    retrieveMultiple: async (query) => {
      calls.push(query);
      return rows;
    },
  };
  return { gateway: createAccountCustomerGateway({ dataverseClient }), calls };
};

test('mapea accounts al contrato Customer sin filtrar nombres lógicos', () => {
  const customer = mapAccountToCustomer(rawAccount);
  assert.deepEqual(customer, {
    customerCode: 'C-001',
    customerName: 'Cliente Uno',
    country: 'Guatemala',
    customerType: 'Distribuidor',
  });
  assert.deepEqual(
    Object.keys(customer),
    ['customerCode', 'customerName', 'country', 'customerType'],
  );
});

test('normaliza y recorta la etiqueta formatted de customerType', () => {
  assert.equal(mapAccountToCustomer(rawAccount).customerType, 'Distribuidor');
});

test('usa fallback vacío cuando la etiqueta formatted está ausente, null o undefined', () => {
  for (const formattedValue of [null, undefined]) {
    const account = { ...rawAccount };
    if (formattedValue === undefined) {
      delete account[CUSTOMER_TYPE_FORMATTED_VALUE_PROPERTY];
    } else {
      account[CUSTOMER_TYPE_FORMATTED_VALUE_PROPERTY] = formattedValue;
    }
    const customer = mapAccountToCustomer(account);
    assert.deepEqual(customer, {
      customerCode: 'C-001',
      customerName: 'Cliente Uno',
      country: 'Guatemala',
      customerType: '',
    });
    assert.equal(Object.hasOwn(customer, 'new_tipocliente'), false);
    assert.equal(Object.hasOwn(customer, CUSTOMER_TYPE_FORMATTED_VALUE_PROPERTY), false);
    assert.notEqual(customer.customerType, String(account.new_tipocliente));
  }
});

test('busca por código solamente en accounts y con select limitado', async () => {
  const { gateway, calls } = createGateway();

  assert.deepEqual(await gateway.searchByCode('C-'), [
    {
      customerCode: 'C-001',
      customerName: 'Cliente Uno',
      country: 'Guatemala',
      customerType: 'Distribuidor',
    },
  ]);
  assert.deepEqual(calls[0], {
    entitySet: 'accounts',
    select: ['new_codigocliente', 'name', 'crbbe_nombrepais', 'new_tipocliente'],
    filter: `contains(new_codigocliente,'C-') and ${CUSTOMER_BASE_FILTER}`,
    orderBy: 'new_codigocliente asc',
    top: CUSTOMER_SEARCH_LIMIT,
    includeAnnotations: [FORMATTED_VALUE_ANNOTATION],
  });
});

test('busca por nombre con orden interno controlado', async () => {
  const { gateway, calls } = createGateway();

  assert.equal((await gateway.searchByName('Uno'))[0].customerType, 'Distribuidor');
  assert.deepEqual(
    calls[0].select,
    ['new_codigocliente', 'name', 'crbbe_nombrepais', 'new_tipocliente'],
  );
  assert.equal(calls[0].filter, `contains(name,'Uno') and ${CUSTOMER_BASE_FILTER}`);
  assert.equal(calls[0].orderBy, 'name asc');
  assert.deepEqual(calls[0].includeAnnotations, [FORMATTED_VALUE_ANNOTATION]);
});

test('escapa comillas simples en valores OData', async () => {
  assert.equal(escapeODataString("O'Brien"), "O''Brien");
  const { gateway, calls } = createGateway([]);

  await gateway.searchByName("O'Brien");
  assert.equal(
    calls[0].filter,
    `contains(name,'O''Brien') and ${CUSTOMER_BASE_FILTER}`,
  );
});

test('limita resultados aunque la fuente devuelva más registros', async () => {
  const rows = Array.from({ length: CUSTOMER_SEARCH_LIMIT + 5 }, (_, index) => ({
    new_codigocliente: `C-${index}`,
    name: `Cliente ${index}`,
    crbbe_nombrepais: 'Guatemala',
  }));
  const { gateway } = createGateway(rows);

  assert.equal((await gateway.searchByCode('C-')).length, CUSTOMER_SEARCH_LIMIT);
});

test('lee un cliente por código exacto y devuelve null si no existe', async () => {
  const found = createGateway();
  assert.deepEqual(await found.gateway.getByCode("C'001"), {
    customerCode: 'C-001',
    customerName: 'Cliente Uno',
    country: 'Guatemala',
    customerType: 'Distribuidor',
  });
  assert.deepEqual(found.calls[0], {
    entitySet: 'accounts',
    select: ['new_codigocliente', 'name', 'crbbe_nombrepais', 'new_tipocliente'],
    filter: `new_codigocliente eq 'C''001' and ${CUSTOMER_BASE_FILTER}`,
    orderBy: 'name asc',
    top: 1,
    includeAnnotations: [FORMATTED_VALUE_ANNOTATION],
  });

  const missing = createGateway([]);
  assert.equal(await missing.gateway.getByCode('NO-EXISTE'), null);
});

test('impide reintroducir los nombres lógicos de filtro inválidos', async () => {
  const { gateway, calls } = createGateway([]);

  await gateway.searchByCode('C-001');
  await gateway.searchByName('Cliente Uno');
  await gateway.getByCode('C-001');

  for (const { filter } of calls) {
    assert.doesNotMatch(filter, /\bcustomertype\s+eq\b/);
    assert.doesNotMatch(filter, /\bcrbbe_estadocliente\s+eq\b/);
    assert.match(filter, /\bcustomertypecode eq 3\b/);
    assert.match(filter, /\bstatecode eq 0\b/);
    assert.match(filter, /\bcrbbe_estadodelcliente eq 4\b/);
  }
});
