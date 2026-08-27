export const EVIDENCE_CLASSIFICATIONS = [
  "official",
  "official_composition",
  "third_party_supported",
  "experimental",
] as const;

export const EVIDENCE_CONFIDENCE_LEVELS = [
  "very_high",
  "high",
  "medium",
  "low",
] as const;

export const EVIDENCE_SOURCE_PROVENANCES = [
  "DMAT_CURRENT_OFFICIAL",
  "TESTAS_CURRENT_OFFICIAL",
  "TESTAS_HISTORICAL_OFFICIAL",
  "THIRD_PARTY",
] as const;

export type EvidenceClassification = (typeof EVIDENCE_CLASSIFICATIONS)[number];
export type EvidenceConfidence = (typeof EVIDENCE_CONFIDENCE_LEVELS)[number];
export type EvidenceSourceProvenance = (typeof EVIDENCE_SOURCE_PROVENANCES)[number];

/** The two fields retained by the existing Mathematical Equations taxonomy. */
export type ClassifiedEvidenceDefinition<TId extends string = string> = {
  id: TId;
  evidence: EvidenceClassification;
  productionEnabled: boolean;
};

/** Shared evidence metadata for new registries and compatibility adapters. */
export type EvidenceDefinition<TId extends string = string> =
  ClassifiedEvidenceDefinition<TId> & {
    sources: readonly EvidenceSourceProvenance[];
    confidence: EvidenceConfidence;
  };

export type EvidenceValidation =
  | { valid: true; issues: readonly [] }
  | { valid: false; issues: readonly string[] };

const OFFICIAL_SOURCES = new Set<EvidenceSourceProvenance>([
  "DMAT_CURRENT_OFFICIAL",
  "TESTAS_CURRENT_OFFICIAL",
  "TESTAS_HISTORICAL_OFFICIAL",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateEvidenceDefinition(value: unknown): EvidenceValidation {
  const issues: string[] = [];
  if (!isRecord(value)) return { valid: false, issues: ["Evidence metadata must be an object."] };

  if (typeof value.id !== "string" || !value.id.trim()) {
    issues.push("Evidence metadata requires a non-empty id.");
  }
  if (!EVIDENCE_CLASSIFICATIONS.includes(value.evidence as EvidenceClassification)) {
    issues.push("Evidence classification is unknown.");
  }
  if (!EVIDENCE_CONFIDENCE_LEVELS.includes(value.confidence as EvidenceConfidence)) {
    issues.push("Evidence confidence is unknown.");
  }
  if (typeof value.productionEnabled !== "boolean") {
    issues.push("productionEnabled must be boolean.");
  }

  const sources = Array.isArray(value.sources) ? value.sources : null;
  if (!sources) {
    issues.push("Evidence sources must be an array.");
  } else {
    if (new Set(sources).size !== sources.length) issues.push("Evidence sources must be unique.");
    if (sources.some((source) =>
      !EVIDENCE_SOURCE_PROVENANCES.includes(source as EvidenceSourceProvenance))) {
      issues.push("Evidence source provenance is unknown.");
    }
  }

  const classification = value.evidence as EvidenceClassification;
  const recognizedSources = (sources ?? []).filter((source): source is EvidenceSourceProvenance =>
    EVIDENCE_SOURCE_PROVENANCES.includes(source as EvidenceSourceProvenance));
  if (classification !== "experimental" && recognizedSources.length === 0) {
    issues.push("Supported evidence requires at least one recognized source.");
  }
  if (
    (classification === "official" || classification === "official_composition") &&
    !recognizedSources.some((source) => OFFICIAL_SOURCES.has(source))
  ) {
    issues.push("Official evidence requires an official source provenance.");
  }
  if (
    classification === "third_party_supported" &&
    !recognizedSources.includes("THIRD_PARTY")
  ) {
    issues.push("Third-party-supported evidence requires THIRD_PARTY provenance.");
  }
  if (classification === "experimental" && value.productionEnabled === true) {
    issues.push("Experimental evidence cannot be production-enabled.");
  }

  return issues.length ? { valid: false, issues } : { valid: true, issues: [] };
}

export function productionEvidenceFor<TDefinition extends EvidenceDefinition>(
  registry: readonly TDefinition[],
  id: string,
): TDefinition | null {
  const definition = registry.find((item) => item.id === id);
  return definition?.productionEnabled && validateEvidenceDefinition(definition).valid
    ? definition
    : null;
}

