import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GENERAL_ACADEMIC_REVIEW_CHECKLIST } from "./lifecycle";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const actions = read("src/app/admin/general-academic/phase8-actions.ts");
const data = read("src/lib/general-academic/content-intelligence-data.ts");
const intelligence = read("src/lib/general-academic/content-intelligence.ts");
const coveragePage = read("src/app/admin/general-academic/coverage/page.tsx");
const qualityPage = read("src/app/admin/general-academic/quality/page.tsx");
const reviewPage = read("src/app/admin/general-academic/review/page.tsx");
const reportRoute = read("src/app/admin/general-academic/report/route.ts");
const generation = read("src/components/admin/general-academic-generation-studio.tsx");
const batchImport = read("src/components/admin/general-academic-batch-import.tsx");
const reviewQueue = read("src/components/admin/general-academic-review-queue.tsx");

describe("Phase 8 admin and security contracts", () => {
  it.each([coveragePage, qualityPage, reviewPage, reportRoute])("guards every new route with the admin role", (source) => {
    expect(source).toContain('requireRole(["admin"])');
  });

  it("keeps content intelligence in a server-only DAL", () => {
    expect(data.startsWith('import "server-only";')).toBe(true);
    expect(data).toContain("isAdmin(userId)");
  });

  it("never references provider secrets from Phase 8 client components", () => {
    for (const source of [generation, batchImport, reviewQueue]) {
      expect(source).not.toMatch(/OMNIROUTE_(?:API_KEY|BASE_URL|GAM_MODEL)/);
      expect(source).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    }
  });

  it("requires admin authorization inside every Phase 8 server action", () => {
    expect(actions.match(/requireRole\(\["admin"\]\)/g)?.length).toBe(4);
  });

  it("consumes the existing generation limiter per generated item", () => {
    expect(actions).toContain('enforceSecurityRateLimit("generation:general-academic"');
    expect(actions.indexOf("for (let index")).toBeLessThan(actions.indexOf('enforceSecurityRateLimit("generation:general-academic"'));
  });

  it("does not automatically approve or publish generated content", () => {
    const generationSection = actions.slice(actions.indexOf("generateGeneralAcademicBatchAction"), actions.indexOf("previewGeneralAcademicBatchImportAction"));
    expect(generationSection).toContain("createGeneralAcademicDraft");
    expect(generationSection).not.toContain("transitionGeneralAcademicPack");
  });

  it("limits bulk lifecycle operations to review submission or publishing", () => {
    expect(actions).toContain('target: z.enum(["needs_review", "published"])');
    expect(actions).not.toContain('target: z.enum(["approved"');
  });

  it("keeps batch import preview separate from persistence", () => {
    const preview = actions.slice(actions.indexOf("previewGeneralAcademicBatchImportAction"), actions.indexOf("saveGeneralAcademicBatchImportAction"));
    expect(preview).toContain("addGeneralAcademicBatchSimilarity");
    expect(preview).not.toContain("createGeneralAcademicDraft");
  });

  it("revalidates every Phase 8 inventory route after writes", () => {
    for (const route of ["/admin/general-academic/coverage", "/admin/general-academic/quality", "/admin/general-academic/review"]) expect(actions).toContain(route);
  });

  it("makes report downloads private and non-cacheable", () => {
    expect(reportRoute).toContain('"Cache-Control": "private, no-store"');
    expect(reportRoute).toContain("exportGeneralAcademicContentReportCsv");
  });

  it("does not query student records for content reporting", () => {
    expect(data).not.toMatch(/practice_attempts|mock_attempts|profiles|student/i);
    expect(intelligence).not.toMatch(/user_id|email|selected_option/);
  });
});

describe("Phase 8 UX and editorial contracts", () => {
  it("provides coverage, quality, review, and report routes", () => {
    expect(coveragePage).toContain("GeneralAcademicCoverageDashboard");
    expect(qualityPage).toContain("GeneralAcademicQualityDashboard");
    expect(reviewPage).toContain("GeneralAcademicReviewQueue");
    expect(reportRoute).toContain("text/csv");
  });

  it("labels targets as PrepDMAT internal rather than official", () => {
    const dashboard = read("src/components/admin/general-academic-content-dashboard.tsx");
    expect(dashboard).toContain("PrepDMAT internal inventory");
    expect(dashboard).toContain("not official dMAT distribution targets");
  });

  it("includes all required cross-coverage matrices", () => {
    const component = read("src/components/admin/general-academic-coverage.tsx");
    for (const title of ["Domain × Skill", "Domain × Difficulty", "Skill × Difficulty", "Domain × Representation"]) expect(component).toContain(title);
  });

  it("uses semantic tables with controlled horizontal scrolling", () => {
    const component = read("src/components/admin/general-academic-coverage.tsx");
    expect(component).toContain("overflow-x-auto");
    expect(component).toContain("<table");
    expect(component).toContain('scope="row"');
  });

  it("uses visible text rather than color alone for coverage state", () => {
    const component = read("src/components/admin/general-academic-coverage.tsx");
    expect(component).toContain('value === "good"');
    expect(component).toContain("State");
  });

  it("describes similarity as a review signal", () => {
    const quality = read("src/components/admin/general-academic-quality-dashboard.tsx");
    expect(quality).toContain("review signal, not a plagiarism verdict");
  });

  it("keeps seven-check approval in the existing individual review flow", () => {
    expect(GENERAL_ACADEMIC_REVIEW_CHECKLIST).toHaveLength(7);
    expect(reviewQueue).toContain("Approval is never available as a bulk action");
  });

  it("bounds generation at five packs and import at twenty", () => {
    const batch = read("src/lib/general-academic/batch.ts");
    expect(batch).toContain("GENERAL_ACADEMIC_BATCH_GENERATION_MAX = 5");
    expect(batch).toContain("GENERAL_ACADEMIC_BATCH_IMPORT_MAX = 20");
  });

  it("gives generated batches explicit diversity guidance", () => {
    const prompt = read("src/lib/general-academic/ai/prompt.ts");
    expect(prompt).toContain("materially distinct scenario, source structure, reasoning path, context, and answer-position pattern");
  });

  it("shows per-item batch outcomes", () => {
    expect(generation).toContain("batchResult.items.map");
    expect(batchImport).toContain("saveResult.items.map");
  });

  it("provides keyboard-labelled selection controls", () => {
    expect(reviewQueue).toContain("aria-label={`Select ${item.title}`}");
    expect(batchImport).toContain("aria-live");
  });

  it("preserves canonical taxonomies instead of declaring Phase 8 alternatives", () => {
    expect(intelligence).toContain("GENERAL_ACADEMIC_DOMAINS");
    expect(intelligence).toContain("GENERAL_ACADEMIC_SKILLS");
    expect(intelligence).toContain("GENERAL_ACADEMIC_DIFFICULTIES");
  });

  it("does not add runtime student AI", () => {
    expect(actions.startsWith('"use server";')).toBe(true);
    expect(actions).not.toContain("practice/general-academic");
    expect(actions).not.toContain("mock/general-academic");
  });
});
