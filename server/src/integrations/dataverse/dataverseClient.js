import {
  createDataverseInvalidResponseDiagnostic,
  createDataverseNetworkDiagnostic,
  emitDataverseDiagnostic,
  inspectDataverseHttpFailure,
  DATAVERSE_DIAGNOSTIC_IDS,
} from './dataverseDiagnostics.js';

const INTERNAL_DIAGNOSTIC_ID = Symbol('dataverseDiagnosticId');

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
  });
};
