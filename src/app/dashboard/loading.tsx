import { PageShell } from "@/components/layout/page-shell";

const quickActions = ["practice", "mock", "progress", "results"];
const modules = ["figures", "equations", "latin"];

export default function DashboardLoading() {
  return (
    <PageShell
      eyebrow="Student dashboard"
      title="Loading your Core preparation hub"
      description="Checking active work, recent activity, and Core progress."
    >
      <div className="h-48 animate-pulse rounded-lg border border-workspace-border bg-surface-lowest motion-reduce:animate-none" />
      <section aria-label="Loading quick actions" className="space-y-3">
        <div className="h-6 w-32 animate-pulse rounded bg-surface-high motion-reduce:animate-none" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((item) => <div className="h-36 animate-pulse rounded-lg border border-workspace-border bg-surface-lowest motion-reduce:animate-none" key={item} />)}
        </div>
      </section>
      <section aria-label="Loading Core progress" className="space-y-3">
        <div className="h-6 w-36 animate-pulse rounded bg-surface-high motion-reduce:animate-none" />
        <div className="grid gap-3 lg:grid-cols-3">
          {modules.map((item) => <div className="h-40 animate-pulse rounded-lg border border-workspace-border bg-surface-lowest motion-reduce:animate-none" key={item} />)}
        </div>
      </section>
      <div className="h-72 animate-pulse rounded-lg border border-workspace-border bg-surface-lowest motion-reduce:animate-none" />
    </PageShell>
  );
}
