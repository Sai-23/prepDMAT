import { describe, expect, it } from "vitest";

import { GENERAL_ACADEMIC_DOMAINS, GENERAL_ACADEMIC_SCHEMA_VERSION } from "../registries";
import { getGeneralAcademicStructuredTextFormat } from "./structured-output";

describe("gateway Structured Output canonical schema", () => {
  const format = getGeneralAcademicStructuredTextFormat();
  const schema = format.schema as Record<string, unknown>;

  it("uses strict JSON Schema Structured Outputs", () => {
    expect(format.type).toBe("json_schema");
    expect(format.strict).toBe(true);
    expect(format.name).toBe("general_academic_pack_v1");
  });

  it("derives the schema version and domain registry from the canonical Zod schema", () => {
    const serialized = JSON.stringify(schema);
    expect(serialized).toContain(GENERAL_ACADEMIC_SCHEMA_VERSION);
    GENERAL_ACADEMIC_DOMAINS.forEach((domain) => expect(serialized).toContain(domain));
  });

  it("retains exact question limits and four-option structure", () => {
    const serialized = JSON.stringify(schema);
    expect(serialized).toContain('"maxItems":20');
    expect(serialized).toContain('"minItems":4');
    expect(serialized).toContain('"maxItems":4');
  });

  it("uses the SDK strict-schema transform instead of a manually copied provider schema", () => {
    expect(schema.additionalProperties).toBe(false);
    expect(Array.isArray(schema.required)).toBe(true);
  });

  it("narrows only arbitrary-key figure data to a gateway-compatible canonical subset", () => {
    const serialized = JSON.stringify(schema);
    expect(serialized).toContain('"figures"');
    expect(serialized).not.toContain('"additionalProperties":{"$ref"');
  });
});
