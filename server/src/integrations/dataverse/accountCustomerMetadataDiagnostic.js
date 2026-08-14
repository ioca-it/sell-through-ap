const DIAGNOSTIC_ID = 'PHASE1_024_ACCOUNT_ATTRIBUTE_METADATA';
const ACCOUNT_LOGICAL_NAME = 'account';
const SAFE_IDENTIFIER = /^[A-Za-z0-9_]+$/;
const OPTION_ATTRIBUTE_TYPES = new Set(['Boolean', 'Picklist', 'State', 'Status']);

const BUSINESS_RULES = Object.freeze([
  Object.freeze({
    rule: 'customer_classification_eq_3',
    optionValue: 3,
    exactCandidates: Object.freeze(['customertypecode']),
    tokenGroups: Object.freeze([
      Object.freeze(['customer', 'type']),
      Object.freeze(['customer', 'classification']),
      Object.freeze(['cliente', 'tipo']),
      Object.freeze(['cliente', 'clasificacion']),
    ]),
    excludedCandidates: Object.freeze(['newtipocliente']),
  }),
  Object.freeze({
    rule: 'customer_status_eq_4',
    optionValue: 4,
    exactCandidates: Object.freeze(['statuscode']),
    tokenGroups: Object.freeze([
      Object.freeze(['customer', 'status']),
      Object.freeze(['customer', 'state']),
      Object.freeze(['account', 'status']),
      Object.freeze(['cliente', 'estado']),
      Object.freeze(['cliente', 'status']),
    ]),
    excludedCandidates: Object.freeze(['statecode']),
  }),
]);

const defaultDiagnosticLogger = (event) => console.warn(JSON.stringify(event));

const normalizeIdentifier = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const isSafeAttribute = ({ logicalName, schemaName, attributeType } = {}) => (
  typeof logicalName === 'string'
  && SAFE_IDENTIFIER.test(logicalName)
  && typeof schemaName === 'string'
  && SAFE_IDENTIFIER.test(schemaName)
  && typeof attributeType === 'string'
  && /^[A-Za-z]+$/.test(attributeType)
);

const isCandidateForRule = (attribute, rule) => {
  const identifiers = [attribute.logicalName, attribute.schemaName]
    .map(normalizeIdentifier);
  if (identifiers.some((identifier) => rule.excludedCandidates.includes(identifier))) {
    return false;
  }
  return identifiers.some((identifier) => (
    rule.exactCandidates.includes(identifier)
    || rule.tokenGroups.some((tokens) => tokens.every((token) => identifier.includes(token)))
  ));
};

const emit = (logger, event) => {
  try {
    logger(Object.freeze({
      component: 'AccountCustomerMetadataDiagnostic',
      diagnosticId: DIAGNOSTIC_ID,
      ...event,
    }));
  } catch {
    // Metadata diagnosis cannot replace the original sanitized Customer API error.
  }
};

export const createTemporaryAccountCustomerMetadataDiagnostic = ({
  dataverseClient,
  diagnosticLogger = defaultDiagnosticLogger,
} = {}) => {
  if (typeof dataverseClient?.retrieveEntityAttributeMetadata !== 'function'
    || typeof dataverseClient?.retrieveRequiredOptionMetadata !== 'function'
    || typeof diagnosticLogger !== 'function') {
    throw new Error('AccountCustomerMetadataDiagnostic: dependencias inválidas.');
  }

  let hasRun = false;

  return Object.freeze({
    async run() {
      if (hasRun) return;
      hasRun = true;

      // TEMPORARY Phase1-024: backend-only discovery reads Account metadata once,
      // emits only candidate identifiers/type and target option 3 or 4, and never
      // logs URLs, queries, tokens, payloads, Customer values or PII. Remove after resolution.
      let attributes;
      try {
        attributes = await dataverseClient.retrieveEntityAttributeMetadata({
          entityLogicalName: ACCOUNT_LOGICAL_NAME,
        });
      } catch {
        emit(diagnosticLogger, { result: 'METADATA_QUERY_FAILED' });
        return;
      }

      const safeAttributes = attributes.filter(isSafeAttribute);
      for (const rule of BUSINESS_RULES) {
        const candidates = safeAttributes
          .filter((attribute) => isCandidateForRule(attribute, rule))
          .sort((left, right) => left.logicalName.localeCompare(right.logicalName));

        if (candidates.length === 0) {
          emit(diagnosticLogger, {
            rule: rule.rule,
            optionValue: rule.optionValue,
            result: 'NO_CANDIDATES',
          });
          continue;
        }

        for (const candidate of candidates) {
          const event = {
            rule: rule.rule,
            logicalName: candidate.logicalName,
            schemaName: candidate.schemaName,
            attributeType: candidate.attributeType,
            optionValue: rule.optionValue,
            optionPresent: null,
            result: 'CANDIDATE',
          };

          if (OPTION_ATTRIBUTE_TYPES.has(candidate.attributeType)) {
            try {
              const option = await dataverseClient.retrieveRequiredOptionMetadata({
                entityLogicalName: ACCOUNT_LOGICAL_NAME,
                attributeLogicalName: candidate.logicalName,
                attributeType: candidate.attributeType,
                optionValue: rule.optionValue,
              });
              event.optionPresent = option.present;
              if (option.label) event.optionLabel = option.label;
            } catch {
              event.result = 'OPTION_METADATA_FAILED';
            }
          }

          emit(diagnosticLogger, event);
        }
      }
    },
  });
};
