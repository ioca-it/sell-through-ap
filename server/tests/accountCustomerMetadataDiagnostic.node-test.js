import test from 'node:test';
import assert from 'node:assert/strict';
import { createTemporaryAccountCustomerMetadataDiagnostic } from '../src/integrations/dataverse/accountCustomerMetadataDiagnostic.js';

test('registra sólo candidatos técnicos, tipo y opción objetivo 3/4', async () => {
  const optionCalls = [];
  const events = [];
  const diagnostic = createTemporaryAccountCustomerMetadataDiagnostic({
    dataverseClient: {
      retrieveEntityAttributeMetadata: async () => [
        {
          logicalName: 'customertypecode',
          schemaName: 'CustomerTypeCode',
          attributeType: 'Picklist',
          ignoredPayload: 'Sensitive Customer Name',
        },
        {
          logicalName: 'new_tipocliente',
          schemaName: 'new_TipoCliente',
          attributeType: 'String',
        },
        {
          logicalName: 'crbbe_estadodecliente',
          schemaName: 'crbbe_EstadoDeCliente',
          attributeType: 'Picklist',
        },
        {
          logicalName: 'statecode',
          schemaName: 'StateCode',
          attributeType: 'State',
        },
        {
          logicalName: 'telephone1',
          schemaName: 'Telephone1',
          attributeType: 'String',
        },
      ],
      retrieveRequiredOptionMetadata: async (query) => {
        optionCalls.push(query);
        return query.optionValue === 3
          ? { present: true, label: 'Customer' }
          : { present: true, label: 'Habilitado' };
      },
    },
    diagnosticLogger: (event) => events.push(event),
  });

  await diagnostic.run();
  await diagnostic.run();

  assert.deepEqual(optionCalls, [
    {
      entityLogicalName: 'account',
      attributeLogicalName: 'customertypecode',
      attributeType: 'Picklist',
      optionValue: 3,
    },
    {
      entityLogicalName: 'account',
      attributeLogicalName: 'crbbe_estadodecliente',
      attributeType: 'Picklist',
      optionValue: 4,
    },
  ]);
  assert.deepEqual(events, [
    {
      component: 'AccountCustomerMetadataDiagnostic',
      diagnosticId: 'PHASE1_024_ACCOUNT_ATTRIBUTE_METADATA',
      rule: 'customer_classification_eq_3',
      logicalName: 'customertypecode',
      schemaName: 'CustomerTypeCode',
      attributeType: 'Picklist',
      optionValue: 3,
      optionPresent: true,
      result: 'CANDIDATE',
      optionLabel: 'Customer',
    },
    {
      component: 'AccountCustomerMetadataDiagnostic',
      diagnosticId: 'PHASE1_024_ACCOUNT_ATTRIBUTE_METADATA',
      rule: 'customer_status_eq_4',
      logicalName: 'crbbe_estadodecliente',
      schemaName: 'crbbe_EstadoDeCliente',
      attributeType: 'Picklist',
      optionValue: 4,
      optionPresent: true,
      result: 'CANDIDATE',
      optionLabel: 'Habilitado',
    },
  ]);
  assert.doesNotMatch(
    JSON.stringify(events),
    /Sensitive Customer Name|new_tipocliente|statecode|telephone1|Authorization|Bearer|token|https:\/\/|\$select|\$filter/,
  );
});

test('informa tipo no OptionSet sin inventar sintaxis y marca ausencia de candidatos', async () => {
  let optionCalls = 0;
  const events = [];
  const diagnostic = createTemporaryAccountCustomerMetadataDiagnostic({
    dataverseClient: {
      retrieveEntityAttributeMetadata: async () => [{
        logicalName: 'organization_customer_status',
        schemaName: 'organization_Customer_Status',
        attributeType: 'Integer',
      }],
      retrieveRequiredOptionMetadata: async () => { optionCalls += 1; },
    },
    diagnosticLogger: (event) => events.push(event),
  });

  await diagnostic.run();

  assert.equal(optionCalls, 0);
  assert.deepEqual(events, [
    {
      component: 'AccountCustomerMetadataDiagnostic',
      diagnosticId: 'PHASE1_024_ACCOUNT_ATTRIBUTE_METADATA',
      rule: 'customer_classification_eq_3',
      optionValue: 3,
      result: 'NO_CANDIDATES',
    },
    {
      component: 'AccountCustomerMetadataDiagnostic',
      diagnosticId: 'PHASE1_024_ACCOUNT_ATTRIBUTE_METADATA',
      rule: 'customer_status_eq_4',
      logicalName: 'organization_customer_status',
      schemaName: 'organization_Customer_Status',
      attributeType: 'Integer',
      optionValue: 4,
      optionPresent: null,
      result: 'CANDIDATE',
    },
  ]);
});

test('falla cerrado sin registrar errores ni payloads de metadata', async () => {
  const events = [];
  const diagnostic = createTemporaryAccountCustomerMetadataDiagnostic({
    dataverseClient: {
      retrieveEntityAttributeMetadata: async () => {
        throw new Error('Authorization Bearer secret Customer Name');
      },
      retrieveRequiredOptionMetadata: async () => ({ present: false, label: null }),
    },
    diagnosticLogger: (event) => events.push(event),
  });

  await diagnostic.run();

  assert.deepEqual(events, [{
    component: 'AccountCustomerMetadataDiagnostic',
    diagnosticId: 'PHASE1_024_ACCOUNT_ATTRIBUTE_METADATA',
    result: 'METADATA_QUERY_FAILED',
  }]);
  assert.doesNotMatch(JSON.stringify(events), /Authorization|Bearer|secret|Customer Name/);
});
