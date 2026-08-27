import { TestManager } from "@/components/admin/test-manager";
import { MockBuilderTabs } from "@/components/admin/mock-builder-tabs";
import { PageShell } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/shared/error-state";
import { getAdminTests } from "@/lib/admin/test-data";
import { requireRole } from "@/lib/auth/guards";

export default async function AdminTestsPage() {
  const { roles } = await requireRole(["admin"]);
  let tests = null;
  let loadError: string | null = null;
  try {
    tests = await getAdminTests();
  } catch {
    loadError = "Unable to load created mocks.";
  }

  return (
    <PageShell
      eyebrow="Mock Builder"
      title="Created Mocks"
      description="Find, preview, edit, and publish previously created Core mocks."
      admin
      roles={roles}
    >
      <div className="space-y-6">
      <MockBuilderTabs active="created" />
      {loadError || !tests ? (
        <ErrorState
          title="Created Mocks unavailable"
          description={loadError ?? "Unable to load created mocks."}
        />
      ) : (
        <TestManager initialTests={tests} />
      )}
      </div>
    </PageShell>
  );
}
