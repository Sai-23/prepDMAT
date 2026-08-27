import type { EvidenceSourceProvenance } from "./model";

export const PROTOCOL_SOURCE_ROLES = {
  DMAT_CURRENT_OFFICIAL: "protocol_authority",
  TESTAS_CURRENT_OFFICIAL: "supporting_core_format",
  TESTAS_HISTORICAL_OFFICIAL: "mechanics_difficulty_reasoning_only",
  THIRD_PARTY: "generator_rule_support_only",
} as const satisfies Record<EvidenceSourceProvenance, string>;

export const EVIDENCE_SOURCE_CATALOG = {
  DMAT_CURRENT_OFFICIAL: {
    id: "dmat-general-academic-preparatory-materials-2026-07",
    official: true,
    role: PROTOCOL_SOURCE_ROLES.DMAT_CURRENT_OFFICIAL,
    url: "https://www.d-mat.de/wp-content/uploads/2026/07/260716_dMAT_General-Academic-Module_Preparatoy-Materials_EN.pdf",
  },
  TESTAS_CURRENT_OFFICIAL: {
    id: "testas-digital-structure-current",
    official: true,
    role: PROTOCOL_SOURCE_ROLES.TESTAS_CURRENT_OFFICIAL,
    url: "https://www.testas.de/en/teilnehmende/the-digital-testas/structure-of-the-digital-testas",
  },
  TESTAS_HISTORICAL_OFFICIAL: {
    id: "digital-testas-preparatory-materials-2022-04",
    official: true,
    role: PROTOCOL_SOURCE_ROLES.TESTAS_HISTORICAL_OFFICIAL,
    url: "https://www.testas.de/fileadmin/bilder/4_pdf-video/1-teilnehmende/230531_digitalertestas_preparatory_materials.pdf",
  },
  THIRD_PARTY: {
    id: "third-party-supporting-evidence",
    official: false,
    role: PROTOCOL_SOURCE_ROLES.THIRD_PARTY,
    url: null,
  },
} as const satisfies Record<EvidenceSourceProvenance, {
  id: string;
  official: boolean;
  role: string;
  url: string | null;
}>;

export function canDefineCurrentDmatProtocol(source: EvidenceSourceProvenance): boolean {
  return PROTOCOL_SOURCE_ROLES[source] === "protocol_authority";
}

