import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

describe("General Academic Phase 4 product contract", () => {
  const studio = source("src/components/admin/general-academic-generation-studio.tsx");
  const math = source("src/components/general-academic/math-expression.tsx");
  const review = source("src/app/admin/general-academic/[id]/review/page.tsx");
  const edit = source("src/app/admin/general-academic/[id]/edit/page.tsx");
  const lifecycleAction = source("src/app/admin/general-academic/lifecycle-actions.ts");
  const qualitySummary = source("src/components/admin/general-academic-quality-summary.tsx");

  it("keeps normal generation focused on domain, topic, difficulty and question count", () => {
    for (const label of ["Domain *", "Topic", "Pack difficulty *", "Question count *"]) expect(studio).toContain(label);
    expect(studio).toContain("Generate Pack");
  });

  it("keeps advanced skill and representation overrides collapsed initially", () => {
    const details = studio.match(/<details[^>]*>/)?.[0];
    expect(details).toBeDefined();
    expect(details).not.toMatch(/\bopen\b/);
    expect(studio).toContain("Target skills");
    expect(studio).toContain("Representation preferences");
  });

  it("makes generation ephemeral until the shared editor saves a draft", () => {
    expect(studio).toContain("No database content has been created");
    expect(studio).toContain("Save Draft");
    expect(studio).toContain("GeneralAcademicEditor");
  });

  it("uses one shared FormulaCard in editor and review previews", () => {
    const preview = source("src/components/admin/general-academic-preview.tsx");
    const editor = source("src/components/admin/general-academic-editor.tsx");
    expect(preview).toContain("<FormulaCard");
    expect(editor).toContain("<FormulaCard");
    expect(review).toContain("<GeneralAcademicPreview");
  });

  it("keeps long math responsive and retains accessible source text", () => {
    expect(math).toContain("overflow-x-auto");
    expect(math).toContain("min-w-0");
    expect(math).toContain("aria-label={fallback}");
  });

  it("keeps review and lifecycle mutations admin-only", () => {
    expect(review).toContain('requireRole(["admin"])');
    expect(lifecycleAction).toContain('requireRole(["admin"])');
    expect(lifecycleAction).toContain("transitionGeneralAcademicPack(");
  });

  it("locks every non-draft pack out of the normal editor", () => {
    expect(edit).toContain('stored.pack.review.status !== "draft"');
    expect(edit).toContain("Only draft packs can be edited");
  });

  it("shows transparent findings and metrics without inventing a quality score", () => {
    expect(qualitySummary).toContain("blocking");
    expect(qualitySummary).toContain("warnings");
    expect(qualitySummary).toContain("Answer positions");
    expect(qualitySummary).not.toMatch(/quality score|score:\s/i);
  });

  it("keeps Phase 4 authoring routes admin-scoped as later student phases are added", () => {
    const appRoot = resolve(process.cwd(), "src/app");
    const routes = filesUnder(appRoot)
      .map((path) => relative(appRoot, path).replaceAll("\\", "/"))
      .filter((path) => path.includes("general-academic"));
    const adminRoutes = routes.filter((path) => path.startsWith("admin/general-academic/"));
    const studentRoutes = routes.filter((path) =>
      path.startsWith("practice/general-academic/")
      || path.startsWith("progress/general-academic/")
      || path.startsWith("mock/general-academic/"));
    expect(adminRoutes.length).toBeGreaterThan(0);
    expect(studentRoutes.length).toBeGreaterThan(0);
    expect(routes.length).toBe(adminRoutes.length + studentRoutes.length);
  });

  it("introduces no provider-specific canonical GAM schema or AI reviewer", () => {
    const gamFiles = filesUnder(resolve(process.cwd(), "src/lib/general-academic"));
    const canonicalSources = gamFiles.filter((path) => path.replaceAll("\\", "/").endsWith("/schemas.ts"));
    expect(canonicalSources).toHaveLength(1);
    expect(canonicalSources[0].replaceAll("\\", "/")).toMatch(/general-academic\/schemas\.ts$/);
    expect(gamFiles.some((path) => /ai-review|ai_reviewer|semantic-duplicate/i.test(path))).toBe(false);
  });
});
