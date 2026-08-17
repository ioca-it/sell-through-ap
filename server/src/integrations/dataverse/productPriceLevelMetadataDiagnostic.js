const COMPONENT = 'ProductPriceLevelMetadataDiagnostic';
const DIAGNOSTIC_ID = 'PHASE1_048_PRODUCT_URL_METADATA';
const ENTITY_SET = 'productpricelevels';
const NAME_CONCEPTS = Object.freeze(['url', 'product', 'producto']);

let executedInProcess = false;

const defaultLogger = (event) => console.warn(JSON.stringify(event));

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
  if (executedInProcess
    || typeof dataverseClient?.retrieveEntityAttributeMetadataCandidates !== 'function') {
    return false;
  }
  executedInProcess = true;

  const attributes = await dataverseClient.retrieveEntityAttributeMetadataCandidates({
    entitySetName: ENTITY_SET,
    nameConcepts: NAME_CONCEPTS,
  });
  if (!Array.isArray(attributes)) return true;

  attributes.forEach((attribute) => {
    const event = createMetadataEvent(attribute);
    if (!event) return;
    try {
      diagnosticLogger(event);
    } catch {
      // La metadata temporal nunca modifica el fallo público Product original.
    }
  });
  return true;
};

export const resetProductPriceLevelMetadataDiagnosticForTests = () => {
  executedInProcess = false;
};
