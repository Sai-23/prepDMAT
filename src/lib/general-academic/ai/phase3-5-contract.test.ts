import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const action = source("src/app/admin/general-academic/generation-actions.ts");
const studio = source("src/components/admin/general-academic-generation-studio.tsx");
const provider = source("src/lib/general-academic/ai/providers/omniroute.ts");
const router = source("src/lib/general-academic/ai/router.ts");
const types = source("src/lib/general-academic/ai/types.ts");
const generation = source("src/lib/general-academic/ai/generation.ts");
const envExample = source(".env.example");

describe("General Academic Phase 3.5 integration contract", () => {
  it("keeps manual, import and external-prompt GAM flows independent from OmniRoute", () => {
    const independent = [
      "src/app/admin/general-academic/new/page.tsx",
      "src/lib/general-academic/import-flow.ts",
      "src/lib/general-academic/external-prompt.ts",
      "src/components/admin/general-academic-import-studio.tsx",
    ].map(source).join("\n");
    expect(independent).not.toMatch(/omniroute|OMNIROUTE_|providers\/omniroute/i);
  });

  it("adds an admin-authorized generation route and Studio entry", () => {
    const route = "src/app/admin/general-academic/generate/page.tsx";
    expect(existsSync(resolve(process.cwd(), route))).toBe(true);
    expect(source(route)).toContain('requireRole(["admin"])');
    expect(source("src/app/admin/general-academic/page.tsx")).toContain("/admin/general-academic/generate");
  });

  it("keeps OmniRoute credentials server-only and optional", () => {
    expect(envExample).toContain("OMNIROUTE_BASE_URL=");
    expect(envExample).toContain("OMNIROUTE_API_KEY=");
    expect(envExample).not.toContain("NEXT_PUBLIC_OMNIROUTE");
    expect(studio).not.toContain("OMNIROUTE_API_KEY");
    expect(action).not.toContain("OMNIROUTE_API_KEY");
    expect(provider).toContain('import "server-only"');
  });

  it("does not use legacy OpenAI credentials or a direct provider fallback", () => {
    const active = [envExample, action, studio, provider, router, generation].join("\n");
    expect(active).not.toContain("OPENAI_API_KEY");
    expect(active).not.toContain("OPENAI_GAM_MODEL");
    expect(provider).toContain("baseURL: normalizeBaseUrl(env.OMNIROUTE_BASE_URL)");
    expect(provider).toContain("apiKey: env.OMNIROUTE_API_KEY");
  });

  it("defines and routes through a provider-neutral interface", () => {
    expect(types).toContain("export interface GamGenerationProvider");
    expect(types).toContain("generate(config:");
    expect(router).toContain("provider: GamGenerationProvider");
    expect(router).toContain("provider.generate(config)");
    expect(generation).toContain("generateGamPackWithProvider(config)");
  });

  it("uses the OmniRoute-compatible Responses API with canonical structured output", () => {
    expect(provider).toContain("client.responses.create");
    expect(provider).not.toContain("chat.completions");
    expect(source("src/lib/general-academic/ai/structured-output.ts")).toContain("canonicalGeneralAcademicPackSchema");
    expect(source("src/lib/general-academic/ai/structured-output.ts")).toContain("zodTextFormat");
  });

  it("keeps the route/model server-controlled and absent from browser input", () => {
    expect(provider).toContain("model: status.route");
    expect(envExample).toContain("OMNIROUTE_GAM_MODEL=");
    expect(studio).not.toMatch(/name=["'](?:model|provider|route)["']/);
    expect(source("src/lib/general-academic/ai/generation-config.ts")).not.toMatch(/\bmodel\b|\bprovider\b|\broute\b/);
  });

  it("routes generated output through the existing importer and validator", () => {
    expect(generation).toContain("parseGeneralAcademicPackJson");
    expect(generation).toContain("validateGeneralAcademicPack");
    expect(generation).toContain('origin: "external_ai"');
    expect(generation).toContain('provider: "omniroute"');
    expect(generation).toContain('status: "draft"');
  });

  it("proves generation performs zero database content writes", () => {
    const combined = [action, provider, router, generation, studio].join("\n");
    expect(combined).not.toContain("createGeneralAcademicDraft");
    expect(combined).not.toContain("updateGeneralAcademicDraft");
    expect(combined).not.toMatch(/\.from\(["']general_academic_(?:source_packs|questions)["']\)\.(?:insert|update|upsert)/);
  });

  it("keeps Save Draft in the shared editor as the first persistence point", () => {
    expect(studio).toContain("No database content has been created. Save Draft in the editor is the first persistence point.");
    expect(studio).toContain("<GeneralAcademicEditor");
    expect(source("src/components/admin/general-academic-import-studio.tsx")).toContain("<GeneralAcademicEditor");
    expect(source("src/app/admin/general-academic/new/page.tsx")).toContain("<GeneralAcademicEditor");
  });

  it("retains fallback, review, export and double-submit UX", () => {
    expect(studio).toContain("Copy external-AI prompt");
    expect(studio).toContain("Import JSON");
    expect(studio).toContain("Structure valid");
    expect(studio).toContain("not factual correctness");
    expect(studio).toContain("Export JSON");
    expect(studio).toContain("submittingRef.current");
    expect(studio).toContain("disabled={generating");
  });

  it("uses provider-neutral UI and safe error vocabulary", () => {
    expect(studio).toContain("AI generation:");
    expect(studio).toContain("Route:");
    expect(studio).not.toContain("OpenAI generation");
    expect(provider).toContain("GATEWAY_TIMEOUT");
    expect(provider).toContain("GATEWAY_ROUTE_UNAVAILABLE");
    expect(provider).toContain("GATEWAY_UPSTREAM_EXHAUSTED");
  });

  it("applies the existing database rate limiter before gateway generation", () => {
    expect(action).toContain('enforceSecurityRateLimit("generation:general-academic", { userId: user.id })');
    expect(action.indexOf("enforceSecurityRateLimit")).toBeLessThan(action.indexOf("generateGeneralAcademicPack(config.data)"));
    const limiter = source("src/lib/security/rate-limit.ts");
    expect(limiter).toContain('"generation:general-academic"');
    expect(limiter).toContain("OMNIROUTE_GAM_DAILY_LIMIT");
  });

  it("keeps the existing bounded timeout and no tool usage", () => {
    expect(envExample).toContain("OMNIROUTE_GAM_TIMEOUT_MS=55000");
    expect(provider).toContain("timeout: status.timeoutMs");
    expect(provider).not.toMatch(/\btools\s*:/);
  });

  it("adds no student generation entry point and no publish path", () => {
    const studentFiles = ["src/app/practice/actions.ts", "src/app/tests/actions.ts", "src/app/diagnostic/actions.ts", "src/app/onboarding/actions.ts", "src/app/dashboard/page.tsx"]
      .filter((path) => existsSync(resolve(process.cwd(), path))).map(source).join("\n");
    expect(studentFiles).not.toContain("generateGeneralAcademicWithAIAction");
    expect(studentFiles).not.toMatch(/providers\/omniroute|OMNIROUTE_/);
    expect([action, studio, generation].join("\n")).not.toMatch(/publishGeneralAcademic|auto.?publish/i);
  });
});
