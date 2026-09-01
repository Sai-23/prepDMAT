import { notFound } from "next/navigation";

import { TestBuilder } from "@/components/admin/test-builder";
import { MockBuilderTabs } from "@/components/admin/mock-builder-tabs";
import { PageShell } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/shared/error-state";
import {
  getAdminQuestionBank,
  getEditableAdminTest,
} from "@/lib/admin/test-data";
import { adminTestIdSchema } from "@/lib/admin/test-schemas";
import { requireRole } from "@/lib/auth/guards";

export default async function AdminTestEditPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { roles } = await requireRole(["admin"]);
  const parsed = adminTestIdSchema.safeParse((await params).testId);
  if (!parsed.success) notFound();

  let test = null;
  let questionBank = null;
  let loadError: string | null = null;
  try {
    [test, questionBank] = await Promise.all([
      getEditableAdminTest(parsed.data),
      getAdminQuestionBank(parsed.data),
    ]);
  } catch {
    loadError = "Unable to load this test.";
  }
  if (!loadError && !test) notFound();

  return (
    <PageShell
      eyebrow="Mock Builder"
      title={`Edit Mock${test ? `: ${test.title}` : ""}`}
      description="Revise the current mock template. Active and historical attempts continue using their immutable original snapshots."
      admin
      roles={roles}
    >
      <div className="space-y-6">
      <MockBuilderTabs active="build" />
      {loadError || !test || !questionBank ? (
        <ErrorState
          title="Mock cannot be edited"
          description={loadError ?? "Unable to load this mock."}
        />
      ) : (
        <TestBuilder initialTest={test} questionBank={questionBank} />
      )}
      </div>
    </PageShell>
  );
}
