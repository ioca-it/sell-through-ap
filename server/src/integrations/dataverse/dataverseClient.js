import {
  createDataverseInvalidResponseDiagnostic,
  createDataverseNetworkDiagnostic,
  emitDataverseDiagnostic,
  inspectDataverseHttpFailure,
} from './dataverseDiagnostics.js';

export class DataverseRequestError extends Error {
  constructor(message = 'No fue posible consultar Dataverse.') {
    super(message);
    this.name = 'DataverseRequestError';
    this.code = 'DATAVERSE_REQUEST_FAILED';
    this.statusCode = 502;
  }
}

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

  return Object.freeze({
    async retrieveMultiple({ entitySet, select, filter, orderBy, top }) {
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
          emitDataverseDiagnostic(
            await inspectDataverseHttpFailure(response),
            diagnosticLogger,
          );
          throw new DataverseRequestError();
        }

        let payload;
        try {
          payload = await response.json();
        } catch {
          emitDataverseDiagnostic(
            createDataverseInvalidResponseDiagnostic(response.status),
            diagnosticLogger,
          );
          throw new DataverseRequestError();
        }
        if (!Array.isArray(payload?.value)) {
          emitDataverseDiagnostic(
            createDataverseInvalidResponseDiagnostic(response.status),
            diagnosticLogger,
          );
          throw new DataverseRequestError();
        }
        return payload.value;
      } catch (error) {
        if (error instanceof DataverseRequestError) throw error;
        if (dataverseRequestStarted) {
          emitDataverseDiagnostic(createDataverseNetworkDiagnostic(), diagnosticLogger);
        }
        if (error?.statusCode === 502) throw error;
        throw new DataverseRequestError();
      } finally {
        clearTimeout(timeout);
      }
    },
  });
};
