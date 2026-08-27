"use client";

import { ErrorState } from "@/components/shared/error-state";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageShell
      eyebrow="Student dashboard"
      title="Your Core preparation hub"
      description="Resume active work, start practice, take Core mocks, and review progress and results."
    >
      <ErrorState title="Dashboard unavailable" description="Something interrupted the dashboard. Your saved practice and mock attempts have not been changed." />
      <div className="flex justify-center">
        <Button onClick={reset}>Try again</Button>
      </div>
    </PageShell>
  );
}
