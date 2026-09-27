import { PageShell } from "@/components/layout/page-shell";

export default function PracticeLoading() {
  return (
    <PageShell compact eyebrow="Practice" title="Loading Practice" description="Restoring your session and practice options.">
      <div className="grid gap-4 md:grid-cols-3" role="status" aria-label="Loading Practice">
        {[1, 2, 3].map((item) => <div className="h-36 animate-pulse rounded-lg border border-workspace-border bg-surface-lowest motion-reduce:animate-none" key={item} />)}
      </div>
      <div className="h-48 animate-pulse rounded-lg border border-workspace-border bg-surface-lowest motion-reduce:animate-none" />
    </PageShell>
  );
}
