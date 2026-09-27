import { PageShell } from "@/components/layout/page-shell";

export default function ResultsLoading() {
  return (
    <PageShell eyebrow="Results" title="Loading your results" description="Preparing scores, performance breakdowns, and question review.">
      <div className="h-56 animate-pulse rounded-lg border border-workspace-border bg-surface-lowest motion-reduce:animate-none" />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-lg border border-workspace-border bg-surface-lowest motion-reduce:animate-none" />
        <div className="h-72 animate-pulse rounded-lg border border-workspace-border bg-surface-lowest motion-reduce:animate-none" />
      </div>
    </PageShell>
  );
}
