import {
  auditGeneralAcademicPackQuality,
  compareGeneralAcademicPacks,
  type GeneralAcademicInventoryPack,
  type GeneralAcademicSimilarityAlert,
} from "./content-intelligence";
import { createGeneralAcademicContentFingerprint } from "./fingerprint";
import { parseGeneralAcademicPackJson } from "./importer";
import { GENERAL_ACADEMIC_LIMITS } from "./limits";
import type { CanonicalGeneralAcademicPack } from "./schemas";
import type { GeneralAcademicValidationFinding } from "./validation";

export const GENERAL_ACADEMIC_BATCH_GENERATION_MAX = 5;
export const GENERAL_ACADEMIC_BATCH_IMPORT_MAX = 20;

export type GeneralAcademicBatchImportItem = {
  index: number;
  ok: boolean;
  pack?: CanonicalGeneralAcademicPack;
  title: string;
  errors: GeneralAcademicValidationFinding[];
  warnings: GeneralAcademicValidationFinding[];
  qualityWarnings: string[];
  blocking: string[];
  similarity: GeneralAcademicSimilarityAlert[];
};

function inputBytes(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function batchFailure(message: string): GeneralAcademicBatchImportItem[] {
  return [{
    index: 0,
    ok: false,
    title: "Invalid batch",
    errors: [{ code: "INVALID_BATCH", path: "$", message, severity: "error" }],
    warnings: [],
    qualityWarnings: [],
    blocking: [],
    similarity: [],
  }];
}

export function parseGeneralAcademicBatchJson(input: string): GeneralAcademicBatchImportItem[] {
  if (inputBytes(input) > GENERAL_ACADEMIC_LIMITS.totalJsonBytes) {
    return batchFailure("Batch JSON exceeds the 512 KB import limit.");
  }
  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch {
    return batchFailure("The batch is not valid JSON.");
  }
  const records = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { packs?: unknown }).packs)
      ? (value as { packs: unknown[] }).packs
      : [value];
  if (!records.length) return batchFailure("Include at least one source pack.");
  if (records.length > GENERAL_ACADEMIC_BATCH_IMPORT_MAX) return batchFailure(`Import at most ${GENERAL_ACADEMIC_BATCH_IMPORT_MAX} packs at once.`);
  return records.map((record, index) => {
    const result = parseGeneralAcademicPackJson(record);
    if (!result.ok) return {
      index,
      ok: false,
      title: `Pack ${index + 1}`,
      errors: result.errors,
      warnings: result.warnings,
      qualityWarnings: [],
      blocking: [],
      similarity: [],
    };
    const item: GeneralAcademicInventoryPack = {
      id: `preview-${index}`,
      pack: result.pack,
      contentFingerprint: createGeneralAcademicContentFingerprint(result.pack),
      createdAt: "",
      updatedAt: "",
    };
    const quality = auditGeneralAcademicPackQuality(item);
    return {
      index,
      ok: quality.blocking.length === 0,
      pack: result.pack,
      title: result.pack.title,
      errors: [],
      warnings: result.warnings,
      qualityWarnings: quality.warnings.map((finding) => `${finding.code}: ${finding.message}`),
      blocking: quality.blocking.map((finding) => `${finding.code}: ${finding.message}`),
      similarity: [],
    };
  });
}

export function addGeneralAcademicBatchSimilarity(
  items: readonly GeneralAcademicBatchImportItem[],
  inventory: readonly GeneralAcademicInventoryPack[],
) {
  const validPreviews = items.filter((item): item is GeneralAcademicBatchImportItem & { pack: CanonicalGeneralAcademicPack } => Boolean(item.pack));
  return items.map((item) => {
    if (!item.pack) return item;
    const preview: GeneralAcademicInventoryPack = {
      id: `preview-${item.index}`,
      pack: item.pack,
      contentFingerprint: createGeneralAcademicContentFingerprint(item.pack),
      createdAt: "",
      updatedAt: "",
    };
    const comparisons = [
      ...inventory,
      ...validPreviews.filter((candidate) => candidate.index !== item.index).map((candidate) => ({
        id: `preview-${candidate.index}`,
        pack: candidate.pack,
        contentFingerprint: createGeneralAcademicContentFingerprint(candidate.pack),
        createdAt: "",
        updatedAt: "",
      })),
    ];
    return { ...item, similarity: comparisons.map((candidate) => compareGeneralAcademicPacks(preview, candidate)).filter((alert): alert is GeneralAcademicSimilarityAlert => Boolean(alert)) };
  });
}
