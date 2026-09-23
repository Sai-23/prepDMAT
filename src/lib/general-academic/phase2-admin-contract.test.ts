import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GeneralAcademicPreview } from "@/components/admin/general-academic-preview";
import { adminNavigation, navigationForRoles } from "@/lib/constants/navigation";
import { canonicalGeneralAcademicPackSchema } from "./schemas";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const routeFiles = [
  "src/app/admin/general-academic/page.tsx",
  "src/app/admin/general-academic/new/page.tsx",
  "src/app/admin/general-academic/import/page.tsx",
  "src/app/admin/general-academic/[id]/edit/page.tsx",
];

describe("General Academic Admin routing contract", () => {
  it("adds every Phase 2 admin route", () => {
    routeFiles.forEach((path) => expect(existsSync(resolve(process.cwd(), path))).toBe(true));
  });

  it("rechecks admin authorization in every page", () => {
    routeFiles.forEach((path) => expect(source(path)).toContain('requireRole(["admin"])'));
  });

  it("shows the Studio only in administrator navigation", () => {
    expect(navigationForRoles(adminNavigation, ["admin"]).some((item) => String(item.href) === "/admin/general-academic")).toBe(true);
    expect(navigationForRoles(adminNavigation, ["reviewer"]).some((item) => String(item.href) === "/admin/general-academic")).toBe(false);
    expect(navigationForRoles(adminNavigation, ["student"])).toEqual([]);
  });

  it("leaves existing Core Admin destinations intact", () => {
    const hrefs = adminNavigation.map((item) => item.href);
    expect(hrefs).toEqual(expect.arrayContaining(["/admin", "/admin/generate", "/admin/questions/new", "/admin/tests/new", "/admin/review"]));
  });
});

describe("General Academic Studio convergence and security contract", () => {
  const editor = source("src/components/admin/general-academic-editor.tsx");
  const importer = source("src/components/admin/general-academic-import-studio.tsx");
  const actions = source("src/app/admin/general-academic/actions.ts");

  it("routes paste and upload through the same Phase 1 parser wrapper", () => {
    const transport = source("src/lib/general-academic/import-flow.ts");
    expect(transport.match(/parseGeneralAcademicPackJson\(/g)).toHaveLength(2);
    expect(importer).toContain("parsePastedGeneralAcademicJson");
    expect(importer).toContain("parseUploadedGeneralAcademicJson");
  });

  it("does not persist import input until the canonical editor saves", () => {
    expect(importer).not.toContain("createGeneralAcademicDraft");
    expect(importer).not.toContain("saveGeneralAcademicDraftAction");
    expect(editor).toContain("saveGeneralAcademicDraftAction(pack, packId)");
  });

  it("keeps fixed A/B/C/D option controls without add/delete options", () => {
    expect(editor).toContain("fixed A/B/C/D");
    expect(editor).toContain("question.options.map");
    expect(editor).not.toContain("Add option");
    expect(editor).not.toContain("Remove option");
  });

  it("rechecks authorization and canonical validation at the mutation boundary", () => {
    expect(actions).toContain('requireRole(["admin"])');
    expect(actions).toContain("canonicalGeneralAcademicPackSchema.safeParse");
    expect(actions).toContain("createGeneralAcademicDraft(parsed.data, user.id)");
    expect(actions).toContain("updateGeneralAcademicDraft(packId, parsed.data, user.id)");
  });

  it("does not expose credentials or introduce an AI SDK/API call", () => {
    const combined = [editor, importer, actions].join("\n");
    expect(combined).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(combined).not.toContain("OPENAI_API_KEY");
    expect(combined).not.toMatch(/from ["']openai["']/);
    expect(combined).not.toMatch(/fetch\([^)]*(?:openai|anthropic|gemini)/i);
  });

  it("contains no Phase 2 publish, approve, or destructive delete action", () => {
    expect(actions).not.toMatch(/export async function (?:publish|approve|delete|archive)/i);
    expect(editor).not.toContain(">Publish<");
    expect(editor).not.toContain("Approve & Publish");
  });

  it("provides labeled editors for every Phase 1 representation", () => {
    ["Formulas", "Tables", "Graphs", "Figures", "Linked questions", "Explanation", "Optional deterministic validation metadata"].forEach((label) => expect(editor).toContain(label));
  });

  it("drives domain, skill, difficulty, origin, graph, and answer-type controls from registries", () => {
    ["GENERAL_ACADEMIC_DOMAINS", "GENERAL_ACADEMIC_SKILLS", "GENERAL_ACADEMIC_DIFFICULTIES", "GENERAL_ACADEMIC_ORIGINS", "GENERAL_ACADEMIC_GRAPH_TYPES", "GENERAL_ACADEMIC_ANSWER_TYPES"].forEach((registry) => expect(editor).toContain(`${registry}.map`));
  });

  it("supports formula and variable add/remove operations", () => {
    expect(editor).toContain("Add formula");
    expect(editor).toContain("Add variable");
    expect(editor).toContain("Remove formula");
    expect(editor).toContain("Remove variable");
  });

  it("keeps table rows aligned when columns are added or removed", () => {
    expect(editor).toContain("rows: item.rows.map((row) => [...row, \"\"])");
    expect(editor).toContain("rows: item.rows.map((row) => row.filter");
    expect(editor).toContain("item.columns.map(() => \"\")");
  });

  it("supports graph series and finite-number input controls", () => {
    expect(editor).toContain("Add series");
    expect(editor).toContain("Point");
    expect(editor.match(/type=\"number\"/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it("prevents invalid figure JSON from silently saving stale data", () => {
    expect(editor).toContain("invalid_figure_json");
    expect(editor).toContain("Figure data must be valid JSON before validation or saving.");
  });

  it("supports explanation-step add, remove, and movement while keeping one step", () => {
    expect(editor).toContain("Add step");
    expect(editor).toContain("Move explanation step");
    expect(editor).toContain("question.explanation.steps.length <= 1");
  });

  it("switches validation metadata through the Phase 1 answer-type helper", () => {
    expect(editor).toContain("validationMetadataForType");
    expect(editor).toContain('answerType: "numeric"');
    expect(editor).toContain('answerType: "boolean"');
  });

  it("contains tablet stacking and local overflow safeguards", () => {
    const draftList = source("src/components/admin/general-academic-draft-list.tsx");
    expect(editor).toContain("md:grid-cols");
    expect(editor).toContain("overflow-x-auto");
    expect(draftList).toContain("overflow-x-auto");
  });

  it("uses labels, legends, named buttons, live regions, and focus styles", () => {
    expect(editor).toContain("<label");
    expect(editor).toContain("<legend");
    expect(editor).toContain("aria-label");
    expect(editor).toContain("aria-live");
    expect(editor).toContain("focus-visible:ring-2");
  });

  it("accepts only JSON uploads and describes the size limit", () => {
    expect(importer).toContain('accept=".json,application/json"');
    expect(importer).toContain("512 * 1024");
    expect(importer).toContain("Maximum 512 KB");
  });

  it("marks correct answers and explanations as admin-preview-only content", () => {
    const preview = source("src/components/admin/general-academic-preview.tsx");
    expect(preview).toContain("Admin preview");
    expect(preview).toContain("Admin answer:");
    expect(preview).toContain("Explanation");
  });
});

describe("General Academic Admin preview security", () => {
  it("renders imported text as escaped content and never active markup", () => {
    const pack = canonicalGeneralAcademicPackSchema.parse(JSON.parse(source("docs/general-academic/examples/general-academic-pack-v1.json")));
    const unsafePack = { ...pack, title: "<script>alert('x')</script>", stimulus: { ...pack.stimulus, text: "<img src=x onerror=alert(1)>" } };
    const html = renderToStaticMarkup(createElement(GeneralAcademicPreview, { pack: unsafePack }));
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
  });
});
