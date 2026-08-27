import { TestBuilder } from "@/components/admin/test-builder";
import { MockBuilderTabs } from "@/components/admin/mock-builder-tabs";
import { PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getAdminQuestionBank } from "@/lib/admin/test-data";
import { requireRole } from "@/lib/auth/guards";

export default async function TestBuilderPage() {
  const { roles } = await requireRole(["admin"]);
  let questionBank = null;
  let loadError: string | null = null;
  try {
    questionBank = await getAdminQuestionBank();
  } catch {
    loadError = "Unable to load the approved question bank.";
  }

  return (
    <PageShell
      eyebrow="Mock Builder"
      title="Build a structured timed mock"
      description="Filter approved questions, balance the composition, configure sections and timing, then save or publish the mock."
      admin
      roles={roles}
    >
      <div className="space-y-6">
      <MockBuilderTabs active="build" />
      {loadError || !questionBank ? (
        <ErrorState
          title="Mock Builder unavailable"
          description={loadError ?? "Unable to load the approved question bank."}
        />
      ) : questionBank.length === 0 ? (
        <EmptyState
          title="Publish questions before building a mock"
          description="Mock Builder only accepts approved, published, non-deleted questions."
        />
      ) : (
        <TestBuilder questionBank={questionBank} />
      )}
      </div>
    </PageShell>
  );
}
