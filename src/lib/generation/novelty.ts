import { createFingerprint } from "./fingerprint";
import type { JsonValue } from "./types";

export const NOVELTY_POLICY = {
  maximumReferenceSimilarity: 0.85,
  maximumRecentSimilarity: 0.94,
} as const;

export type StructuralFeature = string | number | boolean | readonly string[];

export type StructuralProfile = {
  namespace: "figure_sequence" | "mathematical_equation" | "latin_square";
  features: Readonly<Record<string, StructuralFeature>>;
};

export type NoveltyComparison = {
  accepted: boolean;
  maximumReferenceSimilarity: number | null;
  maximumRecentSimilarity: number | null;
  referenceThreshold: number;
  recentThreshold: number;
};

function multisetSimilarity(first: readonly string[], second: readonly string[]): number {
  const firstCounts = new Map<string, number>();
  const secondCounts = new Map<string, number>();
  first.forEach((value) => firstCounts.set(value, (firstCounts.get(value) ?? 0) + 1));
  second.forEach((value) => secondCounts.set(value, (secondCounts.get(value) ?? 0) + 1));
  const values = new Set([...firstCounts.keys(), ...secondCounts.keys()]);
  let intersection = 0;
  let union = 0;
  values.forEach((value) => {
    intersection += Math.min(firstCounts.get(value) ?? 0, secondCounts.get(value) ?? 0);
    union += Math.max(firstCounts.get(value) ?? 0, secondCounts.get(value) ?? 0);
  });
  return union === 0 ? 1 : intersection / union;
}

function featureSimilarity(first: StructuralFeature, second: StructuralFeature): number {
  if (Array.isArray(first) || Array.isArray(second)) {
    return Array.isArray(first) && Array.isArray(second)
      ? multisetSimilarity(first, second)
      : 0;
  }
  if (typeof first === "number" || typeof second === "number") {
    if (typeof first !== "number" || typeof second !== "number") return 0;
    const scale = Math.max(1, Math.abs(first), Math.abs(second));
    return Math.max(0, 1 - Math.abs(first - second) / scale);
  }
  return first === second ? 1 : 0;
}

/**
 * Weighted-field similarity. Every profile key is a reasoning characteristic;
 * absent keys count as a mismatch so a sparse profile cannot look identical to
 * a richer one. Arrays use multiset Jaccard similarity.
 */
export function calculateStructuralSimilarity(
  first: StructuralProfile,
  second: StructuralProfile,
  weights: Readonly<Record<string, number>> = {},
): number {
  if (first.namespace !== second.namespace) return 0;
  const keys = new Set([...Object.keys(first.features), ...Object.keys(second.features)]);
  let weightedSimilarity = 0;
  let totalWeight = 0;
  keys.forEach((key) => {
    const weight = weights[key] ?? 1;
    totalWeight += weight;
    const firstValue = first.features[key];
    const secondValue = second.features[key];
    if (firstValue !== undefined && secondValue !== undefined) {
      weightedSimilarity += featureSimilarity(firstValue, secondValue) * weight;
    }
  });
  return totalWeight === 0 ? 0 : Number((weightedSimilarity / totalWeight).toFixed(6));
}

export function fingerprintStructuralProfile(profile: StructuralProfile): string {
  return createFingerprint(`${profile.namespace}-rules`, profile as unknown as JsonValue);
}

function maximumSimilarity(
  candidate: StructuralProfile,
  profiles: readonly StructuralProfile[],
  weights: Readonly<Record<string, number>>,
): number | null {
  if (profiles.length === 0) return null;
  return Math.max(...profiles.map((profile) =>
    calculateStructuralSimilarity(candidate, profile, weights),
  ));
}

export function assessStructuralNovelty(
  candidate: StructuralProfile,
  options: {
    references?: readonly StructuralProfile[];
    recent?: readonly StructuralProfile[];
    weights?: Readonly<Record<string, number>>;
    referenceThreshold?: number;
    recentThreshold?: number;
  } = {},
): NoveltyComparison {
  const referenceThreshold = options.referenceThreshold ?? NOVELTY_POLICY.maximumReferenceSimilarity;
  const recentThreshold = options.recentThreshold ?? NOVELTY_POLICY.maximumRecentSimilarity;
  const weights = options.weights ?? {};
  const maximumReferenceSimilarity = maximumSimilarity(candidate, options.references ?? [], weights);
  const maximumRecentSimilarity = maximumSimilarity(candidate, options.recent ?? [], weights);
  return {
    accepted:
      (maximumReferenceSimilarity === null || maximumReferenceSimilarity < referenceThreshold) &&
      (maximumRecentSimilarity === null || maximumRecentSimilarity < recentThreshold),
    maximumReferenceSimilarity,
    maximumRecentSimilarity,
    referenceThreshold,
    recentThreshold,
  };
}
