import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAccountCustomerGateway,
  CUSTOMER_SEARCH_LIMIT,
  mapAccountToCustomer,
} from '../src/integrations/dataverse/accountCustomerGateway.js';
import { DataverseRequestError } from '../src/integrations/dataverse/dataverseClient.js';
import { DATAVERSE_DIAGNOSTIC_IDS } from '../src/integrations/dataverse/dataverseDiagnostics.js';
import { escapeODataString } from '../src/integrations/dataverse/odata.js';

const CUSTOMER_BASE_FILTER = 'customertype eq 3 and statecode eq 0 and crbbe_estadocliente eq 4';

const rawAccount = {
  new_codigocliente: ' C-001 ',
  name: ' Cliente Uno ',
  crbbe_nombrepais: ' Guatemala ',
  new_tipocliente: ' Distribuidor ',
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
    customerType: 'Distribuidor',
  });
});

test('normaliza customerType null o undefined sin exponer el nombre lógico', () => {
  for (const new_tipocliente of [null, undefined]) {
    const customer = mapAccountToCustomer({ ...rawAccount, new_tipocliente });
    assert.deepEqual(customer, {
      customerCode: 'C-001',
      customerName: 'Cliente Uno',
      country: 'Guatemala',
      customerType: '',
    });
    assert.equal(Object.hasOwn(customer, 'new_tipocliente'), false);
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
  });
});

test('busca por nombre con orden interno controlado', async () => {
  const { gateway, calls } = createGateway();

  await gateway.searchByName('Uno');
  assert.deepEqual(
    calls[0].select,
    ['new_codigocliente', 'name', 'crbbe_nombrepais', 'new_tipocliente'],
  );
  assert.equal(calls[0].filter, `contains(name,'Uno') and ${CUSTOMER_BASE_FILTER}`);
  assert.equal(calls[0].orderBy, 'name asc');
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
  });

  const missing = createGateway([]);
  assert.equal(await missing.gateway.getByCode('NO-EXISTE'), null);
});

test('activa una sola secuencia backend ante campo/filtro inválido y preserva el error', async () => {
  const events = [];
  let probeCount = 0;
  const originalError = new DataverseRequestError(
    undefined,
    DATAVERSE_DIAGNOSTIC_IDS.INVALID_FIELD_OR_FILTER,
  );
  const gateway = createAccountCustomerGateway({
    dataverseClient: {
      retrieveMultiple: async () => { throw originalError; },
      probeRetrieveMultiple: async () => {
        probeCount += 1;
        return true;
      },
    },
    diagnosticLogger: (event) => events.push(event),
  });

  await assert.rejects(gateway.searchByCode('sensitive-customer-value'), (error) => (
    error === originalError
      && error.code === 'DATAVERSE_REQUEST_FAILED'
      && error.statusCode === 502
  ));
  assert.equal(probeCount, 15);
  assert.equal(events.length, 15);

  await assert.rejects(gateway.searchByCode('another-sensitive-value'));
  assert.equal(probeCount, 15);
  assert.equal(events.length, 15);
  assert.doesNotMatch(
    JSON.stringify(events),
    /sensitive-customer-value|another-sensitive-value|\$filter|contains\(/,
  );
});
