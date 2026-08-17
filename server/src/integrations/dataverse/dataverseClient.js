import {
  DATAVERSE_DIAGNOSTIC_IDS,
  createDataverseInvalidResponseDiagnostic,
  createDataverseNetworkDiagnostic,
  emitDataverseDiagnostic,
  inspectDataverseHttpFailure,
} from './dataverseDiagnostics.js';

export const DATAVERSE_FORMATTED_VALUE_ANNOTATION =
  'OData.Community.Display.V1.FormattedValue';

const DATAVERSE_HTTP_FAILURE = Symbol('dataverseHttpFailure');
const DATAVERSE_METADATA_FAILURE = Symbol('dataverseMetadataFailure');

export const DATAVERSE_METADATA_FAILURE_STAGES = Object.freeze({
  ENTITY_DEFINITION: 'ENTITY_DEFINITION',
  ATTRIBUTES: 'ATTRIBUTES',
});

const attachHttpFailure = (error, diagnostic) => {
  Object.defineProperty(error, DATAVERSE_HTTP_FAILURE, {
    value: Object.freeze({
      diagnosticId: diagnostic.diagnosticId,
      upstreamStatus: diagnostic.upstreamStatus,
    }),
    enumerable: false,
  });
  return error;
};

export const isDataverseInvalidFieldOrFilterError = (error) => {
  const failure = error?.[DATAVERSE_HTTP_FAILURE];
  return failure?.diagnosticId === DATAVERSE_DIAGNOSTIC_IDS.INVALID_FIELD_OR_FILTER
    && failure?.upstreamStatus === 400;
};

const attachMetadataFailure = (error, stage) => {
  Object.defineProperty(error, DATAVERSE_METADATA_FAILURE, {
    value: stage,
    enumerable: false,
  });
  return error;
};

export const getDataverseMetadataFailureStage = (error) => (
  error?.[DATAVERSE_METADATA_FAILURE] ?? null
);

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
        throw attachHttpFailure(new DataverseRequestError(), diagnostic);
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

  // Ruta interna y temporal para resolver atributos por metadata sin recorrer
  // tablas ni descargar definiciones completas. Los errores no leen ni
  // registran el body upstream; el diagnóstico llamador preserva el fallo
  // Product original.
  const retrieveMetadataCollection = async (url) => {
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
      if (!response?.ok) {
        try {
          await response?.body?.cancel?.();
        } catch {
          // Descartar el body es best-effort y nunca amplía la telemetría.
        }
        throw new DataverseRequestError();
      }

      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new DataverseRequestError();
      }
      if (!Array.isArray(payload?.value)) throw new DataverseRequestError();
      return payload.value;
    } catch (error) {
      if (error instanceof DataverseRequestError) throw error;
      throw new DataverseRequestError();
    } finally {
      clearTimeout(timeout);
    }
  };

  const retrieveEntityAttributeMetadataCandidates = async ({
    entitySetName,
    nameConcepts,
  } = {}) => {
    if (typeof entitySetName !== 'string'
      || !/^[A-Za-z0-9_]+$/.test(entitySetName)) {
      throw new Error('DataverseClient: Entity Set de metadata inválido.');
    }
    if (!Array.isArray(nameConcepts)
      || nameConcepts.length === 0
      || nameConcepts.some((concept) => (
        typeof concept !== 'string' || !/^[a-z0-9_]+$/.test(concept)
      ))) {
      throw new Error('DataverseClient: conceptos de metadata inválidos.');
    }

    const entityDefinitionsUrl = new URL(
      '/api/data/v9.2/EntityDefinitions',
      dataverseOrigin,
    );
    entityDefinitionsUrl.searchParams.set('$select', 'LogicalName,EntitySetName');
    entityDefinitionsUrl.searchParams.set(
      '$filter',
      `EntitySetName eq '${entitySetName}'`,
    );
    entityDefinitionsUrl.searchParams.set('$top', '2');

    let entityDefinitions;
    try {
      entityDefinitions = await retrieveMetadataCollection(entityDefinitionsUrl);
    } catch (error) {
      throw attachMetadataFailure(
        error,
        DATAVERSE_METADATA_FAILURE_STAGES.ENTITY_DEFINITION,
      );
    }
    if (entityDefinitions.length !== 1) {
      throw attachMetadataFailure(
        new DataverseRequestError(),
        DATAVERSE_METADATA_FAILURE_STAGES.ENTITY_DEFINITION,
      );
    }
    const [entityDefinition] = entityDefinitions;
    const entityLogicalName = entityDefinition?.LogicalName;
    if (entityDefinition?.EntitySetName !== entitySetName
      || typeof entityLogicalName !== 'string'
      || !/^[a-z0-9_]+$/.test(entityLogicalName)) {
      throw attachMetadataFailure(
        new DataverseRequestError(),
        DATAVERSE_METADATA_FAILURE_STAGES.ENTITY_DEFINITION,
      );
    }

    const attributesUrl = new URL(
      `/api/data/v9.2/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes`,
      dataverseOrigin,
    );
    attributesUrl.searchParams.set(
      '$select',
      'LogicalName,SchemaName,AttributeType,IsValidForRead',
    );
    attributesUrl.searchParams.set(
      '$filter',
      nameConcepts
        .map((concept) => `contains(LogicalName,'${concept}')`)
        .join(' or '),
    );

    let attributes;
    try {
      attributes = await retrieveMetadataCollection(attributesUrl);
    } catch (error) {
      throw attachMetadataFailure(
        error,
        DATAVERSE_METADATA_FAILURE_STAGES.ATTRIBUTES,
      );
    }
    return Object.freeze(attributes.map((attribute) => Object.freeze({
      LogicalName: attribute?.LogicalName,
      SchemaName: attribute?.SchemaName,
      AttributeType: attribute?.AttributeType,
      IsValidForRead: attribute?.IsValidForRead,
    })));
  };

  // Ruta interna y temporal para diagnósticos controlados. Solo observa el
  // status HTTP y descarta el body; no clasifica ni registra contenido OData.
  const probeRetrieveMultiple = async (query) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const token = await tokenProvider.getToken();
      const response = await fetchImpl(createQueryUrl(query), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          ...createPreferHeader(query.includeAnnotations),
        },
        signal: controller.signal,
      });
      try {
        await response?.body?.cancel?.();
      } catch {
        // Descartar el body es best-effort y nunca altera PASS/FAIL del probe.
      }
      return response?.ok === true;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
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
    probeRetrieveMultiple(query) {
      return probeRetrieveMultiple(query);
    },
    retrieveEntityAttributeMetadataCandidates(query) {
      return retrieveEntityAttributeMetadataCandidates(query);
    },
    retrieveMultiple(query) {
      return retrieveMultiple(query);
    },
    retrieveAll(query) {
      return retrieveAll(query);
    },
  });
};
