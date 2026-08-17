import {
  DATAVERSE_METADATA_FAILURE_STAGES,
  getDataverseMetadataFailureStage,
} from './dataverseClient.js';

const COMPONENT = 'ProductPriceLevelMetadataDiagnostic';
const DIAGNOSTIC_ID = 'PHASE1_048_PRODUCT_URL_METADATA';
const ENTITY_SET = 'productpricelevels';
const NAME_CONCEPTS = Object.freeze(['url', 'product', 'producto']);

let executedInProcess = false;

const defaultLogger = (event) => console.warn(JSON.stringify(event));

const emitEvent = (event, diagnosticLogger) => {
  try {
    diagnosticLogger(Object.freeze(event));
  } catch {
    // La telemetría temporal nunca modifica el fallo público Product original.
  }
};

const emitLifecycle = (stage, result, diagnosticLogger, candidateCount) => {
  emitEvent({
    component: COMPONENT,
    diagnosticId: DIAGNOSTIC_ID,
    stage,
    result,
    ...(Number.isInteger(candidateCount) ? { candidateCount } : {}),
  }, diagnosticLogger);
};

const safeMetadataName = (value) => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return /^[A-Za-z0-9_]{1,128}$/.test(normalized) ? normalized : null;
};

const safeAttributeType = (value) => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return /^[A-Za-z0-9_.]{1,64}$/.test(normalized) ? normalized : null;
};

const isCandidate = ({ logicalName, schemaName }) => {
  const technicalNames = `${logicalName} ${schemaName}`.toLowerCase();
  return NAME_CONCEPTS.some((concept) => technicalNames.includes(concept));
};

const createMetadataEvent = (attribute) => {
  const logicalName = safeMetadataName(attribute?.LogicalName);
  const schemaName = safeMetadataName(attribute?.SchemaName);
  if (!logicalName || !schemaName) return null;

  const candidate = isCandidate({ logicalName, schemaName });
  return Object.freeze({
    component: COMPONENT,
    diagnosticId: DIAGNOSTIC_ID,
    logicalName,
    schemaName,
    attributeType: safeAttributeType(attribute?.AttributeType),
    isValidForRead: typeof attribute?.IsValidForRead === 'boolean'
      ? attribute.IsValidForRead
      : null,
    result: candidate ? 'CANDIDATE' : 'NOT_CANDIDATE',
  });
};

export const runProductPriceLevelMetadataDiagnosticOnce = async ({
  dataverseClient,
  diagnosticLogger = defaultLogger,
} = {}) => {
  if (executedInProcess) return false;
  executedInProcess = true;
  emitLifecycle('TRIGGER', 'REACHED', diagnosticLogger);

  if (typeof dataverseClient?.retrieveEntityAttributeMetadataCandidates !== 'function') {
    emitLifecycle('ENTITY_DEFINITION', 'FAIL', diagnosticLogger);
    return true;
  }

  let attributes;
  try {
    attributes = await dataverseClient.retrieveEntityAttributeMetadataCandidates({
      entitySetName: ENTITY_SET,
      nameConcepts: NAME_CONCEPTS,
    });
  } catch (error) {
    const stage = getDataverseMetadataFailureStage(error)
      ?? DATAVERSE_METADATA_FAILURE_STAGES.ENTITY_DEFINITION;
    emitLifecycle(stage, 'FAIL', diagnosticLogger);
    return true;
  }
  if (!Array.isArray(attributes)) {
    emitLifecycle('ATTRIBUTES', 'FAIL', diagnosticLogger);
    return true;
  }

  const candidateEvents = attributes
    .map((attribute) => createMetadataEvent(attribute))
    .filter(Boolean);
  emitLifecycle(
    'CANDIDATES',
    candidateEvents.length > 0 ? 'FOUND' : 'NONE',
    diagnosticLogger,
    candidateEvents.length,
  );
  candidateEvents.forEach((event) => emitEvent(event, diagnosticLogger));
  return true;
};

export const resetProductPriceLevelMetadataDiagnosticForTests = () => {
  executedInProcess = false;
};
