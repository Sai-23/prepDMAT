import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const migration = source("supabase/migrations/202609270037_student_feedback.sql");
const createOnceMigration = source("supabase/migrations/202609270039_student_feedback_create_once.sql");

describe("student feedback security contract", () => {
  it("enforces one row per user, rating/text constraints, and database-side feature eligibility", () => {
    expect(migration).toContain("user_id uuid not null unique");
    expect(migration).toContain("rating between 1 and 5");
    expect(migration.match(/char_length\([^)]*\) <= 200/g)).toHaveLength(3);
    expect(migration).toContain("student_feedback_feature_eligibility");
    expect(migration).toMatch(/not is_featured or \([\s\S]*status = 'approved'[\s\S]*public_consent[\s\S]*liked_most[\s\S]*testimonial_public/);
  });

  it("keeps anonymous users out and scopes student access through RLS", () => {
    expect(migration).toContain("alter table public.student_feedback enable row level security");
    expect(migration).toContain("revoke all on public.student_feedback from public, anon, authenticated");
    expect(migration).not.toMatch(/grant .*student_feedback to anon/i);
    expect(migration).toMatch(/student_feedback_select[\s\S]*auth\.uid\(\) = user_id/);
    expect(migration).toMatch(/student_feedback_insert[\s\S]*auth\.uid\(\) = user_id/);
  });

  it("removes student updates while preserving admin-only moderation", () => {
    expect(createOnceMigration).toContain("drop policy if exists student_feedback_update");
    expect(createOnceMigration).toMatch(/student_feedback_admin_update[\s\S]*for update[\s\S]*current_user_has_role\('admin'/);
    expect(createOnceMigration).toContain("student_feedback_update_not_allowed");
    expect(createOnceMigration).toContain("student_feedback_original_update_not_allowed");
    for (const field of ["new.rating", "new.liked_most", "new.improvements", "new.public_consent"]) {
      expect(createOnceMigration).toContain(field);
    }
  });

  it("keeps the student data path insert-only and race-safe", () => {
    const data = source("src/lib/feedback/data.ts");
    const createBlock = data.split("export async function createStudentFeedback")[1].split("export type AdminFeedbackItem")[0];
    expect(createBlock).toContain('.insert({ user_id: userId, ...values })');
    expect(createBlock).not.toContain(".update(");
    expect(createBlock).toContain('error?.code === "23505"');
  });

  it("caches only a safe public projection and expires it after every moderation action", () => {
    const data = source("src/lib/feedback/data.ts");
    const action = source("src/app/admin/feedback/actions.ts");
    const publicColumns = data.match(/const PUBLIC_FEEDBACK_COLUMNS = "([^"]+)"/)?.[1] ?? "";
    expect(publicColumns).not.toMatch(/improvements|liked_most|reviewed_by|reviewed_at/);
    expect(publicColumns).toMatch(/id, user_id, rating/);
    expect(data).toContain('tags: [TESTIMONIAL_CACHE_TAG]');
    expect(data).toContain('.eq("status", "approved")');
    expect(data).toContain('.eq("public_consent", true)');
    expect(data).toContain('.eq("is_featured", true)');
    expect(action).toContain("revalidateTag(TESTIMONIAL_CACHE_TAG, { expire: 0 })");
  });
});
