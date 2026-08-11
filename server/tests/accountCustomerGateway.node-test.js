import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAccountCustomerGateway,
  CUSTOMER_SEARCH_LIMIT,
  mapAccountToCustomer,
} from '../src/integrations/dataverse/accountCustomerGateway.js';
import { escapeODataString } from '../src/integrations/dataverse/odata.js';

const rawAccount = {
  new_codigocliente: ' C-001 ',
  name: ' Cliente Uno ',
  crbbe_nombrepais: ' Guatemala ',
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
  assert.deepEqual(mapAccountToCustomer(rawAccount), {
    customerCode: 'C-001',
    customerName: 'Cliente Uno',
    country: 'Guatemala',
  });
});

test('busca por código solamente en accounts y con select limitado', async () => {
  const { gateway, calls } = createGateway();

  assert.deepEqual(await gateway.searchByCode('C-'), [
    { customerCode: 'C-001', customerName: 'Cliente Uno', country: 'Guatemala' },
  ]);
  assert.deepEqual(calls[0], {
    entitySet: 'accounts',
    select: ['new_codigocliente', 'name', 'crbbe_nombrepais'],
    filter: "contains(new_codigocliente,'C-')",
    orderBy: 'new_codigocliente asc',
    top: CUSTOMER_SEARCH_LIMIT,
  });
});

test('busca por nombre con orden interno controlado', async () => {
  const { gateway, calls } = createGateway();

  await gateway.searchByName('Uno');
  assert.equal(calls[0].filter, "contains(name,'Uno')");
  assert.equal(calls[0].orderBy, 'name asc');
});

test('escapa comillas simples en valores OData', async () => {
  assert.equal(escapeODataString("O'Brien"), "O''Brien");
  const { gateway, calls } = createGateway([]);

  await gateway.searchByName("O'Brien");
  assert.equal(calls[0].filter, "contains(name,'O''Brien')");
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
  });
  assert.equal(found.calls[0].filter, "new_codigocliente eq 'C''001'");
  assert.equal(found.calls[0].top, 1);

  const missing = createGateway([]);
  assert.equal(await missing.gateway.getByCode('NO-EXISTE'), null);
});
