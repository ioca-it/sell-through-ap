import {
  createDataverseInvalidResponseDiagnostic,
  createDataverseNetworkDiagnostic,
  emitDataverseDiagnostic,
  inspectDataverseHttpFailure,
  DATAVERSE_DIAGNOSTIC_IDS,
} from './dataverseDiagnostics.js';

const INTERNAL_DIAGNOSTIC_ID = Symbol('dataverseDiagnosticId');
const SAFE_METADATA_IDENTIFIER = /^[A-Za-z0-9_]+$/;
const OPTION_ATTRIBUTE_CASTS = Object.freeze({
  Boolean: 'BooleanAttributeMetadata',
  Picklist: 'PicklistAttributeMetadata',
  State: 'StateAttributeMetadata',
  Status: 'StatusAttributeMetadata',
});

export class DataverseRequestError extends Error {
  constructor(message = 'No fue posible consultar Dataverse.', diagnosticId) {
    super(message);
    this.name = 'DataverseRequestError';
    this.code = 'DATAVERSE_REQUEST_FAILED';
    this.statusCode = 502;
    this[INTERNAL_DIAGNOSTIC_ID] = diagnosticId;
  }
}

export const isInvalidFieldOrFilterError = (error) => (
  error instanceof DataverseRequestError
  && error[INTERNAL_DIAGNOSTIC_ID] === DATAVERSE_DIAGNOSTIC_IDS.INVALID_FIELD_OR_FILTER
);

export const createDataverseClient = ({
  baseUrl,
  tokenProvider,
  fetchImpl = globalThis.fetch,
  timeoutMs = 10000,
  diagnosticLogger,
} = {}) => {
  if (typeof baseUrl !== 'string' || baseUrl.trim() === '') {
    throw new Error('DataverseClient: falta "baseUrl".');
  }
  if (!tokenProvider || typeof tokenProvider.getToken !== 'function') {
    throw new Error('DataverseClient: Token Provider inválido.');
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('DataverseClient: fetch no está disponible.');
  }
  if (diagnosticLogger !== undefined && typeof diagnosticLogger !== 'function') {
    throw new Error('DataverseClient: Diagnostic Logger inválido.');
  }

  const dataverseOrigin = new URL(baseUrl).origin;
  const discardResponseBody = async (response) => {
    try {
      await response.body?.cancel?.();
    } catch {
      // Probe classification depends only on HTTP status, not body disposal.
    }
  };

  const retrieveMetadataJson = async (url) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const token = await tokenProvider.getToken();
      const response = await fetchImpl(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        await discardResponseBody(response);
        throw new DataverseRequestError();
      }
      try {
        return await response.json();
      } catch {
        throw new DataverseRequestError();
      }
    } catch (error) {
      if (error instanceof DataverseRequestError) throw error;
      throw new DataverseRequestError();
    } finally {
      clearTimeout(timeout);
    }
  };

  const assertSafeMetadataIdentifier = (value, label) => {
    if (typeof value !== 'string' || !SAFE_METADATA_IDENTIFIER.test(value)) {
      throw new Error(`DataverseClient: ${label} de metadata inválido.`);
    }
  };

  const readOptionLabel = (option) => {
    const rawLabel = option?.Label?.UserLocalizedLabel?.Label
      ?? option?.Label?.LocalizedLabels?.[0]?.Label;
    if (typeof rawLabel !== 'string') return null;
    const normalizedLabel = rawLabel.replace(/[\r\n\t]+/g, ' ').trim();
    return normalizedLabel === '' ? null : normalizedLabel.slice(0, 120);
  };

  const retrieveMultiple = async (
    { entitySet, select, filter, orderBy, top },
    { emitDiagnostics = true, readPayload = true } = {},
  ) => {
    if (typeof entitySet !== 'string' || !/^[A-Za-z0-9_]+$/.test(entitySet)) {
      throw new Error('DataverseClient: Entity Set inválido.');
    }

    const url = new URL(`/api/data/v9.2/${entitySet}`, dataverseOrigin);
    if (Array.isArray(select) && select.length > 0) {
      url.searchParams.set('$select', select.join(','));
    }
    if (filter) url.searchParams.set('$filter', filter);
    if (orderBy) url.searchParams.set('$orderby', orderBy);
    if (Number.isInteger(top) && top > 0) url.searchParams.set('$top', String(top));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let dataverseRequestStarted = false;
    try {
      const token = await tokenProvider.getToken();
      dataverseRequestStarted = true;
      const response = await fetchImpl(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        let diagnosticId;
        if (emitDiagnostics) {
          const diagnostic = await inspectDataverseHttpFailure(response);
          diagnosticId = diagnostic.diagnosticId;
          emitDataverseDiagnostic(diagnostic, diagnosticLogger);
        } else {
          await discardResponseBody(response);
        }
        throw new DataverseRequestError(undefined, diagnosticId);
      }

      if (!readPayload) {
        await discardResponseBody(response);
        return true;
      }

      let payload;
      try {
        payload = await response.json();
      } catch {
        if (emitDiagnostics) {
          emitDataverseDiagnostic(
            createDataverseInvalidResponseDiagnostic(response.status),
            diagnosticLogger,
          );
        }
        throw new DataverseRequestError();
      }
      if (!Array.isArray(payload?.value)) {
        if (emitDiagnostics) {
          emitDataverseDiagnostic(
            createDataverseInvalidResponseDiagnostic(response.status),
            diagnosticLogger,
          );
        }
        throw new DataverseRequestError();
      }
      return payload.value;
    } catch (error) {
      if (error instanceof DataverseRequestError) throw error;
      if (dataverseRequestStarted && emitDiagnostics) {
        emitDataverseDiagnostic(createDataverseNetworkDiagnostic(), diagnosticLogger);
      }
      if (error?.statusCode === 502) throw error;
      throw new DataverseRequestError();
    } finally {
      clearTimeout(timeout);
    }
  };

  return Object.freeze({
    retrieveMultiple(query) {
      return retrieveMultiple(query);
    },

    // TEMPORARY Phase1-022: backend probes reuse transport without reading or logging
    // Dataverse bodies. Remove this method after the invalid query element is isolated.
    async probeRetrieveMultiple(query) {
      try {
        return await retrieveMultiple(query, {
          emitDiagnostics: false,
          readPayload: false,
        });
      } catch {
        return false;
      }
    },

    // TEMPORARY Phase1-024: backend-only metadata discovery returns only the
    // technical fields required to identify Account attribute candidates.
    async retrieveEntityAttributeMetadata({ entityLogicalName }) {
      assertSafeMetadataIdentifier(entityLogicalName, 'Entity LogicalName');
      const url = new URL(
        `/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes`,
        dataverseOrigin,
      );
      url.searchParams.set('$select', 'LogicalName,SchemaName,AttributeType');
      const payload = await retrieveMetadataJson(url);
      if (!Array.isArray(payload?.value)) throw new DataverseRequestError();
      return payload.value.map((attribute) => Object.freeze({
        logicalName: attribute?.LogicalName,
        schemaName: attribute?.SchemaName,
        attributeType: attribute?.AttributeType,
      }));
    },

    // TEMPORARY Phase1-024: reads only the requested target option from a
    // candidate Choice/State/Status/Boolean attribute; full metadata is discarded.
    async retrieveRequiredOptionMetadata({
      entityLogicalName,
      attributeLogicalName,
      attributeType,
      optionValue,
    }) {
      assertSafeMetadataIdentifier(entityLogicalName, 'Entity LogicalName');
      assertSafeMetadataIdentifier(attributeLogicalName, 'Attribute LogicalName');
      const attributeCast = OPTION_ATTRIBUTE_CASTS[attributeType];
      if (!attributeCast || !Number.isInteger(optionValue)) {
        throw new Error('DataverseClient: consulta OptionSet de metadata inválida.');
      }
      const url = new URL(
        `/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes(LogicalName='${attributeLogicalName}')/Microsoft.Dynamics.CRM.${attributeCast}`,
        dataverseOrigin,
      );
      url.searchParams.set('$select', 'LogicalName');
      url.searchParams.set(
        '$expand',
        'OptionSet($select=Options),GlobalOptionSet($select=Options)',
      );
      const payload = await retrieveMetadataJson(url);
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new DataverseRequestError();
      }
      const options = [
        ...(Array.isArray(payload.OptionSet?.Options) ? payload.OptionSet.Options : []),
        ...(Array.isArray(payload.GlobalOptionSet?.Options)
          ? payload.GlobalOptionSet.Options
          : []),
      ];
      const targetOption = options.find(({ Value }) => Value === optionValue);
      return Object.freeze({
        present: Boolean(targetOption),
        label: targetOption ? readOptionLabel(targetOption) : null,
      });
    },
  });
};
