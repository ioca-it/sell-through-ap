import {
  createDataverseInvalidResponseDiagnostic,
  createDataverseNetworkDiagnostic,
  emitDataverseDiagnostic,
  inspectDataverseHttpFailure,
} from './dataverseDiagnostics.js';

export const DATAVERSE_FORMATTED_VALUE_ANNOTATION =
  'OData.Community.Display.V1.FormattedValue';

const DATAVERSE_NETWORK_CATEGORIES = Object.freeze({
  TIMEOUT: 'NETWORK_TIMEOUT',
  ABORTED: 'NETWORK_ABORTED',
  FETCH_FAILED: 'NETWORK_FETCH_FAILED',
  INVALID_URL: 'NETWORK_INVALID_URL',
  UNKNOWN: 'NETWORK_UNKNOWN',
});

const FETCH_FAILURE_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_SOCKET',
]);

const readSafeErrorCodes = (error) => [error?.code, error?.cause?.code]
  .filter((code) => typeof code === 'string')
  .map((code) => code.toUpperCase());

const classifyDataverseNetworkError = ({ error, timeoutTriggered }) => {
  if (timeoutTriggered) return DATAVERSE_NETWORK_CATEGORIES.TIMEOUT;

  const safeCodes = readSafeErrorCodes(error);
  if (safeCodes.includes('ERR_INVALID_URL')) {
    return DATAVERSE_NETWORK_CATEGORIES.INVALID_URL;
  }
  if (error?.name === 'AbortError' || safeCodes.includes('ABORT_ERR')) {
    return DATAVERSE_NETWORK_CATEGORIES.ABORTED;
  }
  if (error instanceof TypeError
    || error?.name === 'TypeError'
    || safeCodes.some((code) => FETCH_FAILURE_CODES.has(code))) {
    return DATAVERSE_NETWORK_CATEGORIES.FETCH_FAILED;
  }
  return DATAVERSE_NETWORK_CATEGORIES.UNKNOWN;
};

const createNetworkDiagnostic = ({
  error,
  timeoutTriggered,
  timeoutConfiguredMs,
  tokenAcquired,
  baseUrlConfigured,
  baseUrlProtocolValid,
}) => Object.freeze({
  ...createDataverseNetworkDiagnostic(),
  networkCategory: classifyDataverseNetworkError({ error, timeoutTriggered }),
  timeoutConfiguredMs,
  tokenAcquired: Boolean(tokenAcquired),
  baseUrlConfigured: Boolean(baseUrlConfigured),
  baseUrlProtocolValid: Boolean(baseUrlProtocolValid),
});

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
  timeoutMs = 30000,
  diagnosticLogger,
} = {}) => {
  const baseUrlConfigured = typeof baseUrl === 'string' && baseUrl.trim() !== '';
  if (!baseUrlConfigured) {
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
  if (typeof timeoutMs !== 'number' || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('DataverseClient: timeout inválido.');
  }

  let parsedBaseUrl;
  try {
    parsedBaseUrl = new URL(baseUrl);
  } catch {
    throw new Error('DataverseClient: "baseUrl" inválida.');
  }
  const baseUrlProtocolValid = parsedBaseUrl.protocol === 'https:';
  const dataverseOrigin = parsedBaseUrl.origin;
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
    let token;
    try {
      token = await tokenProvider.getToken();
    } catch (error) {
      if (error?.statusCode === 502) throw error;
      throw new DataverseRequestError();
    }

    let requestHeaders;
    try {
      requestHeaders = {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        ...createPreferHeader(includeAnnotations),
      };
    } catch {
      throw new DataverseRequestError();
    }

    const controller = new AbortController();
    let timeoutTriggered = false;
    const timeout = setTimeout(() => {
      timeoutTriggered = true;
      controller.abort();
    }, timeoutMs);
    let response;
    try {
      response = await fetchImpl(url, {
        method: 'GET',
        headers: requestHeaders,
        signal: controller.signal,
      });
    } catch (error) {
      emitDataverseDiagnostic(
        createNetworkDiagnostic({
          error,
          timeoutTriggered,
          timeoutConfiguredMs: timeoutMs,
          tokenAcquired: true,
          baseUrlConfigured,
          baseUrlProtocolValid,
        }),
        diagnosticLogger,
      );
      throw new DataverseRequestError();
    } finally {
      clearTimeout(timeout);
    }

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
