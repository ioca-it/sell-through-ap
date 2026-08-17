import {
  createDataverseInvalidResponseDiagnostic,
  createDataverseNetworkDiagnostic,
  emitDataverseDiagnostic,
  inspectDataverseHttpFailure,
} from './dataverseDiagnostics.js';

export const DATAVERSE_FORMATTED_VALUE_ANNOTATION =
  'OData.Community.Display.V1.FormattedValue';

const createPreferHeader = (includeAnnotations) => {
  if (includeAnnotations === undefined) return {};
  if (!Array.isArray(includeAnnotations)
    || includeAnnotations.some((annotation) => (
      typeof annotation !== 'string' || annotation.trim() === ''
    ))) {
    throw new Error('DataverseClient: anotaciones inválidas.');
  }
  if (includeAnnotations.length === 0) return {};

  return {
    Prefer: `odata.include-annotations="${includeAnnotations
      .map((annotation) => annotation.trim())
      .join(',')}"`,
  };
};

const readInvalidResponseMetadata = ({ response, payload, parseSuccess }) => {
  const contentType = response?.headers?.get?.('content-type');
  const mediaType = typeof contentType === 'string'
    ? contentType.split(';', 1)[0].trim().toLowerCase()
    : '';
  const bodyType = parseSuccess
    ? (payload === null ? 'null' : Array.isArray(payload) ? 'array' : typeof payload)
    : 'unparsed';
  const isObjectBody = payload !== null && typeof payload === 'object';

  return Object.freeze({
    hasValueArray: parseSuccess && Array.isArray(payload?.value),
    hasNextLink: parseSuccess
      && isObjectBody
      && Object.hasOwn(payload, '@odata.nextLink'),
    bodyType,
    contentTypeValid: mediaType === 'application/json' || mediaType.endsWith('+json'),
    parseSuccess,
  });
};

const createInvalidResponseDiagnostic = ({ response, payload, parseSuccess }) => Object.freeze({
  ...createDataverseInvalidResponseDiagnostic(response?.status),
  ...readInvalidResponseMetadata({ response, payload, parseSuccess }),
});

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
  const createQueryUrl = ({
    entitySet,
    select,
    filter,
    orderBy,
    top,
  }) => {
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
    return url;
  };

  const retrievePage = async ({ url, includeAnnotations }) => {
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
          ...createPreferHeader(includeAnnotations),
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        const diagnostic = await inspectDataverseHttpFailure(response);
        emitDataverseDiagnostic(diagnostic, diagnosticLogger);
        throw new DataverseRequestError();
      }

      let payload;
      try {
        payload = await response.json();
      } catch {
        emitDataverseDiagnostic(
          createInvalidResponseDiagnostic({
            response,
            payload: undefined,
            parseSuccess: false,
          }),
          diagnosticLogger,
        );
        throw new DataverseRequestError();
      }
      if (!Array.isArray(payload?.value)) {
        emitDataverseDiagnostic(
          createInvalidResponseDiagnostic({ response, payload, parseSuccess: true }),
          diagnosticLogger,
        );
        throw new DataverseRequestError();
      }
      return {
        value: payload.value,
        nextLink: typeof payload['@odata.nextLink'] === 'string'
          ? payload['@odata.nextLink']
          : null,
      };
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
  };

  const validateNextLink = (nextLink) => {
    const url = new URL(nextLink, dataverseOrigin);
    if (url.origin !== dataverseOrigin || !url.pathname.startsWith('/api/data/v9.2/')) {
      throw new DataverseRequestError();
    }
    return url;
  };

  const retrieveMultiple = async (query) => {
    const page = await retrievePage({
      url: createQueryUrl(query),
      includeAnnotations: query.includeAnnotations,
    });
    return page.value;
  };

  const retrieveAll = async (query) => {
    const rows = [];
    let url = createQueryUrl(query);
    let pageCount = 0;
    while (url) {
      pageCount += 1;
      if (pageCount > 1000) throw new DataverseRequestError();
      const page = await retrievePage({
        url,
        includeAnnotations: query.includeAnnotations,
      });
      rows.push(...page.value);
      url = page.nextLink ? validateNextLink(page.nextLink) : null;
    }
    return rows;
  };

  return Object.freeze({
    retrieveMultiple(query) {
      return retrieveMultiple(query);
    },
    retrieveAll(query) {
      return retrieveAll(query);
    },
  });
};
