import type { StructuralProfile } from "./novelty";

/**
 * Only normalized reasoning profiles belong here. The repository does not
 * contain the official question bodies. The mathematical profile below is the
 * explicit near-copy example supplied in the generator audit brief.
 */
export const REFERENCE_STRUCTURAL_PROFILES: readonly StructuralProfile[] = [
  {
    namespace: "mathematical_equation",
    features: {
      fingerprintVersion: "v2",
      variableCount: 2,
      equationCount: 2,
      graph: "direct",
      relationships: ["offset_difference", "scale_divide"],
      dependencyDepth: 1,
      substitutionDepth: 1,
      branchCount: 0,
      recombinationCount: 0,
      constraintType: "scale_divide",
      targetDepth: 1,
      termCounts: ["2", "2"],
      rootStrategy: "coupled",
      stepRoles: [
        "step0:depth0:parents0:support1:combine_equations:scale_divide",
        "step1:depth1:parents1:support0:substitute:scale_divide",
      ],
      equationShapes: [
        "negative:scaled,positive:unit|constant:none",
        "negative:unit,positive:unit|constant:negative",
      ],
      reasoningModes: ["combine_equations", "substitute"],
      operatorVariety: 2,
      directEntryPointCount: 0,
    },
  },
] as const;

export function referenceProfilesFor(
  namespace: StructuralProfile["namespace"],
): readonly StructuralProfile[] {
  return REFERENCE_STRUCTURAL_PROFILES.filter((profile) => profile.namespace === namespace);
}
