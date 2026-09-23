import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { getGeneralAcademicPackJsonSchema } from "./json-schema";

describe("General Academic JSON Schema export", () => {
  it("keeps the committed provider schema synchronized with Zod", () => {
    const committed = JSON.parse(readFileSync(resolve(
      process.cwd(),
      "docs/general-academic/general-academic-pack-v1.schema.json",
    ), "utf8"));
    expect(committed).toEqual(getGeneralAcademicPackJsonSchema());
    expect(JSON.stringify(committed)).not.toMatch(/api[_-]?key|secret|service[_-]?role/i);
  });
});
