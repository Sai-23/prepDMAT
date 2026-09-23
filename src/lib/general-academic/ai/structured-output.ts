import "server-only";

import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import type { JsonValue } from "@/lib/generation/types";

import { GENERAL_ACADEMIC_LIMITS } from "../limits";
import {
  canonicalGeneralAcademicPackSchema,
  generalAcademicFigureSchema,
  generalAcademicStimulusSchema,
} from "../schemas";

// The gateway's OpenAI-compatible strict Structured Outputs require object schemas with a fixed property
// list and `additionalProperties: false`. The canonical Phase 1 figure.data
// field deliberately also accepts arbitrary-key JSON records, so the provider
// request narrows only that field to recursively nested primitive arrays.
// This is a subset of the canonical JsonValue contract; the canonical importer
// and validator still validate the returned pack without modification.
const gatewayJsonPrimitiveSchema = z.union([z.string(), z.number().finite(), z.boolean(), z.null()]);
const gatewayCompatibleFigureDataSchema: z.ZodType<JsonValue> = z.lazy(() => z.union([
  gatewayJsonPrimitiveSchema,
  z.array(gatewayCompatibleFigureDataSchema).max(GENERAL_ACADEMIC_LIMITS.structuredDataNodes),
]));

const gatewayCompatibleFigureSchema = generalAcademicFigureSchema.safeExtend({
  data: gatewayCompatibleFigureDataSchema,
});
const gatewayCompatibleStimulusSchema = generalAcademicStimulusSchema.extend({
  figures: z.array(gatewayCompatibleFigureSchema).max(GENERAL_ACADEMIC_LIMITS.figuresPerPack),
});
const gatewayCompatiblePackSchema = canonicalGeneralAcademicPackSchema.safeExtend({
  stimulus: gatewayCompatibleStimulusSchema,
});

export function getGeneralAcademicStructuredTextFormat() {
  return zodTextFormat(
    gatewayCompatiblePackSchema,
    "general_academic_pack_v1",
    { description: "One original PrepDMAT General Academic source pack in the canonical Phase 1 format." },
  );
}
