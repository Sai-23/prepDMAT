import { PageShell } from "@/components/layout/page-shell";

export default function PracticeLoading() {
  return (
    <PageShell
      eyebrow="Practice mode"
      title="Preparing your practice workspace"
      description="Loading module performance and checking for a resumable session."
    >
      <div className="h-[34rem] animate-pulse rounded-3xl border border-slate-200 bg-white" />
    </PageShell>
  );
}
