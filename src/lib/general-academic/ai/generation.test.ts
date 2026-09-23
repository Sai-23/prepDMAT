import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { canonicalGeneralAcademicPackSchema } from "../schemas";
import type { GeneralAcademicGenerationConfig } from "./generation-config";
import { normalizeGeneratedPackProvenance, processGeneralAcademicGenerationResult } from "./generation";
import type { GamGenerationProviderRawResult } from "./types";

const fixture = () => canonicalGeneralAcademicPackSchema.parse(JSON.parse(readFileSync(resolve(process.cwd(), "docs/general-academic/examples/general-academic-pack-v1.json"), "utf8")));
const raw = (output: unknown, usage: GamGenerationProviderRawResult["usage"] = { inputTokens: 10, outputTokens: 20, totalTokens: 30 }): GamGenerationProviderRawResult => ({ output, generationId: "resp_safe_123", route: "gam-production-route", generatedAt: "2026-09-02T00:00:00.000Z", usage });
const config = (pack = fixture()): GeneralAcademicGenerationConfig => ({ domain: pack.domain, topic: pack.topic, packDifficulty: pack.difficulty, questionCount: pack.questions.length, skills: [], representations: ["text"] });

describe("provider-neutral canonical generation processing", () => {
  it("imports a valid mocked structured response through the Phase 1 importer", () => {
    const result = processGeneralAcademicGenerationResult(config(), raw(fixture()));
    expect(result).toMatchObject({ ok: true, validation: { structural: "valid" } });
  });

  it("forces lifecycle and provenance server-side", () => {
    const pack = fixture();
    pack.origin = "manual";
    pack.sourceMeta = { provider: "attacker", model: "fake", generationId: "fake" };
    pack.review.status = "published";
    const result = processGeneralAcademicGenerationResult(config(pack), raw(pack));
    expect(result.ok && result.pack).toMatchObject({
      origin: "external_ai",
      sourceMeta: { provider: "omniroute", model: "gam-production-route", generationId: "resp_safe_123", generatedAt: "2026-09-02T00:00:00.000Z" },
      review: { status: "draft", notes: null },
    });
  });

  it("does not retain model-supplied provenance fields", () => {
    const normalized = normalizeGeneratedPackProvenance({ sourceMeta: { externalReference: "secret" } }, raw({}));
    expect(normalized.sourceMeta).toMatchObject({ provider: "omniroute", model: "gam-production-route", externalReference: null });
    expect(JSON.stringify(normalized)).not.toContain("secret");
  });

  it("rejects malformed canonical content", () => {
    expect(processGeneralAcademicGenerationResult(config(), raw({ title: "invalid" }))).toMatchObject({ ok: false, error: { code: "CANONICAL_VALIDATION" } });
  });

  it("rejects unsafe generated markup through canonical safety validation", () => {
    const pack = fixture();
    pack.stimulus.text = "<script>alert(1)</script>";
    expect(processGeneralAcademicGenerationResult(config(pack), raw(pack))).toMatchObject({ ok: false, error: { code: "CANONICAL_VALIDATION" } });
  });

  it("rejects a question count that differs from server config", () => {
    const pack = fixture();
    expect(processGeneralAcademicGenerationResult({ ...config(pack), questionCount: pack.questions.length + 1 }, raw(pack))).toMatchObject({ ok: false });
  });

  it("rejects a domain that differs from server config", () => {
    const pack = fixture();
    expect(processGeneralAcademicGenerationResult({ ...config(pack), domain: "humanities" }, raw(pack))).toMatchObject({ ok: false });
  });

  it("rejects a pack difficulty that differs from server config", () => {
    const pack = fixture();
    expect(processGeneralAcademicGenerationResult({ ...config(pack), packDifficulty: pack.difficulty === "easy" ? "hard" : "easy" }, raw(pack))).toMatchObject({ ok: false });
  });

  it("parses usage safely when present and tolerates its absence", () => {
    const present = processGeneralAcademicGenerationResult(config(), raw(fixture()));
    const absent = processGeneralAcademicGenerationResult(config(), raw(fixture(), null));
    expect(present.ok && present.usage).toEqual({ inputTokens: 10, outputTokens: 20, totalTokens: 30 });
    expect(absent.ok && absent.usage).toBeNull();
  });
});
