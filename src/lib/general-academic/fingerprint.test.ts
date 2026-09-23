import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { createGeneralAcademicContentFingerprint } from "./fingerprint";
import { parseGeneralAcademicPackJson } from "./importer";

const fixture = readFileSync(resolve(
  process.cwd(),
  "docs/general-academic/examples/general-academic-pack-v1.json",
), "utf8");

function parsedFixture() {
  const result = parseGeneralAcademicPackJson(fixture);
  if (!result.ok) throw new Error("Fixture must parse.");
  return result.pack;
}

describe("General Academic content fingerprint", () => {
  it("is stable across non-material casing and whitespace differences", () => {
    const first = parsedFixture();
    const second = structuredClone(first);
    second.stimulus.text = `  ${second.stimulus.text.toUpperCase().replaceAll(" ", "   ")}  `;
    second.questions[0].prompt = second.questions[0].prompt.toUpperCase();
    expect(createGeneralAcademicContentFingerprint(second)).toBe(
      createGeneralAcademicContentFingerprint(first),
    );
  });

  it("changes when stimulus, prompt, or option content materially changes", () => {
    const original = parsedFixture();
    const changed = structuredClone(original);
    changed.questions[0].options[0].text = "41%";
    expect(createGeneralAcademicContentFingerprint(changed)).not.toBe(
      createGeneralAcademicContentFingerprint(original),
    );
  });
});
