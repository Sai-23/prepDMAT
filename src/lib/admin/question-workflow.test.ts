import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  generateValidatedFigureSequence,
  generateValidatedLatinSquare,
  generateValidatedMathematicalEquation,
} from "@/lib/generation";
import { canDeleteQuestions, evaluatePublication } from "./publishing-policy";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function exportedFunction(sourceText: string, name: string) {
  const start = sourceText.indexOf(`export async function ${name}`);
  if (start < 0) throw new Error(`Missing exported function ${name}`);
  const next = sourceText.indexOf("\nexport ", start + 1);
  return sourceText.slice(start, next < 0 ? undefined : next);
}

describe("generated-question preview and explicit publication", () => {
  it("accepts fully validated output from every Core generator", () => {
    const equation = generateValidatedMathematicalEquation({ seed: "workflow-equation", difficulty: "easy" });
    const latin = generateValidatedLatinSquare({ seed: "workflow-latin", difficulty: "easy" });
    const figure = generateValidatedFigureSequence({ seed: "workflow-figure", difficulty: "easy" });
    const candidates = [
      {
        questionType: equation.questionType,
        structuredData: { response: equation.response },
        metadata: { generation: equation.metadata, validation: equation.validation },
      },
      {
        questionType: latin.questionType,
        structuredData: { response: latin.response },
        metadata: { generation: latin.metadata, validation: latin.validation },
      },
      {
        questionType: figure.questionType,
        structuredData: { response: figure.response },
        metadata: { generation: figure.metadata, validation: figure.validation },
      },
    ];

    for (const candidate of candidates) {
      expect(evaluatePublication({
        verificationStatus: "approved",
        sourceType: "generated",
        optionCount: 0,
        correctOptionId: null,
        ...candidate,
      })).toEqual({ allowed: true });
    }
  });

  it("rejects a generated candidate when a deterministic check fails", () => {
    expect(evaluatePublication({
      verificationStatus: "approved",
      questionType: "mathematical_equation",
      sourceType: "generated",
      optionCount: 0,
      correctOptionId: null,
      structuredData: { response: { kind: "symbol_assignment" } },
      metadata: {
        generation: { seed: "seed", generatorVersion: "g", validatorVersion: "v", fingerprint: "fingerprint" },
        validation: { valid: false, checks: [{ passed: false }] },
      },
    }).allowed).toBe(false);
  });

  it("never persists or publishes from a Generate preview action", () => {
    const actions = source("src/app/admin/actions.ts");
    [
      "generateEquationPreviewAction",
      "generateLatinPreviewAction",
      "generateFigurePreviewAction",
    ].forEach((name) => {
      const action = exportedFunction(actions, name);
      expect(action).not.toContain("createPublishedGenerated");
      expect(action).not.toContain("published_at");
      expect(action).not.toContain("revalidateGeneratedQuestionPaths");
      expect(action).toContain("return { error: null, baseSeed, questions }");
    });
  });

  it("publishes only through separately authorized actions", () => {
    const actions = source("src/app/admin/actions.ts");
    [
      "publishGeneratedEquationAction",
      "publishGeneratedLatinAction",
      "publishGeneratedFigureAction",
    ].forEach((actionName) => {
      const action = exportedFunction(actions, actionName);
      expect(action).toContain('requireRole(["admin"])');
      expect(action).toContain("publishIndividualGeneratedQuestion");
    });
    expect(actions).toContain("async function publishOneGeneratedQuestion");
    expect(actions).toContain("reproduceValidatedMathematicalEquation");
    expect(actions).toContain("reproduceValidatedLatinSquare");
    expect(actions).toContain("reproduceValidatedFigureSequence");
    expect(actions).toContain("createPublishedGeneratedEquation");
    expect(actions).toContain("createPublishedGeneratedLatin");
    expect(actions).toContain("createPublishedGeneratedFigure");
    expect(actions).toContain("revalidateGeneratedQuestionPaths");
  });

  it("persists only an explicit publish with approved/published state and timestamp", () => {
    const data = source("src/lib/admin/data.ts");
    expect(data).toContain('export async function createPublishedGeneratedEquation');
    expect(data).toContain('export async function createPublishedGeneratedLatin');
    expect(data).toContain('export async function createPublishedGeneratedFigure');
    expect(data.match(/verification_status: "approved"/g)).toHaveLength(3);
    expect(data.match(/publication_status: "published"/g)?.length).toBeGreaterThanOrEqual(3);
    expect(data.match(/published_at: publishedAt/g)).toHaveLength(3);
    expect(data).not.toContain("createGeneratedEquationDraft");
  });

  it("renders preview-only controls without chaining Generate to Publish", () => {
    const component = source("src/components/admin/equation-generator.tsx");
    const generateHandler = component.slice(
      component.indexOf("function generate("),
      component.indexOf("function publish("),
    );
    expect(generateHandler).not.toContain("publishGenerated");
    expect(component).toContain("Generated questions");
    expect(component).toContain("Preview only");
    expect(component).toContain("Publish Question");
    expect(component).toContain("Generate Another");
    expect(component).toContain("Discard");
    expect(component).not.toContain("Generate & Publish");
    expect(component).not.toContain("Published automatically");
  });

  it("adds an authorized, validated, partial-success Publish All workflow", () => {
    const actions = source("src/app/admin/actions.ts");
    const action = exportedFunction(actions, "publishGeneratedQuestionsAction");
    const component = source("src/components/admin/equation-generator.tsx");
    expect(action).toContain('requireRole(["admin"])');
    expect(action).toContain("generatedQuestionPublishItemSchema.safeParse");
    expect(action).toContain("runGeneratedQuestionBatch");
    expect(actions).toContain("reproduceValidatedMathematicalEquation");
    expect(actions).toContain("reproduceValidatedLatinSquare");
    expect(actions).toContain("reproduceValidatedFigureSequence");
    expect(actions).toContain("assessGeneratedQuestionEnvelope");
    expect(component).toContain("Publish All (${readyQuestions.length})");
    expect(component).toContain("Publish Question");
    expect(component).toContain("batchRequestActive.current");
    expect(component).toContain("could not be published");
    expect(component).toContain("Retry Publish");
    expect(component).toContain("Current status");
    expect(component).toContain("Publish eligibility");
    expect(component).toContain("Failure reason");
    expect(component).toContain("Published");
  });

  it("keeps Discard separate from Delete and confirms batch discard", () => {
    const component = source("src/components/admin/equation-generator.tsx");
    expect(component).toContain("Discard All");
    expect(component).toContain("Discarded previews are removed from this page");
    expect(component).not.toContain("Delete All");
    expect(component).toContain("publishedIds[question.metadata.fingerprint]");
  });

  it("revalidates student and admin destinations after successful batch publication", () => {
    const actions = source("src/app/admin/actions.ts");
    ["/admin", "/admin/generate", "/admin/review", "/practice", "/tests"].forEach((path) => {
      expect(actions).toContain(`revalidatePath("${path}")`);
    });
  });

  it("keeps database defaults and triggers safe for unpublished records", () => {
    const schema = source("supabase/migrations/202608040002_question_schema.sql");
    expect(schema).toContain("verification_status public.verification_status not null default 'draft'");
    expect(schema).toContain("publication_status public.publication_status not null default 'draft'");
    expect(schema).toMatch(/published_at timestamptz[,\n]/);
    expect(schema).not.toMatch(/published_at timestamptz[^\n]*default/i);
    expect(schema).not.toMatch(/trigger[^\n]*publish/i);
  });

  it("requires published, approved, and non-deleted state in student eligibility queries", () => {
    ["src/lib/practice/data.ts", "src/lib/tests/data.ts"].forEach((path) => {
      const eligibility = source(path);
      expect(eligibility).toContain('.eq("verification_status", "approved")');
      expect(eligibility).toContain('.eq("publication_status", "published")');
      expect(eligibility).toContain('.is("deleted_at", null)');
    });
  });
});

describe("question soft deletion", () => {
  it("is server-authorized for admins and safe on repeated requests", () => {
    expect(canDeleteQuestions(["student"])).toBe(false);
    expect(canDeleteQuestions(["reviewer"])).toBe(false);
    expect(canDeleteQuestions(["admin"])).toBe(true);
    const actions = source("src/app/admin/actions.ts");
    const data = source("src/lib/admin/data.ts");
    expect(actions).toMatch(/deleteQuestionAction[\s\S]*requireRole\(\["admin"\]\)/);
    expect(data).toContain('if (question.deleted_at) return { status: "already_deleted" }');
    expect(data).toContain('return { status: "already_deleted" }');
  });

  it("excludes deleted questions from every active bank, Practice, and Mock query", () => {
    [
      "src/lib/admin/data.ts",
      "src/lib/admin/test-data.ts",
      "src/lib/practice/data.ts",
      "src/lib/learning/data.ts",
      "src/lib/tests/data.ts",
    ].forEach((path) => expect(source(path)).toContain('.is("deleted_at", null)'));
  });

  it("uses a confirmation dialog and preserves immutable attempt data", () => {
    const bank = source("src/components/admin/review-queue.tsx");
    const migration = source("supabase/migrations/202608100014_question_soft_delete.sql");
    expect(bank).toContain('title="Delete this question?"');
    expect(bank).toContain("Existing attempts remain available through their immutable snapshots.");
    expect(migration).toContain("add column if not exists deleted_at");
    expect(migration).toContain("drop policy if exists questions_delete");
    expect(migration.toLowerCase()).not.toContain("cascade");
  });
});
