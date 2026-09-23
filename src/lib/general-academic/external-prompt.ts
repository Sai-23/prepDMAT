import {
  GENERAL_ACADEMIC_DIFFICULTIES,
  GENERAL_ACADEMIC_DOMAINS,
  GENERAL_ACADEMIC_OPTION_IDS,
  GENERAL_ACADEMIC_SCHEMA_VERSION,
  GENERAL_ACADEMIC_SKILLS,
  type GeneralAcademicDifficulty,
  type GeneralAcademicDomain,
  type GeneralAcademicSkill,
} from "./registries";
import { getGeneralAcademicPackJsonSchema } from "./json-schema";

export type GeneralAcademicExternalPromptConfig = {
  domain: GeneralAcademicDomain;
  topic?: string;
  packDifficulty: GeneralAcademicDifficulty;
  questionCount: number;
  skills?: GeneralAcademicSkill[];
  representations?: Array<"text" | "formula" | "table" | "graph" | "figure">;
};

export function buildGeneralAcademicExternalPrompt(config: GeneralAcademicExternalPromptConfig) {
  if (!GENERAL_ACADEMIC_DOMAINS.includes(config.domain)) throw new Error("Unsupported General Academic domain.");
  if (!GENERAL_ACADEMIC_DIFFICULTIES.includes(config.packDifficulty)) throw new Error("Unsupported pack difficulty.");
  if (!Number.isInteger(config.questionCount) || config.questionCount < 1 || config.questionCount > 20) {
    throw new Error("Question count must be an integer from 1 to 20.");
  }
  const skills = config.skills?.length ? config.skills : [...GENERAL_ACADEMIC_SKILLS];
  if (skills.some((skill) => !GENERAL_ACADEMIC_SKILLS.includes(skill))) {
    throw new Error("Prompt skills must use the canonical registry.");
  }
  const representations = config.representations?.length
    ? config.representations.join(", ")
    : "text, with structured formulas/tables/graphs/figures only when academically useful";

  return [
    "Create an ORIGINAL PrepDMAT General Academic-style source pack.",
    `Return ONLY valid JSON conforming to schemaVersion \"${GENERAL_ACADEMIC_SCHEMA_VERSION}\". Do not wrap the JSON in Markdown or code fences.`,
    "The source must be self-contained. Every keyed answer must be derivable from the shared source, representations, or explicitly stated rules; do not require external knowledge.",
    `Domain: ${config.domain}`,
    `Topic: ${config.topic?.trim() || "choose a focused original topic within the requested domain"}`,
    `Pack difficulty: ${config.packDifficulty}`,
    `Linked question count: ${config.questionCount}`,
    `Allowed/requested skills: ${skills.join(", ")}`,
    `Representation preference: ${representations}`,
    `Each question must contain exactly four options with IDs ${GENERAL_ACADEMIC_OPTION_IDS.join(", ")} and exactly one correctOption.`,
    "Use only canonical difficulty IDs: easy, medium, hard. Pack and question difficulties may differ.",
    "Each explanation must include a non-empty summary, at least one non-empty step, and a non-empty takeaway that justifies the answer from the source or rules.",
    "For numeric validation metadata, percentage answer text uses decimal proportions: 25% => expectedValue 0.25, 80% => 0.8, 100% => 1, 104% => 1.04, and 160% => 1.6. Never use whole percentage points such as 80 for an answer displayed as 80%. Non-percentage answers remain on their displayed scale, such as 30 credits => 30 and 1.25 times => 1.25.",
    "Use structured data for formulas, tables, line/bar/scatter graphs, and diagram descriptors. Never include HTML, SVG, JavaScript, event handlers, iframes, or executable content.",
    "Set review.status to draft. Provenance fields may describe the provider/model, but must not contain credentials or claim approval/publication authority.",
    "Do not copy, reproduce, closely paraphrase, or claim to be an official dMAT passage or question. Create entirely original content.",
    "Canonical JSON Schema generated from the Phase 1 Zod source of truth:",
    JSON.stringify(getGeneralAcademicPackJsonSchema(), null, 2),
  ].join("\n\n");
}
