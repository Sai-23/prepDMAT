import type { EvidenceSourceProvenance } from "../evidence";
import { canDefineCurrentDmatProtocol } from "../evidence";
import {
  DEFAULT_LATIN_SYMBOLS,
  LATIN_SQUARE_SIZE,
} from "../generation/latin-squares/types";
import { MATHEMATICAL_EQUATION_DOMAIN } from "../generation/mathematical-equations/types";

export const DMAT_CORE_SECTION_TYPES = [
  "figure_sequence",
  "mathematical_equation",
  "latin_square",
] as const;

export type DmatCoreSectionType = (typeof DMAT_CORE_SECTION_TYPES)[number];

export const DMAT_CURRENT_CORE_PROTOCOL = {
  version: "dmat-core-2026-08-09",
  authority: "DMAT_CURRENT_OFFICIAL" as const,
  core: [
    { sectionType: "figure_sequence", title: "Figure Sequences", questionCount: 20, durationSeconds: 25 * 60 },
    { sectionType: "mathematical_equation", title: "Mathematical Equations", questionCount: 20, durationSeconds: 25 * 60 },
    { sectionType: "latin_square", title: "Latin Squares", questionCount: 20, durationSeconds: 25 * 60 },
  ],
  constraints: {
    mathematicalEquation: {
      variableDomain: MATHEMATICAL_EQUATION_DOMAIN,
      integersOnly: true,
    },
    latinSquare: {
      size: LATIN_SQUARE_SIZE,
      symbols: DEFAULT_LATIN_SYMBOLS,
      uniqueWithinRows: true,
      uniqueWithinColumns: true,
    },
  },
} as const;

export type ProtocolEvidenceClaim = {
  source: EvidenceSourceProvenance;
  sectionType: DmatCoreSectionType;
  questionCount?: number;
  durationSeconds?: number;
};

export type ProtocolEvidenceConflict = ProtocolEvidenceClaim & {
  reason: "not_protocol_authority" | "conflicts_with_current_dmat";
};

/**
 * Supporting claims are evaluated for conflicts but never merged into the configured protocol.
 * Updating the current protocol requires changing the versioned dMAT authority constant itself.
 */
export function resolveCurrentDmatCoreProtocol(
  claims: readonly ProtocolEvidenceClaim[] = [],
): {
  protocol: typeof DMAT_CURRENT_CORE_PROTOCOL;
  ignoredClaims: readonly ProtocolEvidenceConflict[];
} {
  const ignoredClaims = claims.flatMap((claim): ProtocolEvidenceConflict[] => {
    const current = DMAT_CURRENT_CORE_PROTOCOL.core.find((section) =>
      section.sectionType === claim.sectionType);
    const conflicts = !current ||
      (claim.questionCount !== undefined && claim.questionCount !== current.questionCount) ||
      (claim.durationSeconds !== undefined && claim.durationSeconds !== current.durationSeconds);
    if (!canDefineCurrentDmatProtocol(claim.source)) {
      return [{ ...claim, reason: "not_protocol_authority" }];
    }
    return conflicts ? [{ ...claim, reason: "conflicts_with_current_dmat" }] : [];
  });
  return { protocol: DMAT_CURRENT_CORE_PROTOCOL, ignoredClaims };
}

