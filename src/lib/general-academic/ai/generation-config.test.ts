import { describe, expect, it } from "vitest";

import {
  GENERAL_ACADEMIC_DIFFICULTIES,
  GENERAL_ACADEMIC_DOMAINS,
  GENERAL_ACADEMIC_SKILLS,
} from "../registries";
import {
  DEFAULT_GENERAL_ACADEMIC_GENERATION_CONFIG,
  generalAcademicGenerationConfigSchema,
} from "./generation-config";

const valid = () => ({ ...DEFAULT_GENERAL_ACADEMIC_GENERATION_CONFIG });

describe("General Academic AI generation configuration", () => {
  it.each(GENERAL_ACADEMIC_DOMAINS)("accepts canonical domain %s", (domain) => {
    expect(generalAcademicGenerationConfigSchema.safeParse({ ...valid(), domain }).success).toBe(true);
  });

  it("rejects an invalid domain", () => {
    expect(generalAcademicGenerationConfigSchema.safeParse({ ...valid(), domain: "medicine" }).success).toBe(false);
  });

  it.each(GENERAL_ACADEMIC_DIFFICULTIES)("accepts canonical difficulty %s", (packDifficulty) => {
    expect(generalAcademicGenerationConfigSchema.safeParse({ ...valid(), packDifficulty }).success).toBe(true);
  });

  it("rejects an invalid difficulty", () => {
    expect(generalAcademicGenerationConfigSchema.safeParse({ ...valid(), packDifficulty: "expert" }).success).toBe(false);
  });

  it.each([1, 6, 20])("accepts bounded question count %d", (questionCount) => {
    expect(generalAcademicGenerationConfigSchema.safeParse({ ...valid(), questionCount }).success).toBe(true);
  });

  it.each([0, 21, 1.5])("rejects invalid question count %s", (questionCount) => {
    expect(generalAcademicGenerationConfigSchema.safeParse({ ...valid(), questionCount }).success).toBe(false);
  });

  it("accepts and deduplicates canonical skills", () => {
    const result = generalAcademicGenerationConfigSchema.parse({ ...valid(), skills: [GENERAL_ACADEMIC_SKILLS[0], GENERAL_ACADEMIC_SKILLS[0], GENERAL_ACADEMIC_SKILLS[1]] });
    expect(result.skills).toEqual([GENERAL_ACADEMIC_SKILLS[0], GENERAL_ACADEMIC_SKILLS[1]]);
  });

  it("rejects an invalid skill", () => {
    expect(generalAcademicGenerationConfigSchema.safeParse({ ...valid(), skills: ["browse_the_web"] }).success).toBe(false);
  });

  it("validates representations and always restores text", () => {
    const result = generalAcademicGenerationConfigSchema.parse({ ...valid(), representations: ["table", "graph", "table"] });
    expect(result.representations).toEqual(["text", "table", "graph"]);
    expect(generalAcademicGenerationConfigSchema.safeParse({ ...valid(), representations: ["image"] }).success).toBe(false);
  });

  it("bounds, trims and normalizes an optional topic", () => {
    expect(generalAcademicGenerationConfigSchema.parse({ ...valid(), topic: "  Thermal systems  " }).topic).toBe("Thermal systems");
    expect(generalAcademicGenerationConfigSchema.parse({ ...valid(), topic: "   " }).topic).toBeUndefined();
    expect(generalAcademicGenerationConfigSchema.safeParse({ ...valid(), topic: "x".repeat(201) }).success).toBe(false);
    expect(generalAcademicGenerationConfigSchema.safeParse({ ...valid(), topic: "safe\u0000unsafe" }).success).toBe(false);
  });

  it("rejects unknown client-controlled fields such as model", () => {
    expect(generalAcademicGenerationConfigSchema.safeParse({ ...valid(), model: "anything-I-want" }).success).toBe(false);
  });
});
