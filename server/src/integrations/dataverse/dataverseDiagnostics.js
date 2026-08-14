export const DATAVERSE_DIAGNOSTIC_IDS = Object.freeze({
  BAD_REQUEST: 'DATAVERSE_BAD_REQUEST',
  INVALID_FIELD_OR_FILTER: 'DATAVERSE_INVALID_FIELD_OR_FILTER',
  UNAUTHORIZED: 'DATAVERSE_UNAUTHORIZED',
  FORBIDDEN: 'DATAVERSE_FORBIDDEN',
  RATE_LIMITED: 'DATAVERSE_RATE_LIMITED',
  UPSTREAM_ERROR: 'DATAVERSE_UPSTREAM_ERROR',
  NETWORK_ERROR: 'DATAVERSE_NETWORK_ERROR',
});

const INVALID_FIELD_TERM = /\b(?:property|attribute|column|field)\b/i;
const INVALID_FILTER_TERM = /(?:\$(?:filter|select|orderby)|\b(?:filter|query|odata)\b)/i;
const INVALID_QUERY_SIGNAL = /(?:could not find|does not exist|not found|invalid|undeclared|not valid|unrecognized|malformed|syntax|unsupported|not supported|could not parse|parse error)/i;

const readODataErrorMetadata = async (response) => {
  if (typeof response?.json !== 'function') return null;

  try {
    const payload = await response.json();
    const error = payload?.error;
    if (!error || typeof error !== 'object') return null;
    const message = typeof error.message === 'string'
      ? error.message
      : error.message?.value;
    return {
      code: typeof error.code === 'string' ? error.code : '',
      message: typeof message === 'string' ? message : '',
    };
  } catch {
    return null;
  }
};

const indicatesInvalidFieldOrFilter = (metadata) => {
  const diagnosticText = `${metadata?.code || ''} ${metadata?.message || ''}`;
  return INVALID_QUERY_SIGNAL.test(diagnosticText)
    && (INVALID_FIELD_TERM.test(diagnosticText) || INVALID_FILTER_TERM.test(diagnosticText));
};

export const classifyDataverseFailure = ({
  status,
  odataErrorMetadata,
  networkError = false,
} = {}) => {
  if (networkError) return DATAVERSE_DIAGNOSTIC_IDS.NETWORK_ERROR;
  if (status === 400 && indicatesInvalidFieldOrFilter(odataErrorMetadata)) {
    return DATAVERSE_DIAGNOSTIC_IDS.INVALID_FIELD_OR_FILTER;
  }
  if (status === 400) return DATAVERSE_DIAGNOSTIC_IDS.BAD_REQUEST;
  if (status === 401) return DATAVERSE_DIAGNOSTIC_IDS.UNAUTHORIZED;
  if (status === 403) return DATAVERSE_DIAGNOSTIC_IDS.FORBIDDEN;
  if (status === 429) return DATAVERSE_DIAGNOSTIC_IDS.RATE_LIMITED;
  return DATAVERSE_DIAGNOSTIC_IDS.UPSTREAM_ERROR;
};

const createDiagnosticEvent = ({
  diagnosticId,
  failureType,
  upstreamStatus,
  structuredErrorMetadata,
}) => Object.freeze({
  component: 'DataverseClient',
  diagnosticId,
  operation: 'retrieveMultiple',
  failureType,
  ...(Number.isInteger(upstreamStatus) ? { upstreamStatus } : {}),
  structuredErrorMetadata: Boolean(structuredErrorMetadata),
});

export const inspectDataverseHttpFailure = async (response) => {
  const odataErrorMetadata = await readODataErrorMetadata(response);
  const upstreamStatus = Number.isInteger(response?.status) ? response.status : undefined;
  return createDiagnosticEvent({
    diagnosticId: classifyDataverseFailure({
      status: upstreamStatus,
      odataErrorMetadata,
    }),
    failureType: 'http',
    upstreamStatus,
    structuredErrorMetadata: odataErrorMetadata !== null,
  });
};

export const createDataverseNetworkDiagnostic = () => createDiagnosticEvent({
  diagnosticId: DATAVERSE_DIAGNOSTIC_IDS.NETWORK_ERROR,
  failureType: 'network',
  structuredErrorMetadata: false,
});

export const createDataverseInvalidResponseDiagnostic = (upstreamStatus) => (
  createDiagnosticEvent({
    diagnosticId: DATAVERSE_DIAGNOSTIC_IDS.UPSTREAM_ERROR,
    failureType: 'invalid_response',
    upstreamStatus,
    structuredErrorMetadata: false,
  })
);

const defaultDiagnosticLogger = (event) => console.warn(JSON.stringify(event));

export const emitDataverseDiagnostic = (event, logger = defaultDiagnosticLogger) => {
  try {
    // Only derived, allowlisted metadata reaches logs; raw errors and OData content stay local.
    logger(event);
  } catch {
    // Diagnostics must never alter the sanitized public failure contract.
  }
};
