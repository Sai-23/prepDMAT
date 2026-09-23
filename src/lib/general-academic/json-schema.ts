import { z } from "zod";

import { GENERAL_ACADEMIC_SCHEMA_VERSION } from "./registries";
import { canonicalGeneralAcademicPackSchema } from "./schemas";

export const GENERAL_ACADEMIC_PACK_JSON_SCHEMA = {
  ...z.toJSONSchema(canonicalGeneralAcademicPackSchema, {
    target: "draft-2020-12",
    io: "input",
  }),
  $id: `https://prepdmat.in/schemas/${GENERAL_ACADEMIC_SCHEMA_VERSION}.schema.json`,
  title: "PrepDMAT General Academic Source Pack v1",
  description: "Provider-independent canonical interchange contract for a draftable General Academic source pack.",
} as const;

export function getGeneralAcademicPackJsonSchema() {
  return structuredClone(GENERAL_ACADEMIC_PACK_JSON_SCHEMA);
}
